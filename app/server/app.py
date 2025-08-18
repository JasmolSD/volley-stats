# app.py
from __future__ import annotations
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os, uuid, pandas as pd
from typing import cast, TypedDict, Literal, Dict, Any, Optional
from types_common import PlotKind, UISummary, Meta
from pathlib import Path

# Additional Functions
from services.io_loader import load_dataframe
from services.profiling import profile_dataframe
from services.plotting import generate_plots, render_plot
from services.agents import generate_commentary
from services.utils.cleanup import purge_dirs
from services.analysis import (
    preprocess_dataframe,
    compute_summary,
    resolve_player_name,
)

# Serve /static from server/static
app = Flask(__name__, static_folder="server/static", static_url_path="/static")
CORS(app)

# Identify temp directories
app.config['UPLOAD_FOLDER'] = 'server/tmp'
STATIC_DIR = Path(str(app.static_folder)).resolve()
UPLOADS_DIR = Path(app.config['UPLOAD_FOLDER']).resolve()

# Ensure dirs exist
for d in (STATIC_DIR, UPLOADS_DIR):
    d.mkdir(parents=True, exist_ok=True)

# Get LLM model
model_id = str(os.getenv("LLM_MODEL"))
hf_token = os.getenv("HUGGINGFACE_TOKEN")

# Plotting Modes
PlotMode = Literal["cumulative", "temporal"]

# Simple in-memory cache: run_id -> DataFrame
class RunState(TypedDict):
    df: pd.DataFrame
    images: list[dict[str, str]]  # e.g. {"url": "/static/<id>/offense.png", "caption": "..."}
    meta: Meta                    # optional, handy later
    ui_summary: UISummary

RUN_CACHE: dict[str, RunState] = {}

def _get_or_build_ui_summary(token: str, mode:PlotMode, player_name: Optional[str] = None) -> UISummary:
    """
    Returns a UISummary for the given token, optionally filtered by player_name.
    Caches results per (token, normalized player) to avoid recomputation.

    - If player_name is "all", "team", "all/team", or empty/None -> no filtering.
    - Maintains legacy rs["ui_summary"] for the unfiltered ("ALL") case.
    """
    rs = RUN_CACHE.get(token)

    # Strict default return (matches UISummary types)
    default_ui: UISummary = {
        "rows": 0,
        "players": [],
        "date_min": "—",
        "date_max": "—",
        "srv_accuracy": 0.0,
        "rcv_accuracy": 0.0,
        "atk_accuracy": 0.0,
        "avg_errors_per_set": 0.0,
    }

    if not rs:
        return default_ui

    # Normalize the requested player key
    name_raw = (player_name or "").strip()
    name_norm = name_raw.lower()
    is_all = (name_norm == "") or (name_norm in {"all", "team", "all/team"})
    cache_key = "__ALL__" if is_all else name_norm

    meta: Meta = cast(Meta, rs.get("meta") or {})
    cache: Dict[str, UISummary] = meta.get("ui_summary_cache") or {}
    # reattach in case we just created them
    meta["ui_summary_cache"] = cache
    rs["meta"] = meta

    # fast path: cache hit
    if cache_key in cache:
        return cache[cache_key]

    # legacy fast path for ALL
    if is_all and rs.get("ui_summary"):
        ui = rs["ui_summary"]
        cache[cache_key] = ui
        return ui

    df = rs.get("df")
    if df is None:
        return default_ui

    # compute (filtered when needed) and cache
    ui = compute_summary(df, mode=mode, player_name=None if is_all else name_raw)

    if is_all:
        rs["ui_summary"] = ui  # maintain legacy unfiltered cache

    cache[cache_key] = ui
    return ui

