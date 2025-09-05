from __future__ import annotations
from typing import List, Optional, Tuple
import matplotlib
# Non-GUI backend for servers/workers
matplotlib.use("Agg", force=True)

import pandas as pd
import numpy as np
from matplotlib.figure import Figure

# ---------- Plotters (OO Matplotlib; return Figure) ----------
# Cumulative statistics

def plot_offensive_performance(
    df_overall: pd.DataFrame,
    player_name: str,
    exclude_players: Optional[List[str]] = None,
    show_bad: bool = False,
    show_good: bool = False,
) -> Figure:
    """
    Plot offensive performance per player:
      - Optional bars for bad/good attacks
      - Always bars for errors, kills, total attacks
      - Line for hitting accuracy on a secondary axis

    Expects columns:
    'player_name', 'atk_error', 'atk_bad', 'atk_good', 'atk_kill', 'atk_total', 'atk_accuracy'
    """
    if exclude_players is not None and (
        not isinstance(exclude_players, list) or not all(isinstance(p, str) for p in exclude_players)
    ):
        raise ValueError("exclude_players must be a list of strings or None")
    if not isinstance(player_name, str):
        raise ValueError("player_name must be a string")

    exclude = exclude_players or []
    df = (
        df_overall
        .query("player_name not in @exclude")
        .sort_values("atk_accuracy", ascending=False)
        .reset_index(drop=True)
    )

    players = df["player_name"].astype(str).tolist()
    x = np.arange(len(df), dtype=float)

    series_info: List[Tuple[str, str, str]] = [("Offensive Errors", "atk_error", "red")]
    if show_bad:
        series_info.append(("Bad Attacks", "atk_bad", "purple"))
    if show_good:
        series_info.append(("Good Attacks", "atk_good", "lightgreen"))
    series_info += [("Kills", "atk_kill", "green"), ("Total Attacks", "atk_total", "royalblue")]

    n = len(series_info)
    group_w = 0.8
    bar_w = group_w / n
    offsets = [(i - (n - 1) / 2.0) * bar_w for i in range(n)]

    fig = Figure(figsize=(14, 7), dpi=120)
    ax1 = fig.add_subplot(111)
    ax2 = ax1.twinx()

    # Bars
    for (label, col, color), off in zip(series_info, offsets):
        bars = ax1.bar(x + off, df[col].to_numpy(), bar_w, color=color, label=f"Avg {label}")
        # annotate each bar
        for bar in bars:
            h = float(bar.get_height())
            if h > 0:
                ax1.text(
                    bar.get_x() + bar.get_width() / 2,
                    h / 2,
                    f"{h:.1f}",
                    ha="center",
                    va="center",
                    bbox=dict(facecolor="white", edgecolor="black", boxstyle="round,pad=0.3"),
                )

    ax1.set_ylabel("Attacks", fontsize=12)

    # Accuracy line
    ax2.plot(
        x,
        df["atk_accuracy"].to_numpy(),
        marker="o",
        linestyle="-",
        linewidth=3,
        color="pink",
        label="Hitting Percentage",
    )
    ax2.set_ylim(-1.0, 1.0)
    ax2.set_ylabel("Hitting Percentage (HP)", fontsize=12)
    ax2.axhline(0, color="gray", linestyle="--", linewidth=1)

    for val, clr, lbl in [(0.4, "blue", "Excellent HP"),
                          (0.3, "green", "Great HP"),
                          (0.2, "orange", "Good HP")]:
        ax2.axhline(y=val, color=clr, linestyle="--", linewidth=1, label=lbl)

    ax1.set_xticks(x)
    ax1.set_xticklabels(players, fontsize=12)
    ax1.set_title(f"{player_name} Offense Metrics", fontsize=16, pad=10)

    # Annotate accuracy points
    for xi, acc in zip(x, df["atk_accuracy"].to_numpy()):
        ax2.text(
            float(xi),
            float(acc),
            f"{acc:.3f}",
            ha="center",
            va="bottom",
            color="black",
            bbox=dict(facecolor="lavenderblush", edgecolor="black", boxstyle="round,pad=0.3"),
        )

    # Legend - PROPERLY SPACED TO AVOID SECONDARY AXIS
    h1, l1 = ax1.get_legend_handles_labels()
    h2, l2 = ax2.get_legend_handles_labels()
    fig.subplots_adjust(right=0.65)  # More space for legend
    ax1.legend(
        h1 + h2, l1 + l2,
        loc="upper left", bbox_to_anchor=(1.05, 1),  # Further right to avoid secondary axis
        borderaxespad=0.5, fontsize=9, frameon=True
    )

    fig.tight_layout(rect=(0, 0, 0.92, 0.95))  # Adjusted for legend space
    return fig


