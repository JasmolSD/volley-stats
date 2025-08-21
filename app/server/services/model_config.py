import os
from typing import Dict, Any, List, Optional, Tuple
from types_common import UISummary, Meta

#  Default model configurations
DEFAULT_TEXT_MODEL = "microsoft/phi-2"  # Open model, no license required
DEFAULT_VISION_MODEL = "Qwen/Qwen2.5-VL-7B-Instruct"  # Better default for vision

# Fallback models if primary fails
FALLBACK_TEXT_MODELS = [
    "microsoft/phi-2",
    "TinyLlama/TinyLlama-1.1B-Chat-v1.0",
    "HuggingFaceH4/zephyr-7b-beta",
]

FALLBACK_VISION_MODELS = [
    "google/gemma-3-4b-it",
    "microsoft/kosmos-2-patch14-224",  # Microsoft's open vision model
]

def get_model_configs():
    """
    Get model configurations with proper defaults and validation.
    Returns: (text_model_id, vision_model_id)
    """
    # Get environment variables
    text_model_id = os.getenv("TEXT_LLM", "").strip()
    vision_model_id = os.getenv("VISION_LLM", "").strip()
    
    # Handle text model
    if not text_model_id:
        print(f"ℹ️ No text model specified. Using default: {DEFAULT_TEXT_MODEL}")
        text_model_id = DEFAULT_TEXT_MODEL
    else:
        print(f"✓ Text model configured: {text_model_id}")
    
    # Handle vision model
    if not vision_model_id:
        print(f"ℹ️ No vision model specified. Using default: {DEFAULT_VISION_MODEL}")
        vision_model_id = DEFAULT_VISION_MODEL
    else:
        print(f"✓ Vision model configured: {vision_model_id}")
    
    return text_model_id, vision_model_id


def initialize_models():
    """Initialize models with proper error handling and fallbacks."""
    global _MODEL_TEXT, _MODEL_VISION
    
    # Get configurations
    text_model_id, vision_model_id = get_model_configs()
    
    # Load HuggingFace token
    hf_token = os.getenv("HUGGINGFACE_TOKEN", "").strip()
    
    if not hf_token:
        print("⚠️ WARNING: HUGGINGFACE_TOKEN not found!")
        print("  Some models may not be accessible without authentication.")
        print("  Set HUGGINGFACE_TOKEN in your .env file")
    else:
        print(f"✓ HuggingFace token loaded (length: {len(hf_token)})")
    
    # Store for use in endpoints
    _MODEL_TEXT = text_model_id
    _MODEL_VISION = vision_model_id
    
    return text_model_id, vision_model_id, hf_token


def validate_commentary_request(token: str, run_cache: Dict) -> Tuple[bool, Optional[Dict], Optional[str]]:
    """
    Validate a commentary request.
    Returns: (is_valid, run_state, error_message)
    """
    if not token:
        return False, None, "No token provided"
    
    rs = run_cache.get(token)
    if rs is None:
        return False, None, "Invalid or expired session token"
    
    return True, rs, None


def generate_plots_for_mode(
    df,
    player: str,
    mode: str,
    resolve_player_name_func,
    render_plot_func,
    normalize_kind_func
) -> Tuple[List[Dict], List[str], str]:
    """
    Generate all plots for the specified mode.
    Returns: (all_plots, failed_plots, used_player)
    """
    from typing import cast
    from types_common import PlotKind
    
    # Determine plot types based on mode
    if mode == "cumulative":
        plot_kinds: List[PlotKind] = ["offense", "service", "receive"]
    else:  # temporal
        plot_kinds: List[PlotKind] = ["offense", "service", "receive", "errors", "atk_acc_over_time", "avg_errors_over_time"]
    
    print(f"\n📊 Generating {len(plot_kinds)} plots for {mode} mode...")
    
    # Resolve player name
    filtered_df, used_player = resolve_player_name_func(df, player) if player else (df, "")
    
    all_plots = []
    failed_plots = []
    
    for kind in plot_kinds:
        try:
            img_b64 = render_plot_func(
                filtered_df,
                kind=normalize_kind_func(kind) if normalize_kind_func else kind,
                player_name=used_player or "Team",
                mode=mode
            )
            all_plots.append({
                "image": f"data:image/png;base64,{img_b64}",
                "kind": kind,
                "mode": mode,
                "used_player": used_player
            })
        except Exception as e:
            print(f"  ⚠️ Failed to generate {kind} plot: {e}")
            failed_plots.append(kind)
    
    print(f"  ✓ Successfully generated {len(all_plots)}/{len(plot_kinds)} plots")
    
    return all_plots, failed_plots, used_player


