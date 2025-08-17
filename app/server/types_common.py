# types_common.py
from __future__ import annotations
from typing import TypedDict, List, Dict, Literal, Union, Mapping, Sequence
import pandas as pd

PlotKind = Literal["offense", "service", "receive"]

ImageRef = Union[str, Mapping[str, str]]
ImageSeq = Sequence[ImageRef]

class UISummary(TypedDict):
    rows: int
    players: List[str]
    date_min: str
    date_max: str

class Meta(TypedDict, total=False):
    rows: int
    cols: int
    columns: List[str]
    source_name: str
    sheet: str

class CommentaryObj(TypedDict, total=False):
    commentary: str
    requests: List[str]

# Convenience alias for your in-memory cache
DFCache = Dict[str, pd.DataFrame]