def plot_receive_performance(
    df: pd.DataFrame,
    player_name: str,
    exclude_players: Optional[List[str]] = None,
) -> Figure:
    """
    Plot serve-receive performance.

    Expects columns:
    'player_name', 'rcv_error', 'rcv_bad', 'rcv_good', 'rcv_perfect', 'rcv_total', 'rcv_accuracy'
    """
    if exclude_players is not None and (
        not isinstance(exclude_players, list) or not all(isinstance(p, str) for p in exclude_players)
    ):
        raise ValueError("exclude_players must be a list of strings or None")
    if not isinstance(player_name, str):
        raise ValueError("player_name must be a string")

    exclude = exclude_players or []
    df = (
        df.sort_values("rcv_accuracy", ascending=False)
          .query("player_name not in @exclude")
          .reset_index(drop=True)
    )

    players = list(map(str, df["player_name"].astype(str).tolist()))
    x = np.arange(len(df), dtype=float)
    bar_w = 0.15
    offsets = np.array([-2, -1, 0, 1, 2], dtype=float) * bar_w

    fig = Figure(figsize=(14, 7), dpi=120)
    ax1 = fig.add_subplot(111)
    ax2 = ax1.twinx()

    # Primary bars
    cols = ["rcv_error", "rcv_bad", "rcv_good", "rcv_perfect", "rcv_total"]
    colors = ["red", "purple", "lightgreen", "green", "royalblue"]
    labels = ["Receive Errors", "Bad Passes", "Good Passes", "Perfect Passes", "Total Receives"]

    for off, col, color, label in zip(offsets, cols, colors, labels):
        bars = ax1.bar(x + off, df[col].to_numpy(), bar_w, color=color, label=label)
        for bar in bars:
            h = float(bar.get_height())
            if h > 0:
                ax1.text(
                    bar.get_x() + bar.get_width() / 2,
                    h / 2,
                    str(int(h)),
                    ha="center",
                    va="center",
                    bbox=dict(facecolor="white", edgecolor="black", boxstyle="round,pad=0.3"),
                )

    ax1.set_ylabel("Passes", fontsize=12)

    # Accuracy line
    acc_pct = (df["rcv_accuracy"].to_numpy() * 100.0).astype(float)
    ax2.plot(x, acc_pct, marker="o", color="orange", linestyle="-", linewidth=3, label="Receive Accuracy (%)")
    ax2.set_ylim(0, 100)
    ax2.set_ylabel("Receive Accuracy (%)", fontsize=12)

    ax1.set_xticks(x)
    ax1.set_xticklabels(players, fontsize=12)
    ax1.set_title(f"{player_name} Serve-Receive Performance", fontsize=16, pad=20)

    # Annotate accuracy points
    for xi, acc in zip(x, acc_pct):
        ax2.text(
            float(xi), float(acc), f"{acc:.1f}%",
            ha="center", va="bottom", color="black",
            bbox=dict(facecolor="peachpuff", edgecolor="black", boxstyle="round,pad=0.3"),
        )

    # Legend - PROPERLY SPACED TO AVOID SECONDARY AXIS
    h1, l1 = ax1.get_legend_handles_labels()
    h2, l2 = ax2.get_legend_handles_labels()
    fig.subplots_adjust(right=0.65)  # More space for legend
    ax1.legend(
        h1 + h2, l1 + l2,
        loc="upper left", bbox_to_anchor=(1.05, 1),  # Further right to avoid secondary axis
        fontsize=9, frameon=True
    )

    fig.tight_layout(rect=(0, 0, 0.92, 0.95))  # Adjusted for legend space
    return fig


