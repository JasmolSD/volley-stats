from __future__ import annotations
from typing import List, Optional
import matplotlib
# Non-GUI backend for servers/workers
matplotlib.use("Agg", force=True)

import pandas as pd
import numpy as np
from matplotlib.figure import Figure
from matplotlib.dates import DateFormatter
import matplotlib.ticker as mtick
from matplotlib.container import BarContainer
from matplotlib.patches import Rectangle
import seaborn as sns


# --- Temporal Plots ---
def plot_avg_errors(team_overall: pd.DataFrame, player_name: str) -> Figure:
    """
    Return a Figure: average error rates per set over time.

    Requires columns: 'date','avg_srv_errors','avg_rcv_errors','avg_atk_errors',
                      'avg_blk_errors','avg_def_errors','avg_tot_errors'
    """
    if not isinstance(player_name, str):
        raise ValueError("player_name must be a string")

    df = team_overall.copy()
    df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")

    fig = Figure(figsize=(12, 6), dpi=120)
    ax = fig.add_subplot(111)

    sns.lineplot(x="date", y="avg_srv_errors",  data=df, marker="o", color="orange",
                 label="Avg Service Errors", ax=ax)
    sns.lineplot(x="date", y="avg_rcv_errors",  data=df, marker="s", color="green",
                 label="Avg Serve-Receive Errors", ax=ax)
    sns.lineplot(x="date", y="avg_atk_errors",  data=df, marker="D", color="royalblue",
                 label="Avg Offensive Errors", ax=ax)
    sns.lineplot(x="date", y="avg_blk_errors",  data=df, marker="^", color="red",
                 label="Avg Block Errors", ax=ax)
    sns.lineplot(x="date", y="avg_def_errors",  data=df, marker="h", color="gold",
                 label="Avg Defensive Errors", ax=ax)
    sns.lineplot(x="date", y="avg_tot_errors",  data=df, marker="X", color="purple",
                 label="Avg Total Errors", ax=ax)

    # Dynamic error goal depending on team/player
    if player_name.lower() == "team":
        error_goal = 6
    else:
        error_goal = 1

    ax.axhline(y=error_goal, color="mediumpurple", linestyle="--", linewidth=2, label="Avg Total Errors Goal")

    for series, fmt in [
        ("avg_srv_errors", "{:.1f}"),
        ("avg_rcv_errors", "{:.1f}"),
        ("avg_atk_errors", "{:.1f}"),
        ("avg_tot_errors", "{:.1f}"),
        ("avg_blk_errors", "{:.1f}"),
        ("avg_def_errors", "{:.1f}"),
    ]:
        for x_val, y_val in zip(df["date"].to_numpy(), df[series].to_numpy()):
            ax.annotate(
                fmt.format(float(y_val)),
                xy=(x_val, float(y_val)),
                xytext=(-10, 3),
                textcoords="offset points",
                ha="center",
                va="bottom",
                fontsize=8,
                bbox=dict(facecolor="white", edgecolor="black", boxstyle="round,pad=0.2"),
            )

    ticks = sorted(df["date"].unique().tolist())
    ax.set_xticks(ticks)
    ax.set_xticklabels(ticks)

    ax.set_xlabel("Date", fontsize=12)
    ax.set_ylabel("Errors Count", fontsize=12)
    ax.set_title(f"{player_name} Error Breakdown Per Set", fontsize=16)
    
    # Legend - NO SECONDARY AXIS, so standard positioning
    fig.subplots_adjust(right=0.75)
    ax.legend(loc="upper left", bbox_to_anchor=(1.02, 1), fontsize=9, frameon=True)

    fig.tight_layout(rect=(0, 0, 0.90, 0.95))
    return fig

