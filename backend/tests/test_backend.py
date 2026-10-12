"""
Pytest suite for Formula 1 Podium Predictor backend.
Validates:
1. Complete predictor names and exact ordering match config & notebook.
2. Historical feature leakage prevention (no lookahead data used).
3. End-to-end inference accuracy and consistency.
"""

import pytest
import numpy as np
import pandas as pd
from unittest.mock import MagicMock

from backend.config import PREDICTORS, CURRENT_DRIVERS, get_driver_code
from backend.features import build_driver_feature_row, parse_q1_time


def test_driver_codes_and_driver_count():
    """Verify 21 current drivers and proper 3-letter uppercase code generation."""
    assert len(CURRENT_DRIVERS) == 21
    assert get_driver_code("Max Verstappen") == "VER"
    assert get_driver_code("Lando Norris") == "NOR"
    assert get_driver_code("Charles Leclerc") == "LEC"
    assert get_driver_code("Lewis Hamilton") == "HAM"
    assert get_driver_code("Kimi Antonelli") == "ANT"
    assert get_driver_code("Gabriel Bortoleto") == "BOR"


def test_predictor_completeness_and_order():
    """Ensure exactly 21 predictors exist in the expected order."""
    expected = [
        "driver_podium_rate_5",
        "driver_podium_rate_3",
        "driver_circuit_podium_rate",
        "driver_previous_finish",
        "driver_avg_finish_3",
        "driver_avg_finish_5",
        "driver_season_avg_finish",
        "driver_age",
        "driver_season_race_count",
        "driver_circuit_race_count",
        "constructor_avg_finish_3",
        "constructor_avg_finish_5",
        "grid_position",
        "qualifying_position",
        "grid_penalty",
        "circuit_altitude",
        "circuit_latitude",
        "circuit_longitude",
        "round",
        "season",
        "q1_time"
    ]
    assert len(PREDICTORS) == 21
    assert PREDICTORS == expected


def test_parse_q1_time():
    """Test parsing of Q1 time strings to seconds and outlier handling (> 300s)."""
    assert parse_q1_time("1:28.456") == pytest.approx(88.456, 1e-3)
    assert parse_q1_time("0:54.120") == pytest.approx(54.120, 1e-3)
    assert np.isnan(parse_q1_time(None))
    assert np.isnan(parse_q1_time(""))
    assert np.isnan(parse_q1_time("NaN"))
    # Outliers > 300 seconds mapped to NaN as in Cell 74
    assert np.isnan(parse_q1_time("350.0"))
    assert np.isnan(parse_q1_time("6:00.000"))


def test_no_data_leakage():
    """
    Leakage Test: Confirm that feature building for a race at (season=2024, round=5)
    never uses data from (season=2024, round=5) or any later race.
    """
    # Create synthetic dataset with races from round 1 to 10
    records = []
    for r in range(1, 11):
        records.append({
            "raceId": r,
            "season": 2024,
            "round": r,
            "circuitId": 1,
            "circuit_name": "Silverstone Circuit",
            "circuit_latitude": 52.0786,
            "circuit_longitude": -1.0169,
            "circuit_altitude": 153.0,
            "driverId": 1,
            "driver_name": "Max Verstappen",
            "constructorId": 1,
            "constructor_name": "Red Bull",
            "dob": "1997-09-30",
            "race_date": f"2024-0{r}-15" if r < 10 else "2024-10-15",
            # Put 1st finish for rounds 1-4, but 20th finish for round 5 and later
            "finish_position_numeric": 1.0 if r < 5 else 20.0,
        })
    df = pd.DataFrame(records)

    # Build features for round 5
    result = build_driver_feature_row(
        driver_name="Max Verstappen",
        qualifying_position=1,
        circuit_name="Silverstone Circuit",
        season=2024,
        round_num=5,
        q1_time_input="1:26.500",
        dataset=df
    )
    features = result["features"]

    # Since rounds 1-4 were all P1 finishes, driver_previous_finish must be 1.0, NOT 20.0
    assert features["driver_previous_finish"] == 1.0
    assert features["driver_avg_finish_3"] == 1.0
    assert features["driver_podium_rate_3"] == 1.0
    assert features["driver_season_race_count"] == 4.0
    assert features["driver_season_avg_finish"] == 1.0
    assert features["qualifying_position"] == 1.0
    assert features["grid_penalty"] == 0.0


def test_rookie_or_missing_history_produces_nan():
    """Ensure missing history passes NaN without default zero or imputation."""
    empty_df = pd.DataFrame(columns=[
        "raceId", "season", "round", "circuitId", "circuit_name",
        "circuit_latitude", "circuit_longitude", "circuit_altitude",
        "driverId", "driver_name", "constructorId", "constructor_name",
        "dob", "race_date", "finish_position_numeric"
    ])

    result = build_driver_feature_row(
        driver_name="Kimi Antonelli",
        qualifying_position=5,
        circuit_name="Unknown Circuit",
        season=2026,
        round_num=1,
        q1_time_input=None,
        dataset=empty_df
    )
    features = result["features"]

    assert np.isnan(features["driver_previous_finish"])
    assert np.isnan(features["driver_avg_finish_3"])
    assert np.isnan(features["driver_podium_rate_5"])
    assert np.isnan(features["constructor_avg_finish_3"])
    assert np.isnan(features["q1_time"])


def test_live_api_predict_and_parity():
    """
    End-to-end parity test: runs the FastAPI prediction endpoint,
    verifies all 21 drivers are ranked, and verifies that the model's
    predict_proba call directly on the feature row matches within 1e-6.
    """
    import joblib
    from fastapi.testclient import TestClient
    from backend.main import app, load_backend_data_and_model
    from backend.config import MODEL_PATH

    load_backend_data_and_model()
    client = TestClient(app)

    grid = [{"driver_name": d, "qualifying_position": i + 1} for i, d in enumerate(CURRENT_DRIVERS)]
    payload = {
        "circuit": "Albert Park Grand Prix Circuit",
        "season": 2026,
        "round": 1,
        "grid": grid
    }

    response = client.post("/api/predict", json=payload)
    assert response.status_code == 200, f"Predict failed: {response.text}"

    data = response.json()
    assert len(data["leaderboard"]) == 21
    assert len(data["predicted_podium"]) == 3
    assert data["predicted_podium"][0]["rank"] == 1

    # Verify probability parity with direct model call
    model = joblib.load(MODEL_PATH)
    first_driver = data["leaderboard"][0]
    first_features = [first_driver["features"][col] for col in PREDICTORS]
    
    # Hand-built row passed to model.predict_proba
    direct_prob = model.predict_proba(pd.DataFrame([first_driver["features"]])[PREDICTORS].astype(float))[0, 1]
    assert first_driver["raw_probability"] == pytest.approx(direct_prob, abs=1e-6)

