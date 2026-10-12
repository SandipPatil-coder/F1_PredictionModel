import modelData from '../data/model.json';
import mlBundle from '../data/ml_bundle.json';
import modelInfoData from '../data/model_info.json';
import type {
  MetaResponse,
  ModelInfoResponse,
  PredictRequest,
  PredictResponse,
  PredictionDriver,
  DriverMeta,
} from '../types';

interface Tree {
  left_children: number[];
  right_children: number[];
  split_indices: number[];
  split_conditions: number[];
  default_left: number[];
}

const trees: Tree[] = (modelData as any).learner.gradient_booster.model.trees;
const rawBaseScore = (modelData as any).learner.learner_model_param.base_score.replace(/[\[\]]/g, '');
const baseScore = parseFloat(rawBaseScore);
const initialLogOdds = Math.log(baseScore / (1.0 - baseScore));

// Predictors array in exact model order
export const PREDICTORS: string[] = mlBundle.predictors;

/**
 * Parse Q1 time into seconds. Outliers > 300s mapped to NaN.
 */
export function parseQ1Time(q1Input: any): number | null {
  if (q1Input === null || q1Input === undefined) return null;
  const strVal = String(q1Input).trim();
  if (!strVal || ['nan', 'none', 'null', ''].includes(strVal.toLowerCase())) {
    return null;
  }

  try {
    let sec = 0;
    if (!strVal.includes(':')) {
      sec = parseFloat(strVal);
    } else {
      const parts = strVal.split(':');
      if (parts.length === 2) {
        sec = parseFloat(parts[0]) * 60.0 + parseFloat(parts[1]);
      } else if (parts.length === 3) {
        sec = parseFloat(parts[0]) * 3600.0 + parseFloat(parts[1]) * 60.0 + parseFloat(parts[2]);
      } else {
        return null;
      }
    }
    if (isNaN(sec) || sec <= 0 || sec > 300.0) return null;
    return sec;
  } catch {
    return null;
  }
}

/**
 * Traverse the 200 XGBoost decision trees.
 * Returns raw podium probability (0.0 to 1.0).
 */
export function predictProbability(featureVector: number[]): number {
  let logOdds = initialLogOdds;

  for (let t = 0; t < trees.length; t++) {
    const tree = trees[t];
    let node = 0;

    while (tree.left_children[node] !== -1) {
      const featIdx = tree.split_indices[node];
      const val = featureVector[featIdx];

      if (val === null || val === undefined || isNaN(val)) {
        node = tree.default_left[node] === 1 ? tree.left_children[node] : tree.right_children[node];
      } else if (val < tree.split_conditions[node]) {
        node = tree.left_children[node];
      } else {
        node = tree.right_children[node];
      }
    }

    logOdds += tree.split_conditions[node];
  }

  return 1.0 / (1.0 + Math.exp(-logOdds));
}

/**
 * Build 21-feature row for a given driver with strict shift(1) non-lookahead filtering.
 */