def plot_service_temporal(team_overall: pd.DataFrame, player_name: str) -> Figure:
    """
    Return a Figure: avg service errors/aces/total (bars) + cumulative accuracy line.
    Requires: 'date','avg_srv_errors','avg_srv_ace','avg_total_serves','srv_accuracy'
    """
    assert isinstance(team_overall, pd.DataFrame), "team_overall must be a pandas DataFrame"
    required = ["date", "avg_srv_errors", "avg_srv_ace", "avg_total_serves", "srv_accuracy"]
    missing = [c for c in required if c not in team_overall.columns]
    assert not missing, f"team_overall is missing columns: {missing}"
    if player_name is not None:
        assert isinstance(player_name, str), "player_name must be a string or None"

    df = team_overall.copy()
    df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")

    x = np.arange(len(df), dtype=float)
    bar_w = 0.2

    fig = Figure(figsize=(14, 7), dpi=120)
    ax1 = fig.add_subplot(111)
    ax2 = ax1.twinx()

    bars_err = ax1.bar(x - bar_w, df["avg_srv_errors"].to_numpy(), bar_w, color="red", label="Avg Service Errors")
    bars_ace = ax1.bar(x,          df["avg_srv_ace"].to_numpy(),    bar_w, color="green", label="Avg Service Aces")
    bars_tot = ax1.bar(x + bar_w,  df["avg_total_serves"].to_numpy(), bar_w, color="royalblue", label="Avg Total Serves")
    ax1.set_ylabel("Average Serves", fontsize=12)

    ax2.plot(x, (df["srv_accuracy"].to_numpy() * 100.0), marker="o", linestyle="-", linewidth=3,
             color="orange", label="Cumulative Serving Accuracy (%)")
    ax2.set_ylim(0, 110)
    ax2.set_ylabel("Serving Accuracy (%)", fontsize=12)

    ax1.set_xticks(x)
    ax1.set_xticklabels(df["date"].tolist(), fontsize=12)
    title = "Service Statistics Per Set"
    if player_name:
        title = f"{player_name} {title}"
    ax1.set_title(title, fontsize=16, pad=40)

    for bar in [*bars_err, *bars_ace, *bars_tot]:
        h = float(bar.get_height())
        if h > 0:
            ax1.text(bar.get_x() + bar.get_width() / 2, h / 2, f"{h:.1f}",
                     ha="center", va="center",
                     bbox=dict(facecolor="white", edgecolor="black", boxstyle="round,pad=0.3"))

    for xi, acc in zip(x, (df["srv_accuracy"].to_numpy() * 100.0)):
        ax2.text(float(xi), float(acc), f"{acc:.1f}%",
                 ha="center", va="bottom",
                 bbox=dict(facecolor="white", edgecolor="black", boxstyle="round,pad=0.3"))

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

def plot_receive_temporal(team_overall: pd.DataFrame, player_name: str) -> Figure:
    """
    Return a Figure: avg rcv bars + cumulative serve-receive accuracy line.
    Requires: 'date','avg_rcv_errors','avg_rcv_bad','avg_rcv_good',
              'avg_rcv_perfect','avg_total_rcv','rcv_accuracy'
    """
    assert isinstance(team_overall, pd.DataFrame), "team_overall must be a pandas DataFrame"
    req = ["date","avg_rcv_errors","avg_rcv_bad","avg_rcv_good","avg_rcv_perfect","avg_total_rcv","rcv_accuracy"]
    missing = [c for c in req if c not in team_overall.columns]
    assert not missing, f"Missing columns in team_overall: {missing}"
    if player_name is not None:
        assert isinstance(player_name, str), "player_name must be a string"

    df = team_overall.copy()
    df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")

    n = 5
    group_w = 0.8
    bar_w = group_w / n
    x = np.arange(len(df), dtype=float)
    offsets = np.array([(i - (n - 1) / 2) * bar_w for i in range(n)], dtype=float)

    fig = Figure(figsize=(14, 7), dpi=120)
    ax1 = fig.add_subplot(111)
    ax2 = ax1.twinx()

    bars_err  = ax1.bar(x + offsets[0], df["avg_rcv_errors"].to_numpy(),  bar_w, color="red",        label="Avg Receive Errors")
    bars_bad  = ax1.bar(x + offsets[1], df["avg_rcv_bad"].to_numpy(),     bar_w, color="purple",     label="Avg Bad Passes")
    bars_good = ax1.bar(x + offsets[2], df["avg_rcv_good"].to_numpy(),    bar_w, color="lightgreen", label="Avg Good Passes")
    bars_perf = ax1.bar(x + offsets[3], df["avg_rcv_perfect"].to_numpy(), bar_w, color="green",      label="Avg Perfect Passes")
    bars_tot  = ax1.bar(x + offsets[4], df["avg_total_rcv"].to_numpy(),   bar_w, color="royalblue",  label="Avg Total Receives")
    ax1.set_ylabel("Passes per Set", fontsize=12)

    ax2.plot(x, (df["rcv_accuracy"].to_numpy() * 100.0), marker="o", linestyle="-", linewidth=3,
             color="orange", label="Serve-Receive Accuracy (%)")
    ax2.set_ylim(0, 110)
    ax2.set_ylabel("Serve-Receive Accuracy (%)", fontsize=12)

    ax1.set_xticks(x)
    ax1.set_xticklabels(df["date"].tolist(), fontsize=12)
    title = "Serve-Receive Statistics Per Set"
    if player_name:
        title = f"{player_name} {title}"
    ax1.set_title(title, fontsize=16, pad=60)

    for bars in (bars_err, bars_bad, bars_good, bars_perf, bars_tot):
        for bar in bars:
            h = float(bar.get_height())
            if h > 0:
                ax1.text(bar.get_x() + bar.get_width() / 2, h / 2, f"{h:.1f}",
                         ha="center", va="center",
                         bbox=dict(facecolor="white", edgecolor="black", boxstyle="round,pad=0.3"))

    for xi, acc in zip(x, (df["rcv_accuracy"].to_numpy() * 100.0)):
        ax2.text(float(xi), float(acc), f"{acc:.1f}%",
                 ha="center", va="bottom",
                 bbox=dict(facecolor="white", edgecolor="black", boxstyle="round,pad=0.3"))

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