def plot_service_metrics(
        df: pd.DataFrame,
        player_name: str
    ) -> Figure:
    """
    Plot service metrics per player: errors, aces, total serves as bars, and serve accuracy (%) as a line.

    Expects columns:
    'player_name', 'srv_error', 'srv_ace', 'srv_total', 'srv_accuracy'
    """
    if not isinstance(player_name, str):
        raise ValueError("player_name must be a string")

    df_sort = df.sort_values("srv_accuracy", ascending=False).reset_index(drop=True)
    players = list(map(str, df_sort["player_name"].astype(str).tolist()))
    x = np.arange(len(df_sort), dtype=float)

    group_w = 0.8
    n_bars = 3
    bar_w = group_w / n_bars
    offsets = [(i - (n_bars - 1) / 2.0) * bar_w for i in range(n_bars)]

    fig = Figure(figsize=(14, 7), dpi=120)
    ax1 = fig.add_subplot(111)
    ax2 = ax1.twinx()

    # Bars
    bars_err = ax1.bar(x + offsets[0], df_sort["srv_error"].to_numpy(), bar_w, color="red",       label="Service Errors")
    bars_ace = ax1.bar(x + offsets[1], df_sort["srv_ace"].to_numpy(),   bar_w, color="green",     label="Service Aces")
    bars_tot = ax1.bar(x + offsets[2], df_sort["srv_total"].to_numpy(), bar_w, color="royalblue", label="Total Serves")

    ax1.set_ylabel("Serves", fontsize=12)
    ax1.set_xticks(x)
    ax1.set_xticklabels(players, fontsize=12)

    # Accuracy line
    acc_pct = (df_sort["srv_accuracy"].to_numpy() * 100.0).astype(float)
    ax2.plot(x, acc_pct, marker="o", linestyle="-", linewidth=3, color="orange", label="Serve Accuracy (%)")
    ax2.set_ylim(0, 110)
    ax2.set_ylabel("Serve Accuracy (%)", fontsize=12)

    ax1.set_title(f"{player_name} Service Metrics", fontsize=16, pad=20)

    # Annotate bars
    for bars in (bars_err, bars_ace, bars_tot):
        for bar in bars:
            h = float(bar.get_height())
            if h > 0:
                ax1.text(
                    bar.get_x() + bar.get_width() / 2,
                    h / 2,
                    str(int(h)),
                    ha="center",
                    va="center",
                    bbox=dict(facecolor="white", edgecolor="black", boxstyle="round,pad=0.3"),
                )

    # Annotate accuracy points
    for xi, acc in zip(x, acc_pct):
        ax2.text(
            float(xi), float(acc), f"{acc:.1f}%",
            ha="center", va="bottom", color="black",
            bbox=dict(facecolor="peachpuff", edgecolor="black", boxstyle="round,pad=0.3"),
        )

    # Legend - PROPERLY SPACED TO AVOID SECONDARY AXIS
    h1, l1 = ax1.get_legend_handles_labels()
    h2, l2 = ax2.get_legend_handles_labels()
    fig.subplots_adjust(right=0.65)  # More space for legend
    ax1.legend(
        h1 + h2, l1 + l2,
        loc="upper left", bbox_to_anchor=(1.05, 1),  # Further right to avoid secondary axis
        fontsize=9, frameon=True
    )

    fig.tight_layout(rect=(0, 0, 0.92, 0.95))  # Adjusted for legend space
    return fig

