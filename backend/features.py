"""
Feature Engineering Module for Formula 1 Podium Prediction.

This module replicates the exact feature engineering formulas developed in the
project notebook (Another_copy_of__DEVLProject.ipynb) with strict data leakage
prevention (no lookahead beyond the evaluated race).

Notebook References:
- Grid and Qualifying features: Cell 70, Cell 123
- Driver rolling form (previous finish, avg 3/5, podium rate 3/5): Cell 56, Cell 58, Cell 60
- Driver circuit history (race count, avg finish, podium rate): Cell 56, Cell 64
- Driver season-to-date (race count, avg finish): Cell 66
- Constructor rolling performance: Cell 62
- Driver age: Cell 74
- Q1 qualifying time parsing and outlier handling: Cell 74
- Feature list & ordering: Cell 113 (f1_features.pkl)
"""

import math
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
import pandas as pd

from .config import PREDICTORS, get_driver_code, CONSTRUCTOR_COLORS, DEFAULT_CONSTRUCTOR_COLOR


def parse_q1_time(q1_input: Optional[Any]) -> float:
    """
    Parse Q1 qualifying time from string (e.g., '1:28.456') or numeric seconds.
    Replicates Cell 74: pd.to_timedelta('00:' + str).dt.total_seconds().
    Values > 300 seconds are treated as outliers and mapped to np.nan.
    """
    if q1_input is None or (isinstance(q1_input, float) and np.isnan(q1_input)):
        return np.nan

    str_val = str(q1_input).strip()
    if not str_val or str_val.lower() in ("nan", "none", "", "null"):
        return np.nan

    try:
        # Check if already in seconds float
        if ":" not in str_val:
            sec = float(str_val)
        else:
            # Format M:SS.mmm or MM:SS.mmm
            parts = str_val.split(":")
            if len(parts) == 2:
                minutes = float(parts[0])
                seconds = float(parts[1])
                sec = minutes * 60.0 + seconds
            elif len(parts) == 3:
                hours = float(parts[0])
                minutes = float(parts[1])
                seconds = float(parts[2])
                sec = hours * 3600.0 + minutes * 60.0 + seconds
            else:
                return np.nan

        # Outlier check matching notebook Cell 74: q1_time > 300 is replaced with NaN
        if sec > 300.0 or sec <= 0.0:
            return np.nan
        return float(sec)
    except Exception:
        return np.nan


def get_race_date_for_round(
    season: int,
    round_num: int,
    historical_df: pd.DataFrame
) -> Tuple[pd.Timestamp, bool]:
    """
    Determine race date. If the exact season and round exist in the dataset,
    use the recorded race_date. Otherwise, compute a documented approximation
    (season opening in mid-March + 2 weeks per subsequent round).
    Returns (Timestamp, is_approximated).
    """
    if "season" in historical_df.columns and "round" in historical_df.columns and "race_date" in historical_df.columns:
        match = historical_df[
            (historical_df["season"] == season) & (historical_df["round"] == round_num)
        ]
        if not match.empty:
            dt = pd.to_datetime(match["race_date"].iloc[0])
            if not pd.isna(dt):
                return dt, False

    # Documented approximation for future/unrecorded rounds
    # Typical F1 calendar starts around mid-March (e.g., March 15) and spaces races by 2 weeks
    approx_date = pd.Timestamp(f"{season}-03-15") + pd.Timedelta(weeks=max(0, round_num - 1) * 2)
    return approx_date, True