def plot_offensive_temporal(
    team_overall: pd.DataFrame,
    player_name: Optional[str] = None,
    show_bad: bool = False,
    show_good: bool = False
) -> Figure:
    """
    Return a Figure: avg offensive bars + cumulative hitting accuracy line.
    Requires: 'date','avg_atk_errors','avg_atk_bad','avg_atk_good',
              'avg_kills','avg_total_atk','atk_accuracy'
    """
    assert isinstance(team_overall, pd.DataFrame), "team_overall must be a pandas DataFrame"
    req = ["date","avg_atk_errors","avg_atk_bad","avg_atk_good","avg_kills","avg_total_atk","atk_accuracy"]
    missing = [c for c in req if c not in team_overall.columns]
    assert not missing, f"team_overall missing columns: {missing}"
    if player_name is not None:
        assert isinstance(player_name, str), "player_name must be a string"

    df = team_overall.copy()
    df["date"] = pd.to_datetime(df["date"])
    df.sort_values("date", inplace=True)
    dates = df["date"].dt.strftime("%Y-%m-%d").tolist()

    series_info = [
        ("avg_atk_errors", "Avg Offensive Errors", "red", True),
        ("avg_atk_bad",    "Avg Bad Attacks",      "purple", show_bad),
        ("avg_atk_good",   "Avg Good Attacks",     "lightgreen", show_good),
        ("avg_kills",      "Avg Kills",            "green", True),
        ("avg_total_atk",  "Avg Total Attacks",    "royalblue", True),
    ]
    active = [(col, label, color) for col, label, color, flag in series_info if flag]
    n = len(active)
    group_w = 0.8
    bar_w = group_w / max(n, 1)
    offsets = np.array([(i - (n - 1) / 2) * bar_w for i in range(n)], dtype=float)
    x = np.arange(len(df), dtype=float)

    fig = Figure(figsize=(14, 7), dpi=120)
    ax1 = fig.add_subplot(111)
    ax2 = ax1.twinx()

    # Collect bar containers so their patches are typed as Rectangles
    bar_containers: list[BarContainer] = []
    for (col, label, color), off in zip(active, offsets):
        cont = ax1.bar(x + off, df[col].to_numpy(), bar_w, color=color, label=label)
        bar_containers.append(cont)
    ax1.set_ylabel("Attacks per Set", fontsize=12)

    ax2.plot(x, df["atk_accuracy"].to_numpy(), marker="o", linestyle="-", linewidth=3,
             color="pink", label="Hitting Percentage")
    ax2.set_ylim(-1, 1)
    ax2.set_ylabel("Hitting Percentage (HP)", fontsize=12)
    ax2.axhline(y=0, color="gray", linestyle="--")

    for yval, clr, lbl in [(0.4, "blue", "Excellent HP"),
                           (0.3, "green", "Great HP"),
                           (0.2, "orange", "Good HP")]:
        ax2.axhline(y=yval, color=clr, linestyle="--", linewidth=1, label=lbl)

    ax1.set_xticks(x)
    ax1.set_xticklabels(dates, fontsize=12)
    title = "Offense Stats by Set"
    if player_name:
        title = f"{player_name} {title}"
    ax1.set_title(title, fontsize=16, pad=10)

    # ✅ Safely annotate bars (typed as Rectangle)
    for cont in bar_containers:
        for rect in cont.patches:
            if isinstance(rect, Rectangle):
                h = float(rect.get_height())
                if h > 0:
                    ax1.text(
                        rect.get_x() + rect.get_width() / 2.0,
                        h / 2.0,
                        f"{h:.1f}",
                        ha="center",
                        va="center",
                        bbox=dict(facecolor="white", edgecolor="black", boxstyle="round,pad=0.3"),
                    )

    for xi, val in zip(x, df["atk_accuracy"].to_numpy()):
        ax2.text(float(xi), float(val), f"{val:.3f}",
                 ha="center", va="bottom",
                 bbox=dict(facecolor="lavenderblush", edgecolor="black", boxstyle="round,pad=0.3"))

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

