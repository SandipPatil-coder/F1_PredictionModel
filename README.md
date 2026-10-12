# Formula 1 Podium Predictor // Telemetry ML Web Platform

A production-quality, mobile-first Formula 1 podium prediction application powered by a trained **XGBoost Classifier** and historical Grand Prix telemetry. Built strictly to replicate the logic, feature engineering, and inference equations from the project notebook (`reference/Another_copy_of__DEVLProject.ipynb`).

---

## Architecture Overview

```text
DEVL11/
├── backend/
│   ├── config.py                 # 21-driver lineup, 21 predictors, team colors & paths
│   ├── features.py               # Feature builder mirroring shift(1) rolling formulas
│   ├── main.py                   # FastAPI application with CORS & static frontend mount
│   ├── requirements.txt          # Pinned Python package dependencies
│   ├── data/                     # Project datasets
│   │   ├── f1_final_cleaned_dataset50.csv  # Full cleaned historical dataset
│   │   └── f1_seasons_2025_2026.csv        # 2025 & 2026 seasons subset
│   ├── model/                    # Model artifacts
│   │   ├── f1_podium_model.pkl   # Trained XGBClassifier (joblib)
│   │   └── f1_features.pkl       # 21-predictor names list (joblib)
│   └── tests/
│       └── test_backend.py       # Pytest unit & data leakage test suite
├── frontend/                     # React 19 + Vite 8 + Tailwind CSS v4 + Framer Motion
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx        # Wordmark with slanted red slash, tabs, mobile bar
│   │   │   ├── StartLightsGantry.tsx # 5-red-lights animated race start countdown
│   │   │   ├── PredictView.tsx   # 3-step prediction workflow & qualifying grid
│   │   │   ├── ResultsView.tsx   # P1-P3 podium graphic & timing tower leaderboard
│   │   │   ├── DriverDrawer.tsx  # Exact 21 raw predictor values breakdown drawer
│   │   │   └── ModelView.tsx     # Live-computed metrics & Recharts feature importance
│   │   ├── types.ts              # TypeScript API contracts and state definitions
│   │   ├── App.tsx               # State coordination & API client
│   │   └── index.css             # Dark carbon F1 broadcast design system
│   └── dist/                     # Optimized production bundle
├── reference/
│   └── Another_copy_of__DEVLProject.ipynb # Source of truth project notebook
└── README.md
```

---

## File Placement Guide

Please place your model artifacts and datasets into the respective folders:

| File | Destination Directory | Description |
| :--- | :--- | :--- |
| `f1_podium_model.pkl` | `backend/model/` | Trained XGBClassifier dumped with joblib |
| `f1_features.pkl` | `backend/model/` | Predictor names list dumped with joblib |
| `f1_final_cleaned_dataset50.csv` | `backend/data/` | Full cleaned historical F1 dataset |
| `f1_seasons_2025_2026.csv` | `backend/data/` | 2025 and 2026 season subset |

---

## Environment Requirements

- **Python**: 3.10+ (Tested on Python 3.13)
- **Node.js**: v18+ (Tested on Node v22.20.0, npm 10.9.3)

---

## Installation & Running Locally

### 1. Backend Setup
From the repository root:
```bash
# Install backend Python dependencies
pip install -r backend/requirements.txt

# Start the FastAPI backend on port 8000
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
API docs will be live at `http://127.0.0.1:8000/docs`.

### 2. Frontend Development Server
In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```
The frontend dev server runs at `http://localhost:5173` with an automatic reverse proxy forwarding `/api` calls to `http://127.0.0.1:8000`.

---

## One-Command Production Option

The FastAPI server mounts and serves the pre-built React production bundle (`frontend/dist`) at the root URL `/`.

1. Build the frontend:
   ```bash
   cd frontend
   npm run build
   cd ..
   ```
2. Start the unified production server:
   ```bash
   python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
   ```
3. Open `http://localhost:8000` in any desktop or mobile browser.

---

## Running Automated Tests

Run the backend verification suite using pytest:
```bash
python -m pytest backend/tests/ -v
```

Tests verify:
1. **Predictor Completeness & Ordering**: Exact match with `f1_features.pkl` (21 features).
2. **Data Leakage Prevention**: Confirms no race at or after `(season, round)` enters historical rolling statistics.
3. **Q1 Lap Time Conversion & Outlier Filtering**: Outliers above 300 seconds mapped to `NaN`.
4. **Rookie & Unseen Circuit Handling**: Safely passes raw `NaN` without silent imputation.
5. **Driver Name Code Generation**: 3-letter uppercase surname acronyms (e.g. `VER`, `NOR`, `LEC`).

---

## Model & Feature Engineering Specifications

* **Target Variable**: Binary target `podium` (1 if `finish_position_numeric <= 3`, else 0).
* **Model Family**: `XGBClassifier(n_estimators=200, max_depth=4, learning_rate=0.05, eval_metric='logloss', random_state=42)`.
* **The 21 Predictors** (in strict order):
  1. `driver_podium_rate_5` (Rolling 5-race podium rate)
  2. `driver_podium_rate_3` (Rolling 3-race podium rate)
  3. `driver_circuit_podium_rate` (Expanding podium rate at this circuit)
  4. `driver_previous_finish` (Finish position in previous race)
  5. `driver_avg_finish_3` (Rolling 3-race average finish)
  6. `driver_avg_finish_5` (Rolling 5-race average finish)
  7. `driver_season_avg_finish` (Season-to-date average finish)
  8. `driver_age` (`(race_date - dob) / 365.25`)
  9. `driver_season_race_count` (Prior races in current season)
  10. `driver_circuit_race_count` (Prior races at current circuit)
  11. `constructor_avg_finish_3` (Constructor 3-race rolling team mean)
  12. `constructor_avg_finish_5` (Constructor 5-race rolling team mean)
  13. `grid_position` (Starting grid position, equals qualifying position)
  14. `qualifying_position` (User input 1 to 21)
  15. `grid_penalty` (`grid_position - qualifying_position = 0`)
  16. `circuit_altitude` (Circuit altitude in meters)
  17. `circuit_latitude` (Circuit latitude)
  18. `circuit_longitude` (Circuit longitude)
  19. `round` (Championship round number)
  20. `season` (Championship season year)
  21. `q1_time` (Optional Q1 lap time in seconds)

* **Independent Probabilities**: Raw model probabilities from `model.predict_proba` are displayed. They are **not** normalized to sum to 100% or 3 because each driver has an independent probability of reaching the podium.

---

## Troubleshooting

### Pickle / XGBoost Version Mismatch
- **Issue**: `ModuleNotFoundError: No module named 'xgboost'` or `AttributeError` when unpickling.
- **Cause**: The pickle was saved under XGBoost 2.x and scikit-learn 1.3-1.5 in Google Colab.
- **Fix**: Run `pip install --upgrade -r backend/requirements.txt`. If scikit-learn raises an unpickling version error, ensure `scikit-learn>=1.4.0` is installed.

### Missing `driver_age` in CSV
- **Issue**: Notebook Cell 74 assigned `driver_age` to `model_df` after copying `final_df = model_df.copy()`.
- **Handling**: The backend automatically detects if `driver_age` is missing in `f1_final_cleaned_dataset50.csv` and recomputes it on startup using `(race_date - dob).dt.days / 365.25`.

### Missing Data/Model Error State
- If any file is missing, the API endpoints return clear `503 Service Unavailable` error responses.
- The web UI displays an error notice banner with diagnostics and a live &ldquo;Retry&rdquo; button. No dummy or synthetic predictions are ever shown.