def build_driver_feature_row(
    driver_name: str,
    qualifying_position: int,
    circuit_name: str,
    season: int,
    round_num: int,
    q1_time_input: Optional[Any],
    dataset: pd.DataFrame,
) -> Dict[str, Any]:
    """
    Build a single driver's complete 21-feature row.
    History is strictly filtered to races occurring prior to the current (season, round).
    If the selected race is later than the last race in the data, all available history is used.
    Missing historical values remain np.nan (no imputation).
    """
    row: Dict[str, Any] = {}

    # 1. Grid & Qualifying (Cell 70, Cell 123)
    qual_pos = float(qualifying_position)
    grid_pos = qual_pos  # As in notebook Cell 123, grid_position = qualifying_position
    grid_penalty = 0.0   # grid_position - qualifying_position = 0

    row["qualifying_position"] = qual_pos
    row["grid_position"] = grid_pos
    row["grid_penalty"] = grid_penalty
    row["season"] = float(season)
    row["round"] = float(round_num)
    row["q1_time"] = parse_q1_time(q1_time_input)

    # 2. Circuit Lookup (lat, long, alt, circuitId)
    circuit_match = dataset[dataset["circuit_name"].astype(str).str.lower() == circuit_name.lower()]
    if circuit_match.empty:
        circuit_id = None
        row["circuit_latitude"] = np.nan
        row["circuit_longitude"] = np.nan
        row["circuit_altitude"] = np.nan
    else:
        first_c = circuit_match.iloc[0]
        circuit_id = first_c.get("circuitId", None)
        row["circuit_latitude"] = float(first_c["circuit_latitude"]) if pd.notna(first_c.get("circuit_latitude")) else np.nan
        row["circuit_longitude"] = float(first_c["circuit_longitude"]) if pd.notna(first_c.get("circuit_longitude")) else np.nan
        row["circuit_altitude"] = float(first_c["circuit_altitude"]) if pd.notna(first_c.get("circuit_altitude")) else np.nan

    # 3. Driver Lookup (driverId, dob, constructor)
    driver_match = dataset[dataset["driver_name"].astype(str).str.lower() == driver_name.lower()]
    if driver_match.empty:
        driver_id = None
        dob = None
        current_constructor = "Unknown"
        constructor_id = None
    else:
        # Sort chronologically to find latest constructor and driver details
        driver_match_sorted = driver_match.sort_values(["season", "round"], ascending=True)
        latest_row = driver_match_sorted.iloc[-1]
        driver_id = latest_row.get("driverId", None)
        dob = latest_row.get("dob", None)
        current_constructor = latest_row.get("constructor_name", "Unknown")
        constructor_id = latest_row.get("constructorId", None)

    # 4. Driver Age (Cell 74): (race_date - dob).dt.days / 365.25
    race_date, is_approx_date = get_race_date_for_round(season, round_num, dataset)
    if dob is not None and pd.notna(dob):
        dob_dt = pd.to_datetime(dob)
        row["driver_age"] = float((race_date - dob_dt).days / 365.25)
    else:
        row["driver_age"] = np.nan

    # 5. Filter History Strictly Prior to (season, round_num) to mirror shift(1)
    # Check if (season, round_num) is beyond all dataset races:
    has_prior = dataset[
        (dataset["season"] < season) |
        ((dataset["season"] == season) & (dataset["round"] < round_num))
    ]
    if has_prior.empty and not dataset.empty:
        # If user picked a race that is earlier than everything, history is empty.
        # But if user picked a race beyond dataset, has_prior holds all historical rows.
        hist_df = dataset.copy()
    else:
        hist_df = has_prior

    # Ensure chronologically sorted
    hist_df = hist_df.sort_values(["season", "round", "race_date", "raceId"], ascending=True)

    # 6. Driver Historical Performance (Cell 56, Cell 58, Cell 60)
    if driver_id is not None:
        driver_history = hist_df[hist_df["driverId"] == driver_id]
        if not driver_history.empty:
            # Previous finish
            finishes = driver_history["finish_position_numeric"].dropna().tolist()
            if finishes:
                row["driver_previous_finish"] = float(finishes[-1])
                # Recent 3 and 5 rolling finish
                row["driver_avg_finish_3"] = float(np.mean(finishes[-3:]))
                row["driver_avg_finish_5"] = float(np.mean(finishes[-5:]))
                # Recent 3 and 5 rolling podium rate
                last3_podiums = [1.0 if f <= 3 else 0.0 for f in finishes[-3:]]
                last5_podiums = [1.0 if f <= 3 else 0.0 for f in finishes[-5:]]
                row["driver_podium_rate_3"] = float(np.mean(last3_podiums))
                row["driver_podium_rate_5"] = float(np.mean(last5_podiums))
            else:
                row["driver_previous_finish"] = np.nan
                row["driver_avg_finish_3"] = np.nan
                row["driver_avg_finish_5"] = np.nan
                row["driver_podium_rate_3"] = np.nan
                row["driver_podium_rate_5"] = np.nan

            # Circuit History (Cell 56, Cell 64)
            if circuit_id is not None:
                driver_circuit_history = driver_history[driver_history["circuitId"] == circuit_id]
                circuit_finishes = driver_circuit_history["finish_position_numeric"].dropna().tolist()
                row["driver_circuit_race_count"] = float(len(driver_circuit_history))
                if circuit_finishes:
                    row["driver_circuit_avg_finish"] = float(np.mean(circuit_finishes))
                    circuit_podiums = [1.0 if f <= 3 else 0.0 for f in circuit_finishes]
                    row["driver_circuit_podium_rate"] = float(np.mean(circuit_podiums))
                else:
                    row["driver_circuit_avg_finish"] = np.nan
                    row["driver_circuit_podium_rate"] = np.nan
            else:
                row["driver_circuit_race_count"] = 0.0
                row["driver_circuit_avg_finish"] = np.nan
                row["driver_circuit_podium_rate"] = np.nan

            # Season-to-Date History (Cell 66)
            driver_season_history = driver_history[driver_history["season"] == season]
            season_finishes = driver_season_history["finish_position_numeric"].dropna().tolist()
            row["driver_season_race_count"] = float(len(driver_season_history))
            if season_finishes:
                row["driver_season_avg_finish"] = float(np.mean(season_finishes))
            else:
                row["driver_season_avg_finish"] = np.nan

        else:
            # Rookie / No history prior to this race
            row["driver_previous_finish"] = np.nan
            row["driver_avg_finish_3"] = np.nan
            row["driver_avg_finish_5"] = np.nan
            row["driver_podium_rate_3"] = np.nan
            row["driver_podium_rate_5"] = np.nan
            row["driver_circuit_race_count"] = 0.0
            row["driver_circuit_avg_finish"] = np.nan
            row["driver_circuit_podium_rate"] = np.nan
            row["driver_season_race_count"] = 0.0
            row["driver_season_avg_finish"] = np.nan
    else:
        row["driver_previous_finish"] = np.nan
        row["driver_avg_finish_3"] = np.nan
        row["driver_avg_finish_5"] = np.nan
        row["driver_podium_rate_3"] = np.nan
        row["driver_podium_rate_5"] = np.nan
        row["driver_circuit_race_count"] = 0.0
        row["driver_circuit_avg_finish"] = np.nan
        row["driver_circuit_podium_rate"] = np.nan
        row["driver_season_race_count"] = 0.0
        row["driver_season_avg_finish"] = np.nan

    # 7. Constructor Historical Performance (Cell 62)
    # Mean of race-level average finish positions over previous 3 and 5 races
    if constructor_id is not None:
        con_hist = hist_df[hist_df["constructorId"] == constructor_id]
        if not con_hist.empty:
            # Group by race (raceId or season+round) to get constructor_race_avg_finish
            race_keys = ["season", "round", "raceId"] if "raceId" in con_hist.columns else ["season", "round"]
            con_race_means = (
                con_hist.groupby(race_keys, sort=False)["finish_position_numeric"]
                .mean()
                .dropna()
                .tolist()
            )
            if con_race_means:
                row["constructor_avg_finish_3"] = float(np.mean(con_race_means[-3:]))
                row["constructor_avg_finish_5"] = float(np.mean(con_race_means[-5:]))
            else:
                row["constructor_avg_finish_3"] = np.nan
                row["constructor_avg_finish_5"] = np.nan
        else:
            row["constructor_avg_finish_3"] = np.nan
            row["constructor_avg_finish_5"] = np.nan
    else:
        row["constructor_avg_finish_3"] = np.nan
        row["constructor_avg_finish_5"] = np.nan

    # Order the dictionary strictly in the order of PREDICTORS
    ordered_row = {col: row[col] for col in PREDICTORS}

    # Metadata for UI
    meta = {
        "driver_name": driver_name,
        "driver_code": get_driver_code(driver_name),
        "constructor_name": current_constructor,
        "constructor_color": CONSTRUCTOR_COLORS.get(current_constructor, DEFAULT_CONSTRUCTOR_COLOR),
        "race_date": race_date.strftime("%Y-%m-%d"),
        "is_approx_date": is_approx_date,
    }

    return {"features": ordered_row, "meta": meta}