def normalize_kind(s: str | None) -> PlotKind:
    """Handle all plot types including temporal-specific ones"""
    valid_kinds = [
        # Base kinds (work for both cumulative and temporal)
        "offense", 
        "service", 
        "receive",
        # Temporal-only kinds
        "errors", 
        "atk_acc_over_time", 
        "avg_errors_over_time"
    ]
    
    if s and str(s).strip() in valid_kinds:
        return cast(PlotKind, str(s).strip())
    
    print(f"WARNING: Unknown plot kind '{s}', defaulting to 'offense'")
    return "offense"  # Default fallback

def normalize_mode(mode: str | None) -> PlotMode:
    return "temporal" if (mode or "").lower() == "temporal" else "cumulative"

@app.route("/")
def index():
    return jsonify({
        "message": "Volley Stats backend is running.",
        "health": "/api/health",
        "upload": "/api/upload"
    })

@app.route("/api/health")
def health():
    return {"status": "ok"}

@app.route("/api/upload", methods=["POST"])
def upload():
    # --- Purge old uploads/plots/caches before saving the new file ---
    # Keep any fixed assets you serve from /static (icon, pattern folder, etc.)
    keep_names = {".gitkeep", "volleyball.svg", "patterns"}  # add more if needed
    try:
        _purged = purge_dirs(
            dirs=[UPLOADS_DIR, STATIC_DIR],
            keep=keep_names
        )
    except Exception:
        _purged = 0  # fail-open; don't block upload

    # Clear in-memory cache for good measure
    try:
        RUN_CACHE.clear()
    except Exception:
        pass

    # print("Uploading File!")
    file = request.files.get("file")
    if not file:
        return jsonify({"error": "No file provided"}), 400

    filename = secure_filename(file.filename or "upload.csv")
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "csv"
    run_id = str(uuid.uuid4())[:8]
    tmp_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{run_id}.{ext}")
    file.save(tmp_path)

    # print("File Successfully Uploaded!\nReading as dataframe...")

    # Single read path (via services.io_loader if it normalizes meta) OR use read_tablelike directly.
    try:
        # If your loader also returns meta, keep it; else build a minimal one.
        df, meta = load_dataframe(tmp_path)  # <— trust this one source of truth
    except Exception as e:
        return jsonify({"error": f"failed to read file: {e}"}), 400

    # print("Data Loaded!")
    print(df)

    # print("Adding additional metrics...")
    # Deriving additional metrics
    try:
        df = preprocess_dataframe(df)
    except Exception as e:
        return jsonify({"error": f"failed to compute metrics: {e}", "have": list(df.columns)}), 400

    print("Finished processing data!")

    # Optional deep profile (toggle via ?profile=1)
    do_profile = request.args.get("profile") in ("1", "true", "yes")
    _profile = profile_dataframe(df) if do_profile else {}

    # this is what your React SummaryCards expects (base is cumulative):
    ui_summary: UISummary = compute_summary(df, player_name=None, mode="cumulative")

    # generate any static plot images your plotting module wants to write
    _images = generate_plots(df, out_dir=str(app.static_folder), run_id=run_id, summary=_profile)

    RUN_CACHE[run_id] = {
        "df": df,
        "images": _images,
        "meta": meta,
        "ui_summary": ui_summary,
        }

    print("Generating Commentary!")

    # commentary can live off the lightweight summary + meta
    commentary_text = generate_commentary(
        summary=ui_summary,
        meta=meta, 
        images=_images,
        model_id=model_id,
        hf_token=hf_token
    )

    return jsonify({
        "run_id": run_id,
        "summary": ui_summary,
        "meta": meta,
        "images": _images,
        "llm_commentary": commentary_text  # optional: your UI uses /api/commentary anyway
    })

