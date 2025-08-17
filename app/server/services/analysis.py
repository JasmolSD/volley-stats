# server/analysis.py
from __future__ import annotations
import io, base64
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.figure import Figure
from fuzzywuzzy import process # type: ignore
from typing import Literal, Optional, Tuple, Dict
from types_common import PlotKind, UISummary

# Global Variable for fuzzymatch similarity threshold
THRESHOLD = 80

# Different plot modes
PlotMode = Literal["cumulative", "temporal"]

def resolve_player_name(
        df: pd.DataFrame,
        raw_name: Optional[str]
    ) -> Tuple[pd.DataFrame, str]:
    """
    Returns (filtered_df, display_name).
    - If raw_name is falsy, returns (df, "").
    - Filtering is done on 'player_key' (casefolded), but display_name preserves original casing.
    """
    if "player_name" not in df.columns:
        raise KeyError("Column 'player_name' not found in dataframe.")
    if "player_key" not in df.columns:
        # fallback in case preprocess wasn't run
        names_series = df["player_name"].astype(str).str.strip()
        df = df.copy()
        df["player_key"] = names_series.str.casefold()

    if not raw_name:
        return df, ""

    query_key = str(raw_name).strip().casefold()
    keys = sorted(df["player_key"].dropna().unique().tolist())

    # exact key match first
    if query_key in keys:
        used_key = query_key
    else:
        # fuzzy match on keys
        match = process.extractOne(query_key, keys)
        if not match or match[1] < THRESHOLD:
            raise ValueError(f"No close match for '{raw_name}'.")
        used_key = match[0]

    # choose a display name with original casing (most frequent or first)
    subset = df.loc[df["player_key"] == used_key, "player_name"]
    if subset.empty:
        raise ValueError(f"Matched key '{used_key}' has no rows.")
    # pick the most common casing
    display_name = subset.mode().iat[0] if not subset.mode().empty else subset.iloc[0]

    filtered_df = df.loc[df["player_key"] == used_key].copy()
    return filtered_df, str(display_name)

def load_and_summarize_csv(file_path: str, review: bool = False):
    """
    Loads a CSV file into a pandas DataFrame,
    standardizes column names to lowercase,
    and provides a summary including shape, data types,
    missing values, and basic statistics.

    Parameters:
    -----------
    file_path : str
        The path to the CSV file.
    review : bool, optional
        If True, prints the DataFrame summary. Default is False.

    Returns:
    --------
    pandas.DataFrame
        The cleaned DataFrame with lowercase column names.
    """

    # Load the CSV file into a DataFrame
    df = pd.read_csv(file_path)

    # Convert column names to lowercase
    df.columns = df.columns.str.lower()

    # Print DataFrame summary
    if review:
        print(f"📊 Shape of the DataFrame (rows, columns): {df.shape}\n")
        print(f"🔍 Data types of each column:\n{df.dtypes}\n")
        # print(f"⚠️ Number of missing values in each column:\n{df.isna().sum()}\n")
        print(f"📈 Descriptive statistics of the DataFrame:\n{df.describe()}\n")

    return df  # Return the cleaned DataFrame

def get_player_data(df: pd.DataFrame, player_name: str) -> Tuple[pd.DataFrame, str]:
    """
    Retrieve data for a specific player or all players if input is empty.

    Parameters:
    -----------
    df : pandas.DataFrame
        The dataset containing player statistics.
    player_name : str
        The name of the player to filter data for.
        - If empty (""), the full dataset is returned.
        - If an invalid name is given, the most similar player name is suggested.

    Returns:
    --------
    tuple
        - pandas.DataFrame: Data for the specified player or all players.
        - str: The actual name used for filtering (empty if all players).
    """

    # 1) Validate column
    if "player_name" not in df.columns:
        raise KeyError("Column 'player_name' not found in dataframe.")

    # 2) Normalize names; handle non-strings/NaNs
    names_series = df["player_name"].astype(str).str.strip()
    # If your data uses 'nan' strings after astype(str), convert them to empty
    names_series = names_series.where(names_series.str.lower() != "nan", "")

    # Build the lowercase set for matching (drop empties)
    player_list = sorted(n for n in names_series.str.lower().unique().tolist() if n)

    # 3) Empty input → return all
    if not player_name or not player_name.strip():
        print("Retrieved data for all players!")
        return df, ""

    target = player_name.strip().lower()

    # 4) Exact match fast-path
    if target in player_list:
        print(f"Retrieved data for {target.title()}!")
        return df[names_series.str.lower() == target], target

    # 5) No exact match → fuzzy fallback
    if not player_list:
        # Nothing to match against
        raise ValueError(
            f"Error: '{player_name}' not found and no player names exist in the data."
        )

    # extractOne can return None → guard it
    result = process.extractOne(target, player_list)
    if result is None:
        raise ValueError(
            f"Error: '{player_name}' not found. No close match found."
        )

    closest_match, score = result[0], result[1]
    if score >= THRESHOLD:
        print(f"Invalid player name.\nUsing closest match: '{closest_match}'. (Score: {score})")
        return df[names_series.str.lower() == closest_match], closest_match

    raise ValueError(
        f"Error: '{player_name}' not found. Closest candidate '{closest_match}' scored {score} (< {THRESHOLD})."
    )

