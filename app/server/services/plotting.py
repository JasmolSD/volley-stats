from __future__ import annotations
from typing import Any, Dict, List, Optional, Literal
from types_common import PlotKind
import os, io, base64

import matplotlib
# Non-GUI backend for servers/workers
matplotlib.use("Agg", force=True)

import pandas as pd
from matplotlib.figure import Figure
from matplotlib.backends.backend_agg import FigureCanvasAgg as FigureCanvas

# import functions from other files
from .analysis import prepare_dfs
from .plots_temporal import (
    plot_service_temporal,
    plot_assists_per_attack,    # to add
    plot_attack_accuracy,
    plot_avg_errors,
    plot_offensive_temporal,
    plot_player_errors,
    plot_receive_temporal
)
from .plots_cumulative import (
    plot_offensive_performance,
    plot_receive_performance,
    plot_service_metrics
)


PlotMode = Literal["cumulative", "temporal"]

# ---------- Tiny utils ----------

def _ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)

def _fig_to_png_bytes(fig: Figure) -> bytes:
    buf = io.BytesIO()
    fig.tight_layout()
    canvas = FigureCanvas(fig)
    canvas.print_png(buf)
    buf.seek(0)
    return buf.read()

def _save_or_b64(fig: Figure, out_path: Optional[str] = None) -> Optional[str]:
    png = _fig_to_png_bytes(fig)
    if out_path:
        with open(out_path, "wb") as f:
            f.write(png)
        return None
    return "data:image/png;base64," + base64.b64encode(png).decode("utf-8")

def _filter_by_player(df: pd.DataFrame, player_name: Optional[str]) -> pd.DataFrame:
    if player_name and "player_name" in df.columns:
        return df[df["player_name"].astype(str) == str(player_name)]
    return df

def fig_to_base64_png(fig: Optional[Figure] = None) -> str:
    if fig is None:
        # In this module we always return a Figure, but keep a safe fallback.
        fig = Figure(figsize=(6, 4), dpi=150)
    return base64.b64encode(_fig_to_png_bytes(fig)).decode("utf-8")


# ---------- Public API ----------
def render_plot(
    df: pd.DataFrame,
    kind: PlotKind = "offense",
    player_name: Optional[str] = None,
    mode: PlotMode = "cumulative",
    **kwargs: Any,
) -> str:
    """
    Render a plot as base64 based on kind and mode ("cumulative" | "temporal").

    cumulative:
      - Uses df_overall and your existing cumulative plots:
        plot_offensive_performance / plot_service_metrics / plot_receive_performance

    temporal:
      - Uses prepped temporal frames and your temporal plots:
        plot_offensive_temporal / plot_service_temporal / plot_receive_temporal
    """
    title_player = player_name or "Team"

    # Build/prepare the right set of dataframes for the selected mode
    dfs = prepare_dfs(df, mode)  # <- build_cumulative / build_temporal inside

    # ---- CUMULATIVE PATH ----
    if mode == "cumulative":
        # your existing plots expect player-filtered totals
        df_overall = dfs["df_overall"]
        sdf = _filter_by_player(df_overall, player_name)

        if kind == "offense":
            fig = plot_offensive_performance(
                sdf,
                player_name=title_player,
                **{k: v for k, v in kwargs.items() if k != "player_name"},
            )
        elif kind == "service":
            fig = plot_service_metrics(
                sdf,
                player_name=title_player,
                **{k: v for k, v in kwargs.items() if k != "player_name"},
            )
        elif kind == "receive":
            fig = plot_receive_performance(
                sdf,
                player_name=title_player,
                **{k: v for k, v in kwargs.items() if k != "player_name"},
            )
        else:
            raise ValueError(f"Unknown plot kind (cumulative): {kind}")

        return fig_to_base64_png(fig)

    # ---- TEMPORAL PATH ----
    elif mode == "temporal":
        # temporal plots use the time-indexed aggregates
        team_overall = dfs["team_overall"]
        # Some temporal plots also need player-per-date (no position)
        df_player_np = dfs.get("df_player_date_no_pos", None)
        # The assists per set plot needs player-per-date (with position)
        df_player = dfs.get("df_player_date", None)

        if kind == "offense":
            fig = plot_offensive_temporal(
                team_overall,
                player_name=title_player,
                **{k: v for k, v in kwargs.items() if k != "player_name"},
            )
        elif kind == "service":
            fig = plot_service_temporal(
                team_overall,
                player_name=title_player,
                **{k: v for k, v in kwargs.items() if k != "player_name"},
            )
        elif kind == "receive":
            fig = plot_receive_temporal(
                team_overall,
                player_name=title_player,
                **{k: v for k, v in kwargs.items() if k != "player_name"},
            )
        elif kind == "errors":
            fig = plot_avg_errors(
                team_overall,
                player_name=title_player,
                **{k: v for k, v in kwargs.items() if k != "player_name"},
            )
        elif kind == "atk_acc_over_time":
            fig = plot_attack_accuracy(
                df_player_np,
                player_name=title_player,
                **{k: v for k, v in kwargs.items() if k != "player_name"},
            )
        elif kind == "avg_errors_over_time":
            fig = plot_player_errors(
                df_player_np,
                player_name=title_player,
                **{k: v for k, v in kwargs.items() if k != "player_name"},
            )
        elif kind == "assists":
            fig = plot_assists_per_attack(
                df_player,
                player_name=title_player,
                **{k: v for k, v in kwargs.items() if k != "player_name"},
            )
        else:
            raise ValueError(f"Unknown plot kind (temporal): {kind}")

        return fig_to_base64_png(fig)

    else:
        raise ValueError(f"Unknown mode: {mode!r} (use 'cumulative' or 'temporal')")


