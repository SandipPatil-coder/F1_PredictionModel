"""
FastAPI Backend for Formula 1 Podium Prediction.
Exposes health, metadata, model inspection, and prediction endpoints.
Strictly uses the real trained XGBoost model and historical dataset.
No fake, random, placeholder or dummy data.
"""

import os
from contextlib import asynccontextmanager
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
import joblib
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator
from sklearn.metrics import accuracy_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split

from .config import (
    MODEL_PATH,
    FEATURES_PATH,
    HISTORICAL_DATA_PATH,
    SEASONS_2025_2026_PATH,
    CURRENT_DRIVERS,
    PREDICTORS,
    PREDICTOR_GROUPS,
    CONSTRUCTOR_COLORS,
    DEFAULT_CONSTRUCTOR_COLOR,
    get_driver_code,
)
from .features import build_driver_feature_row

# Global loaded artifacts
APP_STATE: Dict[str, Any] = {
    "model": None,
    "features": None,
    "dataset": None,
    "seasons_subset": None,
    "model_info_cache": None,
    "load_error": None,
}


def load_backend_data_and_model():
    """Load model, features list, and datasets once at startup."""
    APP_STATE["load_error"] = None

    # 1. Check Model and Features
    if not MODEL_PATH.exists():
        APP_STATE["load_error"] = f"Model file not found at {MODEL_PATH}"
        return
    if not FEATURES_PATH.exists():
        APP_STATE["load_error"] = f"Features file not found at {FEATURES_PATH}"
        return

    try:
        model = joblib.load(MODEL_PATH)
        features = joblib.load(FEATURES_PATH)
        APP_STATE["model"] = model
        APP_STATE["features"] = features
    except Exception as e:
        APP_STATE["load_error"] = f"Failed to load model pickle: {str(e)}"
        return

    # 2. Check and Load Data
    if not HISTORICAL_DATA_PATH.exists():
        APP_STATE["load_error"] = f"Historical data file not found at {HISTORICAL_DATA_PATH}"
        return

    try:
        df = pd.read_csv(HISTORICAL_DATA_PATH)

        # Inspect if driver_age exists; if missing (Notebook execution order suspect b), recompute
        if "driver_age" not in df.columns:
            if "dob" in df.columns and "race_date" in df.columns:
                df["dob"] = pd.to_datetime(df["dob"], errors="coerce")
                df["race_date"] = pd.to_datetime(df["race_date"], errors="coerce")
                df["driver_age"] = (df["race_date"] - df["dob"]).dt.days / 365.25
                print("Computed missing driver_age using notebook formula.")

        # Ensure finish_position_numeric is numeric
        if "finish_position_numeric" in df.columns:
            df["finish_position_numeric"] = pd.to_numeric(df["finish_position_numeric"], errors="coerce")

        # Ensure race_date is datetime
        if "race_date" in df.columns:
            df["race_date"] = pd.to_datetime(df["race_date"], errors="coerce")

        APP_STATE["dataset"] = df
    except Exception as e:
        APP_STATE["load_error"] = f"Failed to load historical dataset: {str(e)}"
        return

    # 3. Seasons 2025/2026 subset
    if SEASONS_2025_2026_PATH.exists():
        try:
            APP_STATE["seasons_subset"] = pd.read_csv(SEASONS_2025_2026_PATH)
        except Exception:
            APP_STATE["seasons_subset"] = df[df["season"].isin([2025, 2026])]
    else:
        APP_STATE["seasons_subset"] = df[df["season"].isin([2025, 2026])]


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_backend_data_and_model()
    yield