export function buildDriverFeatures(
  driverName: string,
  qualifyingPosition: number,
  circuitName: string,
  season: number,
  roundNum: number,
  q1TimeInput: any
): { features: Record<string, number | null>; meta: any } {
  const row: Record<string, number | null> = {};

  // 1. Grid & Qualifying
  const qualPos = Number(qualifyingPosition);
  row['qualifying_position'] = qualPos;
  row['grid_position'] = qualPos;
  row['grid_penalty'] = 0.0;
  row['season'] = Number(season);
  row['round'] = Number(roundNum);
  row['q1_time'] = parseQ1Time(q1TimeInput);

  // 2. Circuit Lookup
  const circuitInfo = (mlBundle.circuits as Record<string, any>)[circuitName];
  const circuitId = circuitInfo?.circuitId ?? null;
  row['circuit_latitude'] = circuitInfo?.lat ?? null;
  row['circuit_longitude'] = circuitInfo?.lng ?? null;
  row['circuit_altitude'] = circuitInfo?.alt ?? null;

  // 3. Driver Lookup
  const driverData = (mlBundle.drivers as Record<string, any>)[driverName];
  const currentConstructor = driverData?.constructor || 'Unknown';
  const constructorId = driverData?.constructorId ?? null;

  // 4. Driver Age: (raceDate - dob) / 365.25
  const approxRaceDate = new Date(`${season}-03-15T00:00:00Z`);
  approxRaceDate.setUTCDate(approxRaceDate.getUTCDate() + Math.max(0, roundNum - 1) * 14);

  if (driverData?.dob) {
    const dobDate = new Date(driverData.dob);
    const ageYears = (approxRaceDate.getTime() - dobDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    row['driver_age'] = ageYears;
  } else {
    row['driver_age'] = null;
  }

  // 5. Filter races strictly prior to (season, roundNum)
  const allRaces = (driverData?.races || []) as Array<{
    season: number;
    round: number;
    finish: number | null;
    circuitId: number | null;
    constructorId: number | null;
  }>;

  const priorRaces = allRaces.filter(
    (r) => r.season < season || (r.season === season && r.round < roundNum)
  );

  const finishes = priorRaces.map((r) => r.finish).filter((f): f is number => f !== null);

  if (finishes.length > 0) {
    row['driver_previous_finish'] = finishes[finishes.length - 1];
    const last3 = finishes.slice(-3);
    const last5 = finishes.slice(-5);
    row['driver_avg_finish_3'] = last3.reduce((a, b) => a + b, 0) / last3.length;
    row['driver_avg_finish_5'] = last5.reduce((a, b) => a + b, 0) / last5.length;
    row['driver_podium_rate_3'] = last3.filter((f) => f <= 3).length / last3.length;
    row['driver_podium_rate_5'] = last5.filter((f) => f <= 3).length / last5.length;
  } else {
    row['driver_previous_finish'] = null;
    row['driver_avg_finish_3'] = null;
    row['driver_avg_finish_5'] = null;
    row['driver_podium_rate_3'] = null;
    row['driver_podium_rate_5'] = null;
  }

  // Circuit history
  if (circuitId !== null) {
    const circuitRaces = priorRaces.filter((r) => r.circuitId === circuitId);
    const circuitFinishes = circuitRaces.map((r) => r.finish).filter((f): f is number => f !== null);
    row['driver_circuit_race_count'] = circuitRaces.length;
    if (circuitFinishes.length > 0) {
      row['driver_circuit_avg_finish'] = circuitFinishes.reduce((a, b) => a + b, 0) / circuitFinishes.length;
      row['driver_circuit_podium_rate'] = circuitFinishes.filter((f) => f <= 3).length / circuitFinishes.length;
    } else {
      row['driver_circuit_avg_finish'] = null;
      row['driver_circuit_podium_rate'] = null;
    }
  } else {
    row['driver_circuit_race_count'] = 0;
    row['driver_circuit_avg_finish'] = null;
    row['driver_circuit_podium_rate'] = null;
  }

  // Season history
  const seasonRaces = priorRaces.filter((r) => r.season === season);
  const seasonFinishes = seasonRaces.map((r) => r.finish).filter((f): f is number => f !== null);
  row['driver_season_race_count'] = seasonRaces.length;
  if (seasonFinishes.length > 0) {
    row['driver_season_avg_finish'] = seasonFinishes.reduce((a, b) => a + b, 0) / seasonFinishes.length;
  } else {
    row['driver_season_avg_finish'] = null;
  }

  // Constructor history
  if (constructorId !== null) {
    const allConMeans = ((mlBundle.constructors as Record<string, any>)[String(constructorId)] || []) as Array<{
      season: number;
      round: number;
      mean: number;
    }>;
    const priorConMeans = allConMeans
      .filter((c) => c.season < season || (c.season === season && c.round < roundNum))
      .map((c) => c.mean);

    if (priorConMeans.length > 0) {
      const conLast3 = priorConMeans.slice(-3);
      const conLast5 = priorConMeans.slice(-5);
      row['constructor_avg_finish_3'] = conLast3.reduce((a, b) => a + b, 0) / conLast3.length;
      row['constructor_avg_finish_5'] = conLast5.reduce((a, b) => a + b, 0) / conLast5.length;
    } else {
      row['constructor_avg_finish_3'] = null;
      row['constructor_avg_finish_5'] = null;
    }
  } else {
    row['constructor_avg_finish_3'] = null;
    row['constructor_avg_finish_5'] = null;
  }

  const constructorColor = (mlBundle.constructor_colors as Record<string, string>)[currentConstructor] || mlBundle.default_color;

  const meta = {
    driver_name: driverName,
    driver_code: driverName.substring(0, 3).toUpperCase(),
    constructor_name: currentConstructor,
    constructor_color: constructorColor,
    race_date: approxRaceDate.toISOString().split('T')[0],
    is_approx_date: true,
  };

  return { features: row, meta };
}

/**
 * Execute client-side prediction matching Python inference 100%.
 */
export function runLocalPrediction(req: PredictRequest): PredictResponse {
  const driversResults: PredictionDriver[] = [];

  for (const item of req.grid) {
    const { features, meta } = buildDriverFeatures(
      item.driver_name,
      item.qualifying_position,
      req.circuit,
      req.season,
      req.round,
      item.q1_time
    );

    // Build vector in strict PREDICTORS order
    const vector = PREDICTORS.map((p) => {
      const val = features[p];
      return val === null || val === undefined ? NaN : val;
    });

    const rawProb = predictProbability(vector);
    const probPct = Math.round(rawProb * 10000) / 100;

    driversResults.push({
      driver_name: item.driver_name,
      driver_code: meta.driver_code,
      constructor_name: meta.constructor_name,
      constructor_color: meta.constructor_color,
      qualifying_position: item.qualifying_position,
      podium_probability: probPct,
      raw_probability: rawProb,
      rank: 0,
      race_date: meta.race_date,
      is_approx_date: meta.is_approx_date,
      features,
    });
  }

  // Sort descending by podium probability
  driversResults.sort((a, b) => b.podium_probability - a.podium_probability);

  // Assign ranks
  driversResults.forEach((d, idx) => {
    d.rank = idx + 1;
  });

  return {
    circuit: req.circuit,
    season: req.season,
    round: req.round,
    predicted_podium: driversResults.slice(0, 3),
    leaderboard: driversResults,
  };
}

/**
 * Return metadata bundled locally.
 */
export function getLocalMeta(): MetaResponse {
  const driversMeta: DriverMeta[] = mlBundle.current_drivers.map((dname) => {
    const driverData = (mlBundle.drivers as Record<string, any>)[dname];
    const constructorName = driverData?.constructor || 'Unknown';
    const color = (mlBundle.constructor_colors as Record<string, string>)[constructorName] || mlBundle.default_color;

    return {
      name: dname,
      code: dname.substring(0, 3).toUpperCase(),
      constructor: constructorName,
      color,
    };
  });

  return {
    circuits: Object.keys(mlBundle.circuits).sort(),
    drivers: driversMeta,
    available_seasons: [2026, 2025, 2024, 2023, 2022],
    predictors: PREDICTORS,
    predictor_groups: mlBundle.predictor_groups,
    date_range: {
      min_date: '1994-03-27',
      max_date: '2026-07-26',
    },
  };
}

/**
 * Return model information bundled locally.
 */
export function getLocalModelInfo(): ModelInfoResponse {
  return modelInfoData as unknown as ModelInfoResponse;
}