def plot_attack_accuracy(
    df: pd.DataFrame,
    player_name: str,
    exclude_players: Optional[List[str]] = None
) -> Figure:
    """
    Return a Figure: atk_accuracy over time by player.
    Requires: 'player_name','date','atk_accuracy'
    """
    if not isinstance(player_name, str):
        raise ValueError("player_name must be a string")
    if exclude_players is not None and (
        not isinstance(exclude_players, list) or not all(isinstance(p, str) for p in exclude_players)
    ):
        raise ValueError("exclude_players must be a list of strings or None")

    exclude = exclude_players or []
    df = (
        df.sort_values(by="date")
          .query("player_name not in @exclude")
          .reset_index(drop=True)
    )

    fig = Figure(figsize=(12, 6), dpi=120)
    ax = fig.add_subplot(111)

    for player in sorted(df["player_name"].unique()):
        data = df[df["player_name"] == player]
        ax.plot(
            data["date"].to_numpy(),
            data["atk_accuracy"].to_numpy(),
            marker="o",
            linewidth=2,
            label=str(player),
        )
        for x_val, y_val in zip(data["date"].to_numpy(), data["atk_accuracy"].to_numpy()):
            ax.annotate(
                f"{float(y_val):.2f}",
                xy=(x_val, float(y_val)),
                xytext=(0, 5),
                textcoords="offset points",
                ha="center",
                va="bottom",
                fontsize=9,
                bbox=dict(facecolor="white", edgecolor="black", boxstyle="round,pad=0.2"),
            )

    ax.axhline(0, color="gray", linestyle="--", linewidth=1)
    for y, c, lbl in [(0.4, "blue", "Excellent"), (0.3, "green", "Great"), (0.2, "orange", "Good")]:
        ax.axhline(y=y, color=c, linestyle="--", linewidth=1, label=lbl)

    ticks = sorted(df["date"].unique().tolist())
    ax.set_xticks(ticks)
    ax.set_xticklabels(ticks, rotation=45, ha="right", fontsize=12)

    ax.set_ylabel("Hitting Percentage")
    ax.set_title(f"{player_name} Hitting Percentage Over Time")
    
    # Legend - NO SECONDARY AXIS, so standard positioning
    fig.subplots_adjust(right=0.75)
    ax.legend(
        title="Player", 
        bbox_to_anchor=(1.02, 1), 
        loc="upper left",
        fontsize=9, 
        frameon=True
    )
    ax.xaxis.set_major_formatter(DateFormatter("%Y-%m-%d"))

    fig.tight_layout(rect=(0, 0, 0.90, 0.95))
    return fig

def plot_player_errors(df: pd.DataFrame, player_name: str) -> Figure:
    """
    Return a Figure: average total errors over time for each player.
    Requires: 'player_name','date','avg_tot_errors'
    """
    d = df.copy().sort_values("date")

    fig = Figure(figsize=(12, 6), dpi=120)
    ax = fig.add_subplot(111)

    for player in sorted(d["player_name"].unique()):
        data = d[d["player_name"] == player]
        ax.plot(
            data["date"].to_numpy(),
            data["avg_tot_errors"].to_numpy(),
            marker="o",
            linewidth=2,
            label=str(player),
        )
        for x_val, y_val in zip(data["date"].to_numpy(), data["avg_tot_errors"].to_numpy()):
            ax.annotate(
                f"{float(y_val):.2f}",
                xy=(x_val, float(y_val)),
                xytext=(-10, 3),
                textcoords="offset points",
                ha="center",
                va="bottom",
                fontsize=9,
                bbox=dict(facecolor="white", edgecolor="black", boxstyle="round,pad=0.2"),
            )

    ax.axhline(y=1, color="blue", linestyle="--", linewidth=1, label="Goal")

    ticks = sorted(d["date"].unique().tolist())
    ax.set_xticks(ticks)
    ax.set_xticklabels(ticks, rotation=45, ha="right", fontsize=12)

    ax.set_ylabel("Average Total Errors")
    ax.set_title(f"{player_name} Average Cumulative Errors Per Set Over Time")
    
    # Legend - NO SECONDARY AXIS, so standard positioning
    fig.subplots_adjust(right=0.75)
    ax.legend(
        title="Player", 
        bbox_to_anchor=(1.02, 1), 
        loc="upper left",
        fontsize=9, 
        frameon=True
    )
    ax.xaxis.set_major_formatter(DateFormatter("%Y-%m-%d"))

    fig.tight_layout(rect=(0, 0, 0.90, 0.95))
    return fig