def preprocess_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Standardize dataframe before computing metrics.
      - Converts core columns to correct dtypes.
      - Derives 'year' from 'date'.
      - Derives 'lose' as inverse of 'win'.
      - Coerces numeric stats to float, fills NaNs with 0.
    """
    df = df.copy()

    # --- Core type conversions ---
    if "date" in df.columns:
        df["date"] = pd.to_datetime(df["date"], errors="coerce")
        df["year"] = df["date"].dt.year

    for col in ["match_num", "week_num", "set_num", "player_name", "position", "season"]:
        if col in df.columns:
            df[col] = df[col].astype(str)
    
    df["player_key"] = df["player_name"].astype(str).str.strip().str.casefold()

    if "win" in df.columns:
        df["win"] = df["win"].astype(bool)
        # Derive lose if not present
        if "lose" not in df.columns:
            df["lose"] = ~df["win"]

    # --- Numeric stat columns ---
    cols_to_float = [
        "srv_error", "srv_good", "srv_ace",
        "rcv_error", "rcv_bad", "rcv_good", "rcv_perfect",
        "atk_error", "atk_bad", "atk_good", "atk_kill", "assists",
        "blk_error", "blk_solo", "blk_assist_2", "blk_assist_3",
        "dig_miss", "dig_touch", "dig_up", "defensive_error", "fouls",
    ]
    existing = [c for c in cols_to_float if c in df.columns]
    df[existing] = df[existing].apply(
        lambda col: pd.to_numeric(col, errors="coerce").astype(float).fillna(0)
    )

    # --- Final fill for anything else ---
    df = df.fillna(0)

    return df

def add_accuracy_metrics(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute and add accuracy and error metrics to the DataFrame.

    Adds derived totals:
      - atk_total   = atk_error + atk_bad + atk_good + atk_kill
      - srv_total   = srv_error + srv_good + srv_ace
      - rcv_total   = rcv_error + rcv_bad + rcv_good + rcv_perfect
      - blk_total   = blk_solo + blk_assist_2/2 + blk_assist_3/3
      - dig_total   = dig_miss + dig_touch + dig_up

    Adds accuracies:
      - srv_accuracy = (srv_total - srv_error) / srv_total
      - rcv_accuracy = (3*rcv_perfect + 2*rcv_good + rcv_bad) / (3*rcv_total)
      - atk_accuracy = (atk_kill - atk_error) / atk_total
      - total_errors = srv_error + rcv_error + atk_error + blk_error + defensive_error
    """
    df = df.copy()

    # --- helpers ---
    def _num(col: str) -> pd.Series:
        return pd.to_numeric(df[col], errors="coerce").fillna(0) if col in df.columns \
               else pd.Series(0, index=df.index, dtype=float)

    def _safe_div(n: pd.Series, d: pd.Series) -> pd.Series:
        d = d.replace(0, np.nan)
        return (n / d).replace([np.inf, -np.inf], np.nan).fillna(0.0)

    # --- derived totals ---
    df["atk_total"] = _num("atk_error") + _num("atk_bad") + _num("atk_good") + _num("atk_kill")
    df["srv_total"] = _num("srv_error") + _num("srv_good") + _num("srv_ace")
    df["rcv_total"] = _num("rcv_error") + _num("rcv_bad") + _num("rcv_good") + _num("rcv_perfect")
    df["blk_total"] = _num("blk_solo") + _num("blk_assist_2")/2 + _num("blk_assist_3")/3
    df["dig_total"] = _num("dig_miss") + _num("dig_touch") + _num("dig_up")

    # --- component cols for accuracy ---
    srv_total = df["srv_total"]
    srv_error = _num("srv_error")

    rcv_total = df["rcv_total"]
    rcv_perf  = _num("rcv_perfect")
    rcv_good  = _num("rcv_good")
    rcv_bad   = _num("rcv_bad")
    rcv_err   = _num("rcv_error")

    atk_total = df["atk_total"]
    atk_kill  = _num("atk_kill")
    atk_error = _num("atk_error")

    blk_error = _num("blk_error")
    def_error = _num("defensive_error")

    # --- metrics ---
    df["srv_accuracy"] = _safe_div(srv_total - srv_error, srv_total).round(3)
    df["rcv_accuracy"] = _safe_div(3*rcv_perf + 2*rcv_good + rcv_bad, 3*rcv_total).round(3)
    df["atk_accuracy"] = _safe_div(atk_kill - atk_error, atk_total).round(3)
    df["total_errors"] = (srv_error + rcv_err + atk_error + blk_error + def_error).astype(float)

    return df