app = FastAPI(
    title="Formula 1 Podium Predictor API",
    description="Production ML inference backend for Formula 1 podium prediction strictly derived from project notebook.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Pydantic Schemas ---

class GridDriverItem(BaseModel):
    driver_name: str
    qualifying_position: int
    q1_time: Optional[str] = None


class PredictRequest(BaseModel):
    circuit: str
    season: int
    round: int
    grid: List[GridDriverItem]

    @field_validator("grid")
    @classmethod
    def validate_grid(cls, grid: List[GridDriverItem]):
        if not grid:
            raise ValueError("Grid cannot be empty")
        # Validate uniqueness of qualifying positions
        positions = [item.qualifying_position for item in grid]
        if len(positions) != len(set(positions)):
            raise ValueError("All qualifying positions must be unique without duplicate values.")
        # Validate positions range 1 to len(grid)
        expected = set(range(1, len(grid) + 1))
        if set(positions) != expected:
            raise ValueError(f"Qualifying positions must be unique integers from 1 to {len(grid)}.")
        return grid


# --- Endpoints ---

@app.get("/api/health")
def get_health():
    """Health check endpoint reflecting actual data and model load status."""
    is_model_loaded = APP_STATE["model"] is not None
    is_data_loaded = APP_STATE["dataset"] is not None
    return {
        "status": "ok" if (is_model_loaded and is_data_loaded) else "degraded",
        "model_loaded": is_model_loaded,
        "data_loaded": is_data_loaded,
        "error": APP_STATE["load_error"],
    }


@app.get("/api/meta")
def get_metadata():
    """Returns circuits, drivers with derived constructors, seasons, and predictor groupings."""
    if APP_STATE["dataset"] is None:
        if APP_STATE["load_error"]:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=APP_STATE["load_error"]
            )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Dataset is not loaded."
        )

    df = APP_STATE["dataset"]
    seasons_subset = APP_STATE["seasons_subset"]

    # Circuits: sorted unique circuit_name from seasons_2025_2026 if available, else dataset
    source_circuits = seasons_subset if seasons_subset is not None and not seasons_subset.empty else df
    circuits = sorted(source_circuits["circuit_name"].dropna().unique().tolist())

    # Available seasons
    seasons = sorted([int(s) for s in df["season"].dropna().unique().tolist()], reverse=True)

    # Date range
    min_date = df["race_date"].dropna().min()
    max_date = df["race_date"].dropna().max()
    date_range = {
        "min_date": min_date.strftime("%Y-%m-%d") if pd.notna(min_date) else None,
        "max_date": max_date.strftime("%Y-%m-%d") if pd.notna(max_date) else None,
    }

    # Driver list with derived current constructors
    drivers_meta = []
    for driver in CURRENT_DRIVERS:
        driver_match = df[df["driver_name"].astype(str).str.lower() == driver.lower()]
        if not driver_match.empty:
            driver_sorted = driver_match.sort_values(["season", "round"], ascending=True)
            last_con = driver_sorted.iloc[-1].get("constructor_name", "Unknown")
        else:
            last_con = "Unknown"

        drivers_meta.append({
            "name": driver,
            "code": get_driver_code(driver),
            "constructor": last_con,
            "color": CONSTRUCTOR_COLORS.get(last_con, DEFAULT_CONSTRUCTOR_COLOR),
        })

    return {
        "circuits": circuits,
        "drivers": drivers_meta,
        "available_seasons": seasons,
        "predictors": PREDICTORS,
        "predictor_groups": PREDICTOR_GROUPS,
        "date_range": date_range,
    }


@app.post("/api/predict")
def predict_podium(req: PredictRequest):
    """
    Run XGBoost inference strictly on feature rows built from user grid and historical data.
    Returns ranked drivers with independent raw podium probability, predicted podium (top 3),
    and exact feature vectors used per driver.
    """
    if APP_STATE["model"] is None or APP_STATE["dataset"] is None:
        err = APP_STATE["load_error"] or "Model or historical data is missing. Prediction unavailable."
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=err
        )

    model = APP_STATE["model"]
    dataset = APP_STATE["dataset"]

    # Verify all 21 drivers are present in grid
    req_drivers = [item.driver_name for item in req.grid]
    missing_drivers = [d for d in CURRENT_DRIVERS if d not in req_drivers]
    if missing_drivers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Missing drivers in qualifying grid: {', '.join(missing_drivers)}"
        )

    # Build feature row for each driver
    feature_rows = []
    meta_list = []
    for item in req.grid:
        built = build_driver_feature_row(
            driver_name=item.driver_name,
            qualifying_position=item.qualifying_position,
            circuit_name=req.circuit,
            season=req.season,
            round_num=req.round,
            q1_time_input=item.q1_time,
            dataset=dataset,
        )
        feature_rows.append(built["features"])
        meta_list.append({**built["meta"], "qualifying_position": item.qualifying_position})

    # Create DataFrame with exact column order expected by model
    features_df = pd.DataFrame(feature_rows)[PREDICTORS].astype(float)

    # Verify model feature compatibility
    if hasattr(model, "feature_names_in_"):
        expected_cols = list(model.feature_names_in_)
        if list(features_df.columns) != expected_cols:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Feature order mismatch. Expected {expected_cols}, got {list(features_df.columns)}"
            )

    # Call model.predict_proba (XGBoost handles NaN natively)
    try:
        probs = model.predict_proba(features_df)[:, 1]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference failed in XGBoost: {str(e)}"
        )

    # Assemble ranked drivers (sorted descending by independent podium probability)
    results = []
    for i, meta in enumerate(meta_list):
        prob_pct = float(probs[i] * 100.0)
        # Convert feature values for JSON serialization (np.nan -> None)
        feat_dict = {
            k: (None if (v is None or (isinstance(v, float) and np.isnan(v))) else v)
            for k, v in feature_rows[i].items()
        }
        results.append({
            "driver_name": meta["driver_name"],
            "driver_code": meta["driver_code"],
            "constructor_name": meta["constructor_name"],
            "constructor_color": meta["constructor_color"],
            "qualifying_position": meta["qualifying_position"],
            "podium_probability": round(prob_pct, 2),
            "raw_probability": float(probs[i]),
            "race_date": meta["race_date"],
            "is_approx_date": meta["is_approx_date"],
            "features": feat_dict,
        })

    # Sort descending
    results.sort(key=lambda x: x["podium_probability"], reverse=True)

    # Assign ranks
    for rank, item in enumerate(results, start=1):
        item["rank"] = rank

    # Top 3 are the predicted podium
    predicted_podium = results[:3]

    return {
        "circuit": req.circuit,
        "season": req.season,
        "round": req.round,
        "predicted_podium": predicted_podium,
        "leaderboard": results,
    }


