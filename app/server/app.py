# app.py
from __future__ import annotations
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os, uuid, pandas as pd
from typing import cast, TypedDict, Literal
from types_common import PlotKind, UISummary, Meta
from pathlib import Path

# Additional Functions
from services.io_loader import load_dataframe
from services.profiling import profile_dataframe
from services.plotting import generate_plots, render_plot
from services.agents import generate_commentary
from services.utils.cleanup import purge_dirs
from services.analysis import (
    # read_tablelike,
    # load_and_summarize_csv,   # if you use it elsewhere
    preprocess_dataframe,
    add_accuracy_metrics,
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

def _get_or_build_ui_summary(token: str) -> UISummary:
    rs = RUN_CACHE.get(token)
    if not rs:
        return {"rows": 0, "players": [], "date_min": "—", "date_max": "—"}
    if rs.get("ui_summary"):
        return rs["ui_summary"]
    ui = compute_summary(rs["df"])          # ← one call, consistent
    rs["ui_summary"] = ui                   # cache for next time
    return ui

def normalize_kind(s: str | None) -> PlotKind:
    if s in ("offense", "service", "receive"):
        return cast(PlotKind, s)
    return "offense"

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
    # Deriving additoinal metrics
    try:
        df = preprocess_dataframe(df)
        df = add_accuracy_metrics(df)
    except Exception as e:
        return jsonify({"error": f"failed to compute metrics: {e}", "have": list(df.columns)}), 400

    print("Finished processing data!")

    # Optional deep profile (toggle via ?profile=1)
    do_profile = request.args.get("profile") in ("1", "true", "yes")
    _profile = profile_dataframe(df) if do_profile else {}

    # this is what your React SummaryCards expects:
    ui_summary: UISummary = compute_summary(df)

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

@app.route("/api/summary", methods=["GET"])
def summary_api():
    token = request.args.get("token", "")
    rs = RUN_CACHE.get(token)
    if rs is None:
        return jsonify({"error": "Invalid token"}), 404
    return jsonify(_get_or_build_ui_summary(token))

@app.route("/api/plot", methods=["GET"])
def plot_endpoint():
    token = request.args.get("token", "")
    kind_s = request.args.get("kind", "offense")
    player = request.args.get("player")  # may be near-miss or empty
    mode_q = request.args.get("mode", "cumulative")  # default
    plot_mode: PlotMode = normalize_mode(mode_q)
    kind: PlotKind = normalize_kind(kind_s)

    rs = RUN_CACHE.get(str(token))
    if rs is None:
        # Keep the shape consistent for the client
        return jsonify({"image": "", "used_player": "", "error": "unknown token"}), 200

    df = rs["df"]

    try:
        filtered_df, used = resolve_player_name(df, player)
    except Exception as e:
        # Empty image, but surface the error so UI can notify
        return jsonify({"image": "", "used_player": "", "error": str(e)}), 200

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
    token = str(data.get("token"))
    # player = data.get("player")

    rs = RUN_CACHE.get(token)
    if rs is None:
        return jsonify({"commentary": "", "requests": []}), 200
    
    df = rs["df"]
    images = rs["images"]
    ui_summary = _get_or_build_ui_summary(token)  # ← no recompute
    meta:Meta = {
        "rows": ui_summary["rows"],
        "cols": int(df.shape[1]),
        "columns": list(df.columns)}

    # # Optional player-specific stats you might want to pass through
    # player_stats = None
    # if player and "player_name" in df.columns:
    #     sdf = df[df["player_name"].astype(str) == str(player)]
    #     if not sdf.empty:
    #         player_stats = {"rows": int(sdf.shape[0])}

    resp = generate_commentary(summary=ui_summary, meta=meta, images=images)

    # normalize both string or object return types
    if isinstance(resp, str):
        return jsonify({"commentary": resp, "requests": []})
    return jsonify({
        "commentary": getattr(resp, "commentary", ""),
        "requests": getattr(resp, "requests", [])}
    )

if __name__ == "__main__":
    # Change port if you like; 5001 is fine
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5001)))