def add_average_metrics(df: pd.DataFrame) -> pd.DataFrame:
    """
    Safe per-game averages; avoids div-by-zero and preserves your rounding.
    Expects games_count in df.
    """
    df = df.copy()
    g = df["games_count"].replace(0, np.nan)

    def r(v, d, decimals):  # round with nan-safe div
        x = v / d
        return np.round(x, decimals).fillna(0)

    # Serve
    df["avg_srv_ace"]       = r(df["srv_ace"],       g, 1)
    df["avg_total_serves"]  = r(df["srv_total"],     g, 1)

    # Receive
    df["avg_rcv_good"]      = r(df["rcv_good"],      g, 1)
    df["avg_rcv_bad"]       = r(df["rcv_bad"],       g, 1)
    df["avg_rcv_perfect"]   = r(df["rcv_perfect"],   g, 1)
    df["avg_total_rcv"]     = r(df["rcv_total"],     g, 1)

    # Offense
    df["avg_atk_good"]      = r(df["atk_good"],      g, 1)
    df["avg_atk_bad"]       = r(df["atk_bad"],       g, 1)
    df["avg_total_atk"]     = r(df["atk_total"],     g, 1)
    df["avg_kills"]         = r(df["atk_kill"],      g, 1)

    # Errors
    df["avg_atk_errors"]    = r(df["atk_error"],     g, 2)
    df["avg_rcv_errors"]    = r(df["rcv_error"],     g, 2)
    df["avg_srv_errors"]    = r(df["srv_error"],     g, 2)
    df["avg_tot_errors"]    = r(df["total_errors"],  g, 2)
    df["avg_blk_errors"]    = r(df["blk_error"],     g, 2)
    df["avg_def_errors"]    = r(df["defensive_error"], g, 2)

    return df

def read_tablelike(file_stream, filename: str) -> pd.DataFrame:
    if filename.lower().endswith((".xlsx", ".xls")):
        return pd.read_excel(file_stream)
    return pd.read_csv(file_stream)

def _infer_date_range(df: pd.DataFrame) -> tuple[str, str]:
    for c in ("date", "match_date", "game_date", "timestamp"):
        if c in df.columns:
            s = pd.to_datetime(df[c], errors="coerce")
            s = s[s.notna()]
            if not s.empty:
                return s.min().date().isoformat(), s.max().date().isoformat()
    return "—", "—"

def compute_summary(df: pd.DataFrame) -> UISummary:
    # Assume metrics already added by caller; do not recompute here
    rows = int(len(df))
    players = sorted(df["player_name"].dropna().astype(str).unique().tolist()) if "player_name" in df.columns else []
    dmin, dmax = _infer_date_range(df)
    return {"rows": rows, "players": players, "date_min": dmin, "date_max": dmax}

# --- Switching Beteen CUMULATIVE & TEMPORAL PLOTS ---
def build_cumulative(df: pd.DataFrame) -> Dict[str, pd.DataFrame]:
    # 1) group before accuracy metrics
    df_grouped = (
        df.drop(['set_num', 'match_num'], axis=1)
          .groupby(['date','format','season','week_num','player_name','year','position'])
          .sum()
          .reset_index()
    )
    # 2) games_count
    df_grouped['games_count'] = df_grouped['win'] + df_grouped['lose']

    # 3) player overall rollup
    df_overall = (
        df_grouped.drop(['date','week_num','position','year','format','season'], axis=1)
                  .groupby(['player_name']).sum().reset_index()
    )
    # 4) accuracy metrics last
    df_overall = add_accuracy_metrics(df_overall)
    return {"df_overall": df_overall}

def build_temporal(df: pd.DataFrame) -> Dict[str, pd.DataFrame]:
    # initial grouping (same as cumulative step 1)
    df_grouped = (
        df.drop(['set_num','match_num'], axis=1)
          .groupby(['date','format','season','week_num','player_name','year','position'])
          .sum().reset_index()
    )
    df_grouped['games_count'] = df_grouped['win'] + df_grouped['lose']

    # team_overall (two-step drop/group pattern)
    team_overall = (
        df_grouped.drop(['position','format','season'], axis=1)
                  .groupby(['date','year','player_name','week_num']).sum().reset_index()
    )
    team_overall = (
        team_overall.drop(['player_name'], axis=1)
                    .groupby(['date','year','games_count','week_num']).sum().reset_index()
    )

    # df_player_date (with position) and no_pos variants
    df_player_date = (df_grouped.groupby(['date','year','season','week_num','position','games_count','player_name'])
                                .sum().reset_index().sort_values('date'))
    df_player_date_no_pos = (
        df_player_date.drop(columns=['position'])
                      .groupby(['date','year','season','week_num','player_name','format'])
                      .sum().reset_index()
    )

    # accuracy → average metrics (per your order)
    team_overall          = add_accuracy_metrics(team_overall)
    team_overall          = add_average_metrics(team_overall)

    df_player_date        = add_accuracy_metrics(df_player_date)
    df_player_date        = add_average_metrics(df_player_date)

    df_player_date_no_pos = add_accuracy_metrics(df_player_date_no_pos)
    df_player_date_no_pos = add_average_metrics(df_player_date_no_pos)

    return {
        "team_overall": team_overall,
        "df_player_date": df_player_date,
        "df_player_date_no_pos": df_player_date_no_pos
    }

def prepare_dfs(df: pd.DataFrame, mode: PlotMode) -> Dict[str, pd.DataFrame]:
    return build_cumulative(df) if mode == "cumulative" else build_temporal(df)