@app.get("/api/model-info")
def get_model_info():
    """
    Returns live-computed model information, hyperparameters, feature importances,
    and evaluation metrics recomputed on the exact notebook train/test split.
    Cached after initial calculation.
    """
    if APP_STATE["model_info_cache"] is not None:
        return APP_STATE["model_info_cache"]

    if APP_STATE["model"] is None or APP_STATE["dataset"] is None:
        err = APP_STATE["load_error"] or "Model or historical data is missing."
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=err
        )

    model = APP_STATE["model"]
    df = APP_STATE["dataset"]

    # 1. Hyperparameters
    params = model.get_params() if hasattr(model, "get_params") else {}
    interesting_params = {
        "n_estimators": params.get("n_estimators", 200),
        "max_depth": params.get("max_depth", 4),
        "learning_rate": params.get("learning_rate", 0.05),
        "eval_metric": str(params.get("eval_metric", "logloss")),
        "random_state": params.get("random_state", 42),
    }

    # 2. Feature Importances
    importances = {}
    if hasattr(model, "feature_importances_"):
        raw_importances = model.feature_importances_
        feature_names = getattr(model, "feature_names_in_", PREDICTORS)
        for name, imp in zip(feature_names, raw_importances):
            importances[name] = round(float(imp), 4)

    # Sort importances descending
    sorted_importances = dict(sorted(importances.items(), key=lambda x: x[1], reverse=True))

    # 3. Live Evaluation Metrics
    # Replicate Notebook Cell 117 split:
    # X = df[predictors], y = df['podium'], train_test_split(test_size=0.2, random_state=42, stratify=y)
    metrics: Dict[str, Any] = {}
    date_range = {}
    try:
        # Check if all predictors and podium are in df
        available_predictors = [p for p in PREDICTORS if p in df.columns]
        if len(available_predictors) == len(PREDICTORS) and "podium" in df.columns:
            eval_df = df.dropna(subset=["podium"]).copy()
            X = eval_df[PREDICTORS]
            y = eval_df["podium"].astype(int)

            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=y
            )

            y_pred = model.predict(X_test)
            y_pred_proba = model.predict_proba(X_test)[:, 1]

            acc = float(accuracy_score(y_test, y_pred))
            prec = float(precision_score(y_test, y_pred, zero_division=0))
            rec = float(recall_score(y_test, y_pred, zero_division=0))
            auc = float(roc_auc_score(y_test, y_pred_proba))
            class_share = float(y.mean() * 100.0)

            metrics = {
                "accuracy": round(acc * 100.0, 2),
                "precision": round(prec * 100.0, 2),
                "recall": round(rec * 100.0, 2),
                "roc_auc": round(auc, 4),
                "podium_class_share": round(class_share, 2),
                "test_samples": int(len(y_test)),
                "train_samples": int(len(y_train)),
            }
        else:
            metrics = {
                "note": "Evaluation metrics require full training predictors and podium column in dataset."
            }

        min_d = df["race_date"].dropna().min()
        max_d = df["race_date"].dropna().max()
        date_range = {
            "min_date": min_d.strftime("%Y-%m-%d") if pd.notna(min_d) else None,
            "max_date": max_d.strftime("%Y-%m-%d") if pd.notna(max_d) else None,
        }
    except Exception as e:
        metrics = {"error": f"Failed to compute test metrics: {str(e)}"}

    info_payload = {
        "model_type": type(model).__name__,
        "hyperparameters": interesting_params,
        "predictors": PREDICTORS,
        "predictor_groups": PREDICTOR_GROUPS,
        "feature_importances": sorted_importances,
        "metrics": metrics,
        "date_range": date_range,
    }

    APP_STATE["model_info_cache"] = info_payload
    return info_payload


# Production: Serve built React frontend if dist exists
FRONTEND_DIST = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")
if os.path.exists(FRONTEND_DIST):
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
