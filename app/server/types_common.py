# types_common.py
from __future__ import annotations
from typing import TypedDict, List, Dict, Literal, Union, Mapping, Sequence
import pandas as pd

PlotKind = Literal[
    "offense", 
    "service", 
    "receive", 
    "errors", 
    "atk_acc_over_time", 
    "avg_errors_over_time"
]

ImageRef = Union[str, Mapping[str, str]]
ImageSeq = Sequence[ImageRef]

class UISummary(TypedDict):
    rows: int
    players: List[str]
    date_min: str
    date_max: str
    atk_accuracy: float
    rcv_accuracy: float
    srv_accuracy: float
    avg_errors_per_set: float

class Meta(TypedDict, total=False):
    rows: int
    cols: int
    columns: List[str]
    source_name: str
    sheet: str
    # NEW: cache for per-player summaries
    ui_summary_cache: Dict[str, UISummary]

class CommentaryObj(TypedDict, total=False):
    commentary: str
    requests: List[str]

# Convenience alias for your in-memory cache
DFCache = Dict[str, pd.DataFrame]
