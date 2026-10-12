from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "model" / "f1_podium_model.pkl"
FEATURES_PATH = BASE_DIR / "model" / "f1_features.pkl"
HISTORICAL_DATA_PATH = BASE_DIR / "data" / "f1_final_cleaned_dataset50.csv"
SEASONS_2025_2026_PATH = BASE_DIR / "data" / "f1_seasons_2025_2026.csv"

# Current drivers list from notebook Cell 123
CURRENT_DRIVERS = [
    "Max Verstappen",
    "Lando Norris",
    "Oscar Piastri",
    "Charles Leclerc",
    "Lewis Hamilton",
    "George Russell",
    "Kimi Antonelli",
    "Fernando Alonso",
    "Lance Stroll",
    "Pierre Gasly",
    "Franco Colapinto",
    "Esteban Ocon",
    "Oliver Bearman",
    "Nico Hulkenberg",
    "Gabriel Bortoleto",
    "Carlos Sainz",
    "Alexander Albon",
    "Liam Lawson",
    "Isack Hadjar",
    "Sergio Perez",
    "Valtteri Bottas"
]

# Exact 21 predictors from Cell 113 / f1_features.pkl
PREDICTORS = [
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

# Predictor Category Groupings for UI presentation
PREDICTOR_GROUPS = {
    "Grid and Qualifying": ["qualifying_position", "grid_position", "grid_penalty", "q1_time"],
    "Driver Form": ["driver_previous_finish", "driver_avg_finish_3", "driver_avg_finish_5", "driver_podium_rate_3", "driver_podium_rate_5"],
    "Circuit History": ["driver_circuit_avg_finish", "driver_circuit_race_count", "driver_circuit_podium_rate"],
    "Constructor Form": ["constructor_avg_finish_3", "constructor_avg_finish_5"],
    "Circuit Geography": ["circuit_latitude", "circuit_longitude", "circuit_altitude"],
    "Season Context": ["season", "round", "driver_season_avg_finish", "driver_season_race_count", "driver_age"]
}

# Constructor display colors
CONSTRUCTOR_COLORS = {
    "Red Bull": "#3671C6",
    "Red Bull Racing": "#3671C6",
    "McLaren": "#FF8000",
    "Ferrari": "#E80020",
    "Mercedes": "#27F4D2",
    "Aston Martin": "#229971",
    "Alpine": "#0093CC",
    "Alpine F1 Team": "#0093CC",
    "Williams": "#64C4FF",
    "Haas": "#B6BABD",
    "Haas F1 Team": "#B6BABD",
    "Sauber": "#52E252",
    "Kick Sauber": "#52E252",
    "Stake F1 Team Kick Sauber": "#52E252",
    "RB": "#6692FF",
    "AlphaTauri": "#6692FF",
    "Racing Bulls": "#6692FF",
}

DEFAULT_CONSTRUCTOR_COLOR = "#8A8A96"

def get_driver_code(name: str) -> str:
    """Return 3-letter uppercase driver code from first 3 letters of surname."""
    parts = name.strip().split()
    surname = parts[-1] if parts else name
    # Clean non-alpha
    clean = "".join(c for c in surname if c.isalpha()).upper()
    return clean[:3] if len(clean) >= 3 else (name[:3].upper())