def generate_plots(
    df: pd.DataFrame,
    out_dir: str,
    run_id: str,
    summary: Dict[str, Any] | None = None,
) -> List[Dict[str, str]]:
    """
    Optionally write static images to out_dir/run_id and return relative URLs (for /static).
    Produces histograms for up to 5 numeric columns and a small correlation heatmap.
    """
    run_dir = os.path.join(out_dir, run_id)
    _ensure_dir(run_dir)

    # Determine numeric columns (prefer a provided summary)
    numeric_cols: List[str] = []
    if isinstance(summary, dict) and isinstance(summary.get("numeric"), dict):
        numeric_cols = list(summary["numeric"].keys())
    if not numeric_cols:
        numeric_cols = df.select_dtypes(include="number").columns.tolist()
    numeric_cols = numeric_cols[:5]  # keep snappy

    images: List[Dict[str, str]] = []

    # Histograms
    for col in numeric_cols:
        series = df[col].dropna()
        fig = Figure(figsize=(6, 4), dpi=120)
        ax = fig.add_subplot(111)
        ax.hist(series, bins=30, alpha=0.85)
        ax.set_title(f"Distribution: {col}")
        ax.set_xlabel(col)
        ax.set_ylabel("Count")

        filename = f"{col}_hist.png"
        path = os.path.join(run_dir, filename)
        _save_or_b64(fig, out_path=path)
        images.append({"name": filename, "url": f"/static/{run_id}/{filename}"})

    # Correlation heatmap (if ≥2 numeric cols)
    if len(numeric_cols) >= 2:
        corr = df[numeric_cols].corr(numeric_only=True)
        fig = Figure(figsize=(6, 5), dpi=120)
        ax = fig.add_subplot(111)
        im = ax.imshow(corr, interpolation="nearest")
        ax.set_xticks(range(len(numeric_cols)))
        ax.set_yticks(range(len(numeric_cols)))
        ax.set_xticklabels(numeric_cols, rotation=45, ha="right")
        ax.set_yticklabels(numeric_cols)
        ax.set_title("Correlation (subset)")
        # Add simple colorbar
        fig.colorbar(im, ax=ax, fraction=0.046, pad=0.04)

        filename = "corr.png"
        path = os.path.join(run_dir, filename)
        _save_or_b64(fig, out_path=path)
        images.append({"name": filename, "url": f"/static/{run_id}/{filename}"})

    return images