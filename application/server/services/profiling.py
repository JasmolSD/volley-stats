from __future__ import annotations
from typing import Dict, Any, Union, Optional
import numpy as np
import pandas as pd

NumberOrNone = Optional[float]

def _maybe_float(x: Any) -> NumberOrNone:
    """Return float(x) or None if x is NA/None or not convertible."""
    if x is None:
        return None
    # Treat pandas/NumPy NA as None
    try:
        if pd.isna(x):  # handles np.nan, pd.NA
            return None
    except Exception:
        pass
    try:
        return float(x)
    except Exception:
        return None


def numeric_summary(s: pd.Series) -> Dict[str, NumberOrNone]:
    # Coerce to numeric; NaNs for non-numeric
    s_num = pd.to_numeric(s, errors="coerce")

    # If complex slipped in, take real part and cast to float64
    vals = s_num.to_numpy()
    if np.iscomplexobj(vals):
        vals = np.real(vals)
    s_real = pd.Series(vals, dtype="float64")

    cnt = int(s_real.count())

    return {
        "count": float(cnt),  # if you prefer int, change to int(cnt) and update the return type alias
        "missing": float(s_real.isna().sum()),
        "mean": _maybe_float(s_real.mean()) if cnt > 0 else None,
        "std":  _maybe_float(s_real.std())  if cnt > 1 else None,
        "min":  _maybe_float(s_real.min())  if cnt > 0 else None,
        "q1":   _maybe_float(s_real.quantile(0.25)) if cnt > 0 else None,
        "median": _maybe_float(s_real.median()) if cnt > 0 else None,
        "q3":   _maybe_float(s_real.quantile(0.75)) if cnt > 0 else None,
        "max":  _maybe_float(s_real.max())  if cnt > 0 else None,
        "skew": _maybe_float(s_real.skew(skipna=True)) if cnt > 2 else None,
    }


def categorical_summary(s: pd.Series, topk=10):
    vc = s.astype("string").value_counts(dropna=True).head(topk)
    return {
        "count": int(s.notna().sum()),
        "missing": int(s.isna().sum()),
        "n_unique": int(s.nunique(dropna=True)),
        "top_values": [{"value": str(idx), "count": int(cnt)} for idx, cnt in vc.items()]
    }


def profile_dataframe(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Return a light profiling dict. Keep keys flexible since it's not used
    directly by the UI.
    """
    numeric = df.select_dtypes("number").describe().to_dict()
    categorical = {c: int(df[c].nunique()) for c in df.columns if df[c].dtype == "object"}
    return {"numeric": numeric, "categorical": categorical}