def generate_commentary_with_fallback(
    ui_summary: UISummary,
    meta: Meta,
    images: List,
    all_plots: List[Dict],
    text_model_id: str,
    vision_model_id: str,
    hf_token: str,
    generate_commentary_func,
    mode: str,
    used_player: str
) -> Tuple[Optional[str], Dict[str, Any]]:
    """
    Try to generate commentary with primary models, then fallbacks.
    Returns: (commentary_text, models_used)
    """
    print(f"\n🤖 Generating AI Commentary:")
    print(f"  📝 Text Model: {text_model_id}")
    print(f"  👁️ Vision Model: {vision_model_id}")
    print(f"  👤 Analysis for: {used_player or 'Team'}")
    print(f"  📈 Mode: {mode}")
    print(f"  📊 Analyzing: {len(all_plots)} plots")
    
    # Try primary models first
    try:
        commentary_text = generate_commentary_func(
            summary=ui_summary,
            meta=meta,
            images=images,
            plot_data=all_plots,
            vision_model_id=vision_model_id,
            text_model_id=text_model_id,
            hf_token=hf_token,
            max_new_tokens=1024
        )
        
        if commentary_text and commentary_text != "Commentary unavailable":
            print("  ✓ Commentary generated successfully")
            return commentary_text, {"text": text_model_id, "vision": vision_model_id}
        else:
            raise ValueError("Commentary generation returned empty or unavailable")
            
    except Exception as e:
        print(f"  ❌ Primary models failed: {str(e)[:100]}")
        
        # Try fallback models
        for fallback_text in FALLBACK_TEXT_MODELS:
            for fallback_vision in FALLBACK_VISION_MODELS:
                if fallback_text == text_model_id and fallback_vision == vision_model_id:
                    continue  # Skip if same as primary
                
                print(f"\n  🔄 Trying fallback: {fallback_text} + {fallback_vision}")
                
                try:
                    commentary_text = generate_commentary_func(
                        summary=ui_summary,
                        meta=meta,
                        images=images,
                        plot_data=all_plots,
                        vision_model_id=fallback_vision,
                        text_model_id=fallback_text,
                        hf_token=hf_token,
                        max_new_tokens=1024
                    )
                    
                    if commentary_text and commentary_text != "Commentary unavailable":
                        print(f"  ✓ Fallback successful!")
                        return commentary_text, {
                            "text": fallback_text,
                            "vision": fallback_vision,
                            "note": "Generated using fallback models"
                        }
                        
                except Exception as fallback_e:
                    print(f"    ❌ Fallback failed: {str(fallback_e)[:50]}")
                    continue
    
    # All attempts failed
    print("\n  ❌ All model combinations failed")
    return None, {"error": "All models failed"}


def build_commentary_response(
    commentary_text: str,
    all_plots: List[Dict],
    failed_plots: List[str],
    mode: str,
    used_player: str,
    models_used: Dict[str, Any],
    is_fallback: bool = False
) -> Dict[str, Any]:
    """
    Build the final commentary response JSON.
    """
    response = {
        "commentary": commentary_text,
        "analyzed_plots": [p["kind"] for p in all_plots],
        "failed_plots": failed_plots,
        "mode": mode,
        "player": used_player,
        "models_used": models_used
    }
    
    if is_fallback:
        response["note"] = "Generated using statistical analysis (AI models unavailable)"
    
    return response


def build_error_response(
    error_message: Optional[str],
    error_code: str = "UNKNOWN_ERROR",
    help_text: Optional[str] = None
) -> Tuple[Dict[str, Any], int]:
    """
    Build an error response for the commentary endpoint.
    Returns: (response_dict, http_status_code)
    """
    response = {
        "commentary": "Commentary unavailable",
        "error": error_message,
        "error_code": error_code
    }
    
    if help_text:
        response["help"] = help_text
    
    # Determine appropriate HTTP status code
    status_codes = {
        "INVALID_TOKEN": 404,
        "NO_TOKEN": 400,
        "NO_HF_TOKEN": 503,
        "GENERATION_FAILED": 500,
        "NO_PLOTS": 500,
        "UNKNOWN_ERROR": 500
    }
    
    return response, status_codes.get(error_code, 500)

