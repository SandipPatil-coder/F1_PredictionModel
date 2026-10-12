export interface DriverMeta {
  name: string;
  code: string;
  constructor: string;
  color: string;
}

export interface GridDriverInput {
  driver_name: string;
  qualifying_position: number;
  q1_time?: string;
}

export interface PredictRequest {
  circuit: string;
  season: number;
  round: number;
  grid: GridDriverInput[];
}

export interface PredictionDriver {
  driver_name: string;
  driver_code: string;
  constructor_name: string;
  constructor_color: string;
  qualifying_position: number;
  podium_probability: number;
  raw_probability: number;
  rank: number;
  race_date: string;
  is_approx_date: boolean;
  features: Record<string, number | null>;
}

export interface PredictResponse {
  circuit: string;
  season: number;
  round: number;
  predicted_podium: PredictionDriver[];
  leaderboard: PredictionDriver[];
}

export interface MetaResponse {
  circuits: string[];
  drivers: DriverMeta[];
  available_seasons: number[];
  predictors: string[];
  predictor_groups: Record<string, string[]>;
  date_range: {
    min_date: string | null;
    max_date: string | null;
  };
}

export interface ModelInfoResponse {
  model_type: string;
  hyperparameters: {
    n_estimators: number;
    max_depth: number;
    learning_rate: number;
    eval_metric: string;
    random_state: number;
    [key: string]: any;
  };
  predictors: string[];
  predictor_groups: Record<string, string[]>;
  feature_importances: Record<string, number>;
  metrics: {
    accuracy?: number;
    precision?: number;
    recall?: number;
    roc_auc?: number;
    podium_class_share?: number;
    test_samples?: number;
    train_samples?: number;
    error?: string;
    note?: string;
  };
  date_range: {
    min_date: string | null;
    max_date: string | null;
  };
}

export interface HealthResponse {
  status: string;
  model_loaded: boolean;
  data_loaded: boolean;
  error: string | null;
}

export interface StoredPrediction {
  id: string;
  timestamp: number;
  circuit: string;
  season: number;
  round: number;
  p1: string;
  p2: string;
  p3: string;
  data: PredictResponse;
}
