# Step 0: Notebook Audit Report & Implementation Plan

**Source Notebook:** [`reference/Another_copy_of__DEVLProject.ipynb`](file:///c:/Users/Tsksa/OneDrive/Desktop/DEVL11/reference/Another_copy_of__DEVLProject.ipynb)

---

## 1. Model Target & Exact 21 Predictors (In Order)

### Target Definition
- **Target variable:** `podium` (binary classification: `0` or `1`).
- **Condition:** `1` if `finish_position_numeric <= 3` (finished on the podium: P1, P2, or P3), otherwise `0` (finished P4 or lower).
- **Notebook References:** Defined in Cell 14 (`master["podium"]`), re-created in Cell 68 and Cell 70 (`model_df["podium"]`), and Cell 74 (`final_df["podium"]`).

### The Exact 21 Predictors (Order Matching Cell 113 & `f1_features.pkl`)
1. `driver_podium_rate_5`
2. `driver_podium_rate_3`
3. `driver_circuit_podium_rate`
4. `driver_previous_finish`
5. `driver_avg_finish_3`
6. `driver_avg_finish_5`
7. `driver_season_avg_finish`
8. `driver_age`
9. `driver_season_race_count`
10. `driver_circuit_race_count`
11. `constructor_avg_finish_3`
12. `constructor_avg_finish_5`
13. `grid_position`
14. `qualifying_position`
15. `grid_penalty`
16. `circuit_altitude`
17. `circuit_latitude`
18. `circuit_longitude`
19. `round`
20. `season`
21. `q1_time`

---

## 2. Feature Engineering Logic in the Notebook

Every predictor is constructed strictly to avoid lookahead/data leakage by using only records occurring strictly prior to the evaluated race:

| Predictor | Engineering Formula & Logic | Notebook Cell |
| :--- | :--- | :--- |
| `driver_podium_rate_5` | Historical top-3 finish rate over the driver's previous 5 races:<br>`groupby("driverId")["previous_podium"].transform(lambda x: x.shift(1).rolling(5, min_periods=1).mean())` | Cell 60 |
| `driver_podium_rate_3` | Historical top-3 finish rate over the driver's previous 3 races:<br>`groupby("driverId")["previous_podium"].transform(lambda x: x.shift(1).rolling(3, min_periods=1).mean())` | Cell 60 |
| `driver_circuit_podium_rate` | Expanding historical podium rate at this specific circuit:<br>`groupby(["driverId", "circuitId"])["podium"].transform(lambda x: x.shift(1).expanding(min_periods=1).mean())` | Cell 56 |
| `driver_previous_finish` | Finishing position in immediately preceding race:<br>`groupby("driverId")["finish_position_numeric"].shift(1)` | Cell 56 |
| `driver_avg_finish_3` | Driver rolling average finish over previous 3 races:<br>`groupby("driverId")["finish_position_numeric"].transform(lambda x: x.shift(1).rolling(3, min_periods=1).mean())` | Cell 58 |
| `driver_avg_finish_5` | Driver rolling average finish over previous 5 races:<br>`groupby("driverId")["finish_position_numeric"].transform(lambda x: x.shift(1).rolling(5, min_periods=1).mean())` | Cell 58 |
| `driver_season_avg_finish` | Expanding average finish in earlier races of the *same season*:<br>`groupby(["season", "driverId"])["finish_position_numeric"].transform(lambda x: x.shift(1).expanding(min_periods=1).mean())` | Cell 66 |
| `driver_age` | Driver age at race date:<br>`(race_date - dob).dt.days / 365.25` | Cell 74 |
| `driver_season_race_count` | Number of previous races for this driver in the current season:<br>`groupby(["season", "driverId"]).cumcount()` | Cell 66 |
| `driver_circuit_race_count` | Number of previous races for this driver at this circuit:<br>`groupby(["driverId", "circuitId"]).cumcount()` | Cell 56, Cell 64 |
| `constructor_avg_finish_3` | Race-level team average finish: `groupby(["constructorId", "raceId"])["finish_position_numeric"].mean()`, then previous 3-race rolling mean:<br>`groupby("constructorId")["constructor_race_avg_finish"].transform(lambda x: x.shift(1).rolling(3, min_periods=1).mean())` | Cell 62 |
| `constructor_avg_finish_5` | Same constructor aggregation over previous 5 races:<br>`groupby("constructorId")["constructor_race_avg_finish"].transform(lambda x: x.shift(1).rolling(5, min_periods=1).mean())` | Cell 62 |
| `grid_position` | Numeric starting position on grid (`errors="coerce"`). In user prediction, `grid_position = qualifying_position`. | Cell 70, Cell 123 |
| `qualifying_position` | Numeric qualifying position (1 to N, unique per driver). | Cell 70, Cell 123 |
| `grid_penalty` | Difference between starting grid and qualifying rank:<br>`grid_position - qualifying_position` (evaluates to `0` when equal). | Cell 70 |
| `circuit_altitude` | Circuit altitude in meters from circuit dataset. | Cell 13, Cell 70 |
| `circuit_latitude` | Circuit latitude in degrees from circuit dataset. | Cell 13, Cell 70 |
| `circuit_longitude` | Circuit longitude in degrees from circuit dataset. | Cell 13, Cell 70 |
| `round` | Championship round number (user input integer). | Cell 70, Cell 123 |
| `season` | Championship season year (user input integer). | Cell 70, Cell 123 |
| `q1_time` | Q1 qualifying time in seconds: `pd.to_timedelta("00:" + q1).dt.total_seconds()`. Outliers > 300s set to `NaN`. Optional user input (converted or `NaN`). | Cell 74 |

*Note: Rookies or drivers/constructors with no prior history at a track or season will have `NaN`. XGBoost natively handles `NaN` values without artificial imputation.*

---

## 3. Discrepancy Findings & Handling

### Discrepancy (a): Final Inference Cell (Cell 123) supplies only 4 features
- **Observation:** In Cell 123, the notebook creates `prediction_df` containing only `qualifying_position`, `grid_position`, `season`, `round`. It then checks `hasattr(model, "feature_names_in_")`, sees the model requires 21 predictors, and prints:
  `"Cannot predict. Missing model features: [...]"`.
- **Handling:** We implement the complete feature-building pipeline in `backend/features.py`. For each driver, given `{circuit_name, season, round, qualifying_position, q1_time}`, it computes all 21 predictors strictly using historical races prior to `(season, round)`.

### Discrepancy (b): `driver_age` execution order in Cell 74
- **Observation:** In Cell 74, `final_df = model_df.copy()` is executed at the beginning before `driver_age` is calculated. `model_df["driver_age"] = (model_df["race_date"] - model_df["dob"]).dt.days / 365.25` assigns `driver_age` to `model_df`, but `final_df.to_csv("f1_final_cleaned_dataset50.csv")` was saved from `final_df`.
- **Handling:** Once `f1_final_cleaned_dataset50.csv` is placed in `backend/data/`, our backend loader will verify if `driver_age` exists. If missing, it will recompute `driver_age` using the exact formula `(race_date - dob).dt.days / 365.25` and report this in the startup logs.

### Discrepancy (c): `driver_circuit_podium_rate` depends on dropped `podium` column
- **Observation:** In Cell 48, `"podium"` is included in `columns_to_drop` and removed from `model_df`. Later in Cell 56, `driver_circuit_podium_rate` transforms `model_df.groupby(["driverId", "circuitId"])["podium"]`. In a clean linear notebook run, this would trigger a `KeyError`. In Colab it succeeded due to out-of-order execution (e.g. running Cell 14 or Cell 68/70 where `podium = (finish_position_numeric <= 3).astype(int)`).
- **Handling:** In our backend feature engine, historical podium outcomes are always derived from `(finish_position_numeric <= 3).astype(int)` on prior races, ensuring correct computation without depending on a dropped column.

### Discrepancy (d): Race Date for Future/Unknown Rounds
- **Observation:** When predicting a hypothetical or upcoming round not in the dataset, `race_date` is needed to compute `driver_age`.
- **Handling:** If `(season, round)` exists in the dataset, its actual `race_date` is used. If not, we approximate it based on the season year and round index (e.g., season start ~March + round * 2 weeks), and clearly surface this approximation in the UI drawer.

---

## 4. Model Pickle & Library Compatibility

- **Notebook Training Environment:** Executed in Google Colab (Linux, Python 3.10/3.11 with scikit-learn ~1.3-1.5, xgboost ~2.0-2.1, joblib ~1.3-1.4).
- **Local Environment:** Windows, Python 3.13.5 (where `xgboost`, `fastapi`, `uvicorn`, `pytest` are currently uninstalled).
- **Plan:**
  1. We will create a pinned `requirements.txt` for the backend with compatible versions:
     `xgboost>=2.0.0`, `scikit-learn>=1.3.0`, `joblib>=1.3.0`, `pandas>=2.0.0`, `fastapi>=0.109.0`, `uvicorn>=0.27.0`, `pytest>=8.0.0`.
  2. Install dependencies into the Python environment.
  3. Load `backend/model/f1_podium_model.pkl` and `backend/model/f1_features.pkl` with `joblib.load`.
  4. Verify `model.feature_names_in_` matches the 21 predictors exactly. If there is any pickle version incompatibility, we will stop immediately and report the error trace without retraining.

---

## 5. Architectural Implementation Plan

### Backend (`/backend`)
- `backend/config.py`: Single source of truth for the 21 driver lineup (`Max Verstappen`, `Lando Norris`, etc.) and default team color mappings.
- `backend/features.py`: Standalone, modular feature builder replicating notebook shift(1) rolling & expanding formulas. Contains clean, line-referenced documentation back to notebook cells.
- `backend/main.py`: FastAPI server with CORS, lifespan loading of data and model, and endpoints:
  - `GET /api/health`
  - `GET /api/meta`
  - `POST /api/predict`
  - `GET /api/model-info` (computes live test metrics using `train_test_split(test_size=0.2, random_state=42, stratify=y)` and feature importances from `model.feature_importances_`).
- `backend/tests/`: Pytest suite with:
  - Notebook parity test (verifies `model.predict_proba` matches hand-calculated feature rows).
  - 21-feature completeness & ordering test (`f1_features.pkl`).
  - Strict leakage test (validates no future race data enters historical rolling stats).

### Frontend (`/frontend`)
- **Stack:** React 18 / Vite / Tailwind CSS / TypeScript / Framer Motion / Recharts / Lucide SVG icons (no emoji).
- **F1 Broadcast Design:**
  - Dark carbon aesthetics: `#0A0A0D` to `#121217`, `#1A1A21` panels, `#E10600` racing red accents, clipped corners (`clip-path: polygon(...)`), skewed dividers.
  - Typography: Google Fonts `Barlow Condensed` for bold italic racing headers, `Titillium Web` for data/body.
  - Authentic 5-red-lights start gantry countdown sequence before revealing results.
  - Driver 3-letter codes with official team accent bars.
  - 3-step prediction flow, interactive mobile/desktop grid selector with auto-fill and duplicate position prevention.
  - P1-center podium podium graphic + full timing-tower leaderboard with independent podium probabilities.
  - Driver feature breakdown drawer showing all 21 raw values.
  - Live model metrics & feature importance chart.
  - LocalStorage history for recent 5 predictions.