@app.route("/api/players", methods=["GET"])
def players():
    token = request.args.get("token")
    query = request.args.get("q")  # optional player text for resolution

    rs = RUN_CACHE.get(str(token))
    if rs is None:
        return jsonify({"players": [], "resolved": None})

    df = rs["df"]

    players = (
        sorted(df["player_name"].dropna().astype(str).unique().tolist())
        if "player_name" in df.columns else []
    )

    resolved = None
    if query is not None:
        try:
            _, used = resolve_player_name(df, query)
            # when query is empty string, used == "" (means "all")
            resolved = {"original": query, "used_name": used, "exact": used.lower() == query.strip().lower() if used else False}
        except Exception as e:
            resolved = {"original": query, "error": str(e)}

    return jsonify({"players": players, "resolved": resolved})

def coerce_plot_mode(raw: str) -> PlotMode:
    r = (raw or "").strip().lower()
    if r == "temporal":
        return "temporal"   # valid PlotMode
    return "cumulative"      # default/fallback (also valid)

@app.route("/api/summary", methods=["GET"])
def summary_api():
    token  = (request.args.get("token", "") or "").strip()
    player = (request.args.get("player", "") or "").strip()   # "all" | "team" | specific name
    mode: PlotMode = coerce_plot_mode(request.args.get("mode", ""))    # "offense" | "service" | "receive" | ""

    rs = RUN_CACHE.get(token)
    if rs is None:
        return jsonify({"error": "Invalid token"}), 404

    # _get_or_build_ui_summary should implement per-(player,mode) caching as shown earlier
    ui = _get_or_build_ui_summary(token, player_name=player, mode=mode)
    return jsonify(ui)

@app.route("/api/plot", methods=["GET"])
def plot_endpoint():
    token = request.args.get("token", "")
    kind_s = request.args.get("kind", "offense")
    player = request.args.get("player")
    mode_q = request.args.get("mode", "cumulative")
    
    print(f"DEBUG /api/plot: kind_s='{kind_s}', mode_q='{mode_q}', player='{player}'")
    
    plot_mode: PlotMode = normalize_mode(mode_q)
    kind: PlotKind = normalize_kind(kind_s)
    
    print(f"DEBUG after normalize: kind='{kind}', plot_mode='{plot_mode}'")
    
    rs = RUN_CACHE.get(str(token))
    if rs is None:
        return jsonify({"image": "", "used_player": "", "error": "unknown token"}), 200

    df = rs["df"]

    try:
        filtered_df, used = resolve_player_name(df, player)
    except Exception as e:
        return jsonify({"image": "", "used_player": "", "error": str(e)}), 200

    print(f"DEBUG calling render_plot with: kind='{kind}', mode='{plot_mode}', player='{used}'")
    
    # Render returns raw base64 (no header)
    img_b64 = render_plot(
        filtered_df,
        kind=kind,
        player_name=used or None,
        mode=plot_mode,
    )

    # Add data URL prefix so <img src=...> works
    data_url = f"data:image/png;base64,{img_b64}" if img_b64 else ""

    return jsonify({"image": data_url, "used_player": used}), 200


@app.route("/api/commentary", methods=["POST"])
def commentary():
    data = (request.get_json() or {})
    token = str(data.get("token") or "")
    player = (data.get("player") or "").strip()
    mode:PlotMode   = coerce_plot_mode((data.get("mode") or "").strip())

    rs = RUN_CACHE.get(token)
    if rs is None:
        return jsonify({"commentary": "", "requests": []}), 200

    df = rs["df"]
    images = rs.get("images", [])

    # use new parameters: player + mode
    ui_summary = _get_or_build_ui_summary(token, player_name=player, mode=mode)

    meta: Meta = {
        "rows": ui_summary["rows"],
        "cols": int(df.shape[1]),
        "columns": list(df.columns),
    }

    resp = generate_commentary(summary=ui_summary, meta=meta, images=images)

    # normalize both string or object return types
    if isinstance(resp, str):
        return jsonify({"commentary": resp, "requests": []})
    return jsonify({
        "commentary": getattr(resp, "commentary", ""),
        "requests": getattr(resp, "requests", []),
    })


if __name__ == "__main__":
    # Change port if you like; 5001 is fine
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5001)))