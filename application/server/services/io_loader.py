# io_loader.py
from __future__ import annotations
from typing import Tuple
import os
import pandas as pd
from types_common import Meta

def load_dataframe(path: str) -> Tuple[pd.DataFrame, Meta]:
    print("Loading Dataframe...")
    _, ext = os.path.splitext(path.lower())
    if ext in (".xlsx", ".xls"):
        df = pd.read_excel(path)
    else:
        df = pd.read_csv(path)
    meta: Meta = {
        "rows": int(df.shape[0]),
        "cols": int(df.shape[1]),
        "columns": list(df.columns),
        "source_name": os.path.basename(path),
    }
    return df, meta