def plot_assists_per_attack(
    df_player_date: pd.DataFrame,
    team_overall: pd.DataFrame,
    position: Optional[str] = None,
    player_name: Optional[str] = None
) -> Figure:
    """
    Return a Figure: assists per attack (%) over time with team total attacks bars.

    df_player_date requires: 'player_name','date','position','assists'
    team_overall   requires: 'date','atk_total'
    """
    for col in ["player_name", "date", "position", "assists"]:
        assert col in df_player_date.columns, f"df_player_date missing '{col}'"
    for col in ["date", "atk_total"]:
        assert col in team_overall.columns, f"team_overall missing '{col}'"

    valid_positions = ["setter", "middle", "outside", "opposite"]
    pos = position.lower().strip() if position else None
    if pos and pos not in valid_positions:
        raise ValueError("Invalid position. Use one of: 'setter','middle','outside','opposite'.")

    player_list = sorted(df_player_date["player_name"].unique())
    pname = player_name.lower().strip() if player_name else None
    if pname and pname not in [p.lower() for p in player_list]:
        raise ValueError(f"Player '{player_name}' not found. Choose from: {player_list}")

    df = df_player_date.copy()
    if pos:
        df = df[df["position"].str.lower() == pos]
    if pname:
        df = df[df["player_name"].str.lower() == pname]

    df["date"] = pd.to_datetime(df["date"])
    team = team_overall.copy()
    team["date"] = pd.to_datetime(team["date"])

    merged = pd.merge(df, team, on="date", how="left")
    merged["assists_x"] = merged["assists_x"].replace(0, np.nan)
    merged = merged.dropna(subset=["assists_x"])
    merged["assists_per_attack"] = merged["assists_x"] / merged["atk_total_y"]

    merged.sort_values("date", inplace=True)
    dates = merged["date"].to_numpy()
    total_attacks = merged["atk_total_y"].to_numpy()

    fig = Figure(figsize=(12, 6), dpi=120)
    ax1 = fig.add_subplot(111)

    bars = ax1.bar(dates, total_attacks, width=2, color="lightgray", label="Total Attacks")
    ax1.set_ylabel("Total Attacks", fontsize=12)
    ax1.set_xticks(dates)
    ax1.xaxis.set_major_formatter(DateFormatter("%Y-%m-%d"))

    for bar in bars:
        h = float(bar.get_height())
        ax1.text(
            bar.get_x() + bar.get_width() / 2,
            h / 2,
            f"{int(round(h))}",
            ha="center",
            va="center",
            fontsize=8,
            bbox=dict(facecolor="white", edgecolor="black", boxstyle="round,pad=0.2"),
        )

    ax2 = ax1.twinx()
    ax2.set_ylabel("Assists per Attack (%)")
    ax2.yaxis.set_major_formatter(mtick.PercentFormatter(1.0))
    ax2.set_ylim(0, 1)

    for player in merged["player_name"].unique():
        pdata = merged[merged["player_name"] == player]
        ax2.plot(
            pdata["date"].to_numpy(),
            pdata["assists_per_attack"].to_numpy(),
            marker="o",
            linewidth=2,
            label=f"{str(player)} (Assist Pct)",
        )
        for x, y in zip(pdata["date"].to_numpy(), pdata["assists_per_attack"].to_numpy()):
            ax2.annotate(
                f"{float(y):.1%}",
                xy=(x, float(y)),
                xytext=(0, 5),
                textcoords="offset points",
                ha="center",
                va="bottom",
                fontsize=8,
                bbox=dict(facecolor="azure", edgecolor="black", boxstyle="round,pad=0.2"),
            )

    title = "Assists per Attack and Total Attacks Over Time"
    if position or player_name:
        filt = []
        if position:
            filt.append(position.title())
        if player_name:
            filt.append(player_name)
        title += " (" + ", ".join(filt) + ")"
    ax1.set_title(title, fontsize=16, pad=20)

    # Legend - PROPERLY SPACED TO AVOID SECONDARY AXIS
    h1, l1 = ax1.get_legend_handles_labels()
    h2, l2 = ax2.get_legend_handles_labels()
    fig.subplots_adjust(right=0.65)  # More space for legend
    ax1.legend(
        h1 + h2, l1 + l2, 
        loc="upper left", bbox_to_anchor=(1.05, 1),  # Further right to avoid secondary axis
        fontsize=9, 
        frameon=True
    )

    fig.tight_layout(rect=(0, 0, 0.92, 0.95))  # Adjusted for legend space
    return fig