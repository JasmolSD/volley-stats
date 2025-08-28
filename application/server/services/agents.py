from __future__ import annotations
from typing import List, Dict, Any, Optional, Sequence, Tuple, cast
from types_common import UISummary, Meta, ImageRef
import requests

HAVE_LLM = False
USE_API = True

try:
    from transformers import AutoTokenizer, AutoModelForCausalLM, AutoProcessor, AutoModelForImageTextToText
    import torch
    HAVE_LLM = True
except ImportError:
    pass


# Libraries for vision analysis of plots
from PIL import Image
import io, base64

# Singletons for model caching
_MODEL: Optional[Any] = None
_TOKENIZER: Optional[Any] = None
# _PROCESSOR: Optional[Any] = None
_PIPE: Optional[Any] = None
_VISION_MODEL: Optional[Any] = None
_VISION_PROCESSOR: Optional[Any] = None

# HuggingFace Inference API endpoint
HF_API_URL = "https://router.huggingface.co/v1/chat/completions"

def call_hf_api(
    model_id: str,
    prompt: str,
    hf_token: str,
    max_tokens: int = 500
) -> Optional[str]:
    """Call HuggingFace Chat Completions API"""
    headers = {"Authorization": f"Bearer {hf_token}"}
    
    payload = {
        "messages": [
            {
                "role": "system",
                "content": "You are an expert volleyball analyst providing data-driven insights."
            },
            {
                "role": "user", 
                "content": prompt
            }
        ],
        "model": model_id,
        "max_tokens": max_tokens,
        "temperature": 0.7
    }
    
    try:
        response = requests.post(
            HF_API_URL,
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            # Extract message content from chat format
            if "choices" in result and len(result["choices"]) > 0:
                return result["choices"][0]["message"]["content"]
            return None
        else:
            print(f"HF API error: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"HF API exception: {e}")
        return None

def _load_vision_model(
    model_id: str = "HuggingFaceTB/SmolVLM-Instruct",
    hf_token: Optional[str] = None
) -> Tuple[Any, Any]:
    """Load SmolVLM vision model and processor."""
    global _VISION_MODEL, _VISION_PROCESSOR
    
    if _VISION_MODEL is not None and _VISION_PROCESSOR is not None:
        return _VISION_MODEL, _VISION_PROCESSOR
    
    common_kwargs = {}
    if hf_token:
        common_kwargs["token"] = hf_token
    
    use_cuda = torch.cuda.is_available()
    dtype = torch.float16 if use_cuda else torch.float32
    
    # Load SmolVLM processor and model
    _VISION_PROCESSOR = AutoProcessor.from_pretrained(model_id, **common_kwargs)
    _VISION_MODEL = AutoModelForImageTextToText.from_pretrained(
        model_id,
        torch_dtype=dtype,
        **common_kwargs
    )
    
    if use_cuda:
        _VISION_MODEL = _VISION_MODEL.to(torch.device("cuda:0"))    # type: ignore
    
    return _VISION_MODEL, _VISION_PROCESSOR


def _load_model_and_tokenizer(
        model_id: str,
        hf_token: Optional[str]
) -> Tuple[Any, Any]:
    """Load text model/tokenizer with fallback to open models."""
    global _PIPE, _TOKENIZER, _MODEL

    if _PIPE is not None and _TOKENIZER is not None:
        return _PIPE, _TOKENIZER

    common_kwargs = {}
    if hf_token:
        common_kwargs["token"] = hf_token

    use_cuda = torch.cuda.is_available()
    dtype = torch.float16 if use_cuda else torch.float32

    # Try to load the requested model
    try:
        print(f"Attempting to load model: {model_id}")
        _TOKENIZER = AutoTokenizer.from_pretrained(model_id, **common_kwargs)
        _MODEL = AutoModelForCausalLM.from_pretrained(
            model_id,
            torch_dtype=dtype,
            **common_kwargs
        )
        print(f"✓ Successfully loaded: {model_id}")
        
    except Exception as e:
        print(f"Failed to load {model_id}: {e}")
        
        # Fallback models that don't require license
        fallback_models = [
            "microsoft/phi-2",
            "TinyLlama/TinyLlama-1.1B-Chat-v1.0",
            "HuggingFaceH4/zephyr-7b-beta",
        ]
        
        for fallback_id in fallback_models:
            try:
                print(f"Trying fallback model: {fallback_id}")
                _TOKENIZER = AutoTokenizer.from_pretrained(fallback_id, **common_kwargs)
                _MODEL = AutoModelForCausalLM.from_pretrained(
                    fallback_id,
                    torch_dtype=dtype,
                    **common_kwargs
                )
                print(f"✓ Successfully loaded fallback: {fallback_id}")
                break
            except Exception as fallback_e:
                print(f"Failed to load fallback {fallback_id}: {fallback_e}")
                continue
        
        if _MODEL is None or _TOKENIZER is None:
            raise RuntimeError("Could not load any model. Please check your token and model access.")

    assert _TOKENIZER is not None
    assert _MODEL is not None

    # Ensure pad token is set
    if _TOKENIZER.pad_token_id is None:
        if _TOKENIZER.eos_token_id is not None:
            _TOKENIZER.pad_token = _TOKENIZER.eos_token
        else:
            _TOKENIZER.add_special_tokens({"pad_token": "<|pad|>"})
            _MODEL.resize_token_embeddings(len(_TOKENIZER))
    
    if use_cuda:
        _MODEL = _MODEL.to(torch.device("cuda:0"))

    from transformers import pipeline
    _PIPE = pipeline(
        task="text-generation",
        model=_MODEL,
        tokenizer=_TOKENIZER,
        max_new_tokens=256,
        do_sample=True,
        temperature=0.8,
        top_p=0.95,
        device=0 if use_cuda else -1,
    )
    return _PIPE, _TOKENIZER


def load_plot_images(plot_data: Dict[str, Any] | List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Load and process plot images for vision analysis.
    Can handle both single plot dict or list of plots.
    """
    processed_images = []
    
    # Normalize to list
    if isinstance(plot_data, dict):
        plots = [plot_data]
    elif isinstance(plot_data, list):
        plots = plot_data
    else:
        return []
    
    for plot in plots:
        if not isinstance(plot, dict):
            continue
            
        img_data = plot.get("image", "")
        if img_data and img_data.startswith("data:image/png;base64,"):
            base64_str = img_data.split(",")[1]
            processed_images.append({
                "type": "dynamic_plot",
                "base64": base64_str,
                "metadata": {
                    "kind": plot.get("kind", "unknown"),
                    "player": plot.get("used_player", plot.get("player", "team")),
                    "mode": plot.get("mode", "cumulative")
                }
            })
    
    return processed_images


def build_agent_context(
        summary: UISummary,
        meta: Meta,
        images: Sequence[ImageRef],
        plot_images: List[Dict[str,Any]]
) -> str:
    """
    Turn summary/meta/images/plots into DETAILED context with ACTUAL DATA VALUES.
    This is critical to prevent hallucinations! Now includes mode-specific statistics.
    """
    parts: list[str] = []

    # Determine analysis mode
    analysis_mode = summary.get('analysis_mode', 'cumulative')  # type: ignore
    mode_stats = summary.get('mode_specific_stats', {})  # type: ignore
    
    # Dataset Overview using meta
    parts.append(f"=== VOLLEYBALL TEAM PERFORMANCE DATA ({analysis_mode.upper()} ANALYSIS) ===\n")
    parts.append(f"Dataset Overview:")
    parts.append(f"- Total Rows: {meta.get('rows', summary['rows'])}")
    parts.append(f"- Total Columns: {meta.get('cols', 'unknown')}")
    
    # List actual player names from the data
    player_list = summary['players']
    parts.append(f"- Total Players: {len(player_list)}")
    parts.append(f"- Player Names: {', '.join(player_list)}")
    
    # Date range from actual data
    parts.append(f"- Date range: {summary['date_min']} to {summary['date_max']}")
    
    # Column information from meta
    if 'columns' in meta:
        cols = meta['columns']
        parts.append(f"- Available metrics: {len(cols)} columns")
        # Include the actual column names so LLM knows what data is available
        parts.append(f"  Key columns: {', '.join(cols[:20])}")  # First 20 columns
    
    # CRITICAL: Provide ACTUAL numerical values from the summary
    parts.append(f"\n=== ACTUAL TEAM PERFORMANCE METRICS (DO NOT MAKE UP NUMBERS) ===")
    
    # Service metrics with exact values
    srv_acc = summary.get('srv_accuracy', 0)
    parts.append(f"\nService Performance:")
    parts.append(f"  • Service Accuracy: {srv_acc:.3f} ({srv_acc*100:.1f}%)")
    parts.append(f"  • This is the ACTUAL measured service accuracy from the data")
    
    # Receive metrics with exact values
    rcv_acc = summary.get('rcv_accuracy', 0)
    parts.append(f"\nReceive Performance:")
    parts.append(f"  • Receive Accuracy: {rcv_acc:.3f} ({rcv_acc*100:.1f}%)")
    parts.append(f"  • This is the ACTUAL measured receive accuracy from the data")
    
    # Attack metrics with exact values
    atk_acc = summary.get('atk_accuracy', 0)
    parts.append(f"\nAttack Performance:")
    parts.append(f"  • Attack Accuracy (Hitting Percentage): {atk_acc:.3f}")
    parts.append(f"  • This is the ACTUAL hitting percentage from the data")
    
    # Error metrics with exact values
    avg_errors = summary.get('avg_errors_per_set', 0)
    parts.append(f"\nError Metrics:")
    parts.append(f"  • Average Errors per Set: {avg_errors:.2f}")
    parts.append(f"  • This is the ACTUAL measured error rate from the data")
    
    # MODE-SPECIFIC STATISTICS
    if analysis_mode == 'temporal' and mode_stats:
        parts.append(f"\n=== TEMPORAL ANALYSIS - TRENDS AND PATTERNS ===")
        
        # Service trends
        if 'srv_trend' in mode_stats:
            trend_dir = "improving" if mode_stats['srv_trend'] > 0 else "declining"
            parts.append(f"\nService Trends:")
            parts.append(f"  • Trend: {trend_dir} ({mode_stats['srv_trend']:.4f} per game)")
            parts.append(f"  • Consistency (std dev): {mode_stats.get('srv_consistency', 0):.3f}")
            parts.append(f"  • Recent 3-game avg: {mode_stats.get('srv_recent_avg', 0)*100:.1f}%")
            parts.append(f"  • Best game: {mode_stats.get('srv_best_game', 0)*100:.1f}%")
            parts.append(f"  • Worst game: {mode_stats.get('srv_worst_game', 0)*100:.1f}%")
        
        # Receive trends
        if 'rcv_trend' in mode_stats:
            trend_dir = "improving" if mode_stats['rcv_trend'] > 0 else "declining"
            parts.append(f"\nReceive Trends:")
            parts.append(f"  • Trend: {trend_dir} ({mode_stats['rcv_trend']:.4f} per game)")
            parts.append(f"  • Consistency (std dev): {mode_stats.get('rcv_consistency', 0):.3f}")
            parts.append(f"  • Recent 3-game avg: {mode_stats.get('rcv_recent_avg', 0)*100:.1f}%")
            parts.append(f"  • Best game: {mode_stats.get('rcv_best_game', 0)*100:.1f}%")
            parts.append(f"  • Worst game: {mode_stats.get('rcv_worst_game', 0)*100:.1f}%")
        
        # Attack trends
        if 'atk_trend' in mode_stats:
            trend_dir = "improving" if mode_stats['atk_trend'] > 0 else "declining"
            parts.append(f"\nAttack Trends:")
            parts.append(f"  • Trend: {trend_dir} ({mode_stats['atk_trend']:.4f} per game)")
            parts.append(f"  • Consistency (std dev): {mode_stats.get('atk_consistency', 0):.3f}")
            parts.append(f"  • Recent 3-game avg: {mode_stats.get('atk_recent_avg', 0):.3f}")
            parts.append(f"  • Best game: {mode_stats.get('atk_best_game', 0):.3f}")
            parts.append(f"  • Worst game: {mode_stats.get('atk_worst_game', 0):.3f}")
        
        # Error trends
        if 'error_trend' in mode_stats:
            trend_dir = "improving" if mode_stats['error_trend'] < 0 else "worsening"  # Negative is good for errors
            parts.append(f"\nError Trends:")
            parts.append(f"  • Trend: {trend_dir} ({abs(mode_stats['error_trend']):.3f} per game)")
            parts.append(f"  • Recent 3-game avg: {mode_stats.get('error_recent_avg', 0):.2f} errors/set")
            parts.append(f"  • Best game: {mode_stats.get('error_best_game', 0):.2f} errors/set")
            parts.append(f"  • Worst game: {mode_stats.get('error_worst_game', 0):.2f} errors/set")
        
        # Momentum
        if 'momentum' in mode_stats:
            parts.append(f"\nPerformance Momentum:")
            parts.append(f"  • Recent win rate: {mode_stats.get('recent_win_rate', 0)*100:.1f}%")
            parts.append(f"  • Overall win rate: {mode_stats.get('overall_win_rate', 0)*100:.1f}%")
            parts.append(f"  • Momentum: {'+' if mode_stats['momentum'] > 0 else ''}{mode_stats['momentum']*100:.1f}%")
    
    elif analysis_mode == 'cumulative' and mode_stats:
        parts.append(f"\n=== CUMULATIVE TOTALS AND AVERAGES ===")
        
        # Game totals
        parts.append(f"\nGames Summary:")
        parts.append(f"  • Total games: {mode_stats.get('total_games', 0)}")
        parts.append(f"  • Wins: {mode_stats.get('total_wins', 0)}")
        parts.append(f"  • Losses: {mode_stats.get('total_losses', 0)}")
        
        # Service totals
        if 'total_serves' in mode_stats:
            parts.append(f"\nService Totals:")
            parts.append(f"  • Total serves: {mode_stats['total_serves']}")
            parts.append(f"  • Total aces: {mode_stats.get('total_aces', 0)} ({mode_stats.get('ace_percentage', 0)*100:.1f}%)")
            parts.append(f"  • Total errors: {mode_stats.get('total_srv_errors', 0)}")
            parts.append(f"  • Avg serves/game: {mode_stats.get('avg_serves_per_game', 0):.1f}")
            parts.append(f"  • Avg aces/game: {mode_stats.get('avg_aces_per_game', 0):.1f}")
        
        # Receive totals
        if 'total_receives' in mode_stats:
            parts.append(f"\nReceive Totals:")
            parts.append(f"  • Total receives: {mode_stats['total_receives']}")
            parts.append(f"  • Perfect passes: {mode_stats.get('total_perfect_passes', 0)} ({mode_stats.get('perfect_pass_percentage', 0)*100:.1f}%)")
            parts.append(f"  • Total errors: {mode_stats.get('total_rcv_errors', 0)}")
        
        # Attack totals
        if 'total_attacks' in mode_stats:
            parts.append(f"\nAttack Totals:")
            parts.append(f"  • Total attacks: {mode_stats['total_attacks']}")
            parts.append(f"  • Total kills: {mode_stats.get('total_kills', 0)} ({mode_stats.get('kill_percentage', 0)*100:.1f}%)")
            parts.append(f"  • Total errors: {mode_stats.get('total_atk_errors', 0)}")
            parts.append(f"  • Avg attacks/game: {mode_stats.get('avg_attacks_per_game', 0):.1f}")
            parts.append(f"  • Avg kills/game: {mode_stats.get('avg_kills_per_game', 0):.1f}")
        
        # Other totals
        if 'total_blocks' in mode_stats:
            parts.append(f"  • Total blocks: {mode_stats['total_blocks']:.1f}")
        if 'total_digs' in mode_stats:
            parts.append(f"  • Total digs: {mode_stats['total_digs']}")
        if 'total_assists' in mode_stats:
            parts.append(f"  • Total assists: {mode_stats['total_assists']}")
            parts.append(f"  • Avg assists/game: {mode_stats.get('avg_assists_per_game', 0):.1f}")

    # Add interpretation guidelines
    parts.append(f"\n=== IMPORTANT INSTRUCTIONS ===")
    parts.append("1. USE ONLY THE NUMBERS PROVIDED ABOVE - DO NOT MAKE UP ANY STATISTICS")
    parts.append("2. All percentages and values are already calculated - use them exactly as shown")
    parts.append("3. When discussing player performance, only mention players from the list above")
    parts.append("4. Base your analysis on the actual data values provided, not assumptions")
    parts.append(f"5. This is {analysis_mode.upper()} analysis - focus on {'trends over time' if analysis_mode == 'temporal' else 'overall totals and averages'}")

    # Static Images Information
    if images:
        parts.append(f"\n=== Static Analysis Images ===")
        parts.append(f"Available: {len(images)} plot(s)")
        for i, img in enumerate(images):
            if isinstance(img, dict):
                parts.append(f"  - {img.get('name', f'Image {i+1}')}: {img.get('url', 'available')}")
    
    # Visual analysis context for dynamic plots
    if plot_images:
        parts.append(f"\n=== Dynamic Visualizations for Analysis ===")
        parts.append(f"Total plots: {len(plot_images)}")
        for i, img in enumerate(plot_images):
            meta_info = img.get("metadata", {})
            parts.append(f"  - Plot {i+1}: {meta_info.get('kind', 'Unknown')} for {meta_info.get('player', 'team')} ({meta_info.get('mode', 'unknown')} view)")
    
    return "\n".join(parts)


def visually_analyze_plot(
        plot_base_64: str,
        plot_metadata: Dict[str, Any],
        summary: UISummary,
        hf_token: str,
        model_id: str = "HuggingFaceTB/SmolVLM-Instruct",
) -> str:
    """
    Analyze a plot image (encoded to base64) using a VLM with ACTUAL DATA VALUES.
    """
    try:
        # Load the VLM
        model, processor = _load_vision_model(
            model_id=model_id,
            hf_token=hf_token
        )

        # Decode the base64 plot into a PIL Image
        img_bytes = base64.b64decode(plot_base_64)
        img = Image.open(io.BytesIO(img_bytes))

        # Extract the plot/player data from metadata dictionary
        plot_kind = plot_metadata.get("kind", "unknown")
        player = plot_metadata.get("used_player", "team")

        # Create conversation-style prompt with ACTUAL VALUES
        messages = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "image": img
                    },
                    {
                        "type": "text", 
                        "text": f"""You are analyzing a volleyball statistics visualization.
                        Plot type: {plot_kind}
                        Player/Team focus: {player}

                        ACTUAL MEASURED TEAM STATISTICS (USE THESE EXACT VALUES):
                        - Service Accuracy: {summary.get('srv_accuracy', 0):.3f} ({summary.get('srv_accuracy', 0)*100:.1f}%)
                        - Receive Accuracy: {summary.get('rcv_accuracy', 0):.3f} ({summary.get('rcv_accuracy', 0)*100:.1f}%)
                        - Attack Accuracy (Hitting %): {summary.get('atk_accuracy', 0):.3f}
                        - Avg Errors/Set: {summary.get('avg_errors_per_set', 0):.2f}

                        Analyze this chart and describe:
                        1. What patterns or trends are visible in the chart?
                        2. How do the visual elements relate to the statistics above?
                        3. What performance insights can be drawn?
                        
                        IMPORTANT: Use only the statistics provided above. Do not invent new numbers."""
                    }
                ]
            }
        ]

        # Process prompt and context with the VLM
        prompt = processor.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True)
        
        inputs = processor(
            text=prompt,
            images=[img],
            return_tensors="pt"
        )

        # Ensure all inputs are on same device as model
        device = next(model.parameters()).device
        inputs = {k: v.to(device) if torch.is_tensor(v) else v for k, v in inputs.items()}

        # Generate Response
        with torch.no_grad():
            generated_ids = model.generate(
                **inputs,
                max_new_tokens=500,
                do_sample=True,
                temperature=0.7,  # Lower temperature for more factual output
                top_p=0.95,
                pad_token_id=processor.tokenizer.pad_token_id,
                eos_token_id=processor.tokenizer.eos_token_id
            )

        # Decode the response
        generated_response = processor.batch_decode(
            generated_ids[:, inputs['input_ids'].size(1):] if inputs['input_ids'].size(1) < generated_ids.size(1) else generated_ids,
            skip_special_tokens=True,
            clean_up_tokenization_spaces=True
        )

        analysis = generated_response[0] if generated_response else "Unable to analyze image..."

        # Format the analysis
        formatted_analysis = f"Visual analysis ({plot_kind} - {player}):\n\t{analysis}"

        return formatted_analysis
    except Exception as e:
        return f"Unable to analyze plot visually: {str(e)}"


def generate_commentary_with_plots(
        summary: UISummary,
        meta: Meta,
        images: Sequence[ImageRef],
        plot_data: Dict[str, Any] | List[Dict[str, Any]],
        hf_token: str,
        vision_model_id: str = "HuggingFaceTB/SmolVLM-Instruct",
        text_model_id: str = "meta-llama/Llama-3.2-3B-Instruct",
        max_new_tokens: int = 512,
) -> Optional[tuple]:
    """
    Enhanced commentary generation that uses ACTUAL DATA VALUES.
    """
    # Process plot images
    visual_insights = []
    plot_images = load_plot_images(plot_data=plot_data)
    
    for img in plot_images:
        insight = visually_analyze_plot(
            plot_base_64=img["base64"],
            plot_metadata=img["metadata"],
            summary=summary,
            hf_token=hf_token,
            model_id=vision_model_id
        )
        visual_insights.append(insight)

    # Build context with ACTUAL DATA
    context = build_agent_context(
        summary=summary,
        meta=meta,
        images=images,
        plot_images=plot_images
    )
    
    # System prompt emphasizing data accuracy
    system = (
        "You are an expert volleyball analyst providing data-driven insights. "
        "You MUST use the EXACT statistics provided - never make up numbers. "
        "When you see 'Service Accuracy: 0.844 (84.4%)', you must use exactly 84.4%, not any other value. "
        "Similarly for all other metrics. Your analysis should be based solely on the provided data. "
        "Focus on practical recommendations based on the actual measured performance. "
        "If a metric shows 0.612 for receive accuracy, that means 61.2% - use this exact value."
    )

    # Build user prompt with actual data emphasis
    user_parts = [
        f"Volleyball Team Analysis Report\n",
        f"{context}\n"
    ]
    
    if visual_insights:
        user_parts.append("\nVisual Analysis Results:")
        for insight in visual_insights:
            user_parts.append(f"\n{insight}")
    
    # Provide the actual values again in the instructions
    user_parts.append(
        f"\n\nREMINDER - Use these EXACT values in your analysis:"
        f"\n• Service Accuracy: {summary.get('srv_accuracy', 0)*100:.1f}%"
        f"\n• Receive Accuracy: {summary.get('rcv_accuracy', 0)*100:.1f}%"
        f"\n• Attack Accuracy: {summary.get('atk_accuracy', 0):.3f}"
        f"\n• Avg Errors/Set: {summary.get('avg_errors_per_set', 0):.2f}"
        f"\n• Players: {', '.join(summary.get('players', [])[:10])}"
    )
    
    user_parts.append(
        "\n\nBased on the EXACT data values provided above, generate 4-6 insights covering:\n"
        "• Performance strengths using the actual percentages\n"
        "• Areas needing improvement based on the metrics\n"
        "• Specific recommendations tied to the data\n"
        "\nBe specific with the numbers provided. DO NOT make up any statistics."
    )

    user = "".join(user_parts)

    # Use text model for final commentary generation
    pipe, tok = _load_model_and_tokenizer(
        model_id=text_model_id,
        hf_token=hf_token
    )

    # Chat formatting
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]

    try:
        prompt: str = cast(str, tok.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True,
        ))
    except Exception:
        prompt = (
            f"[System]\n{system}\n\n"
            f"[User]\n{user}\n\n"
            "Assistant:"
        )

    # Generate commentary
    out = pipe(
        prompt,
        max_new_tokens=max_new_tokens,
        do_sample=True,
        temperature=0.6,  # Lower temperature for more factual output
        eos_token_id=tok.eos_token_id,
        pad_token_id=tok.eos_token_id if tok.eos_token_id is not None else tok.pad_token_id,
        return_full_text=False,
    )

    # Extract text
    text = out[0]["generated_text"]

    if text.startswith(prompt):
        text = text[len(prompt):].lstrip()

    # Validate that the output contains actual values
    if not text or len(text.strip()) < 50:
        # Return none so we can use fallback commmentary
        return None, text_model_id, vision_model_id
    else:
        print("LLM Commentary Successful!")
        return text, text_model_id, vision_model_id


def generate_basic_statistical_commentary(
        summary: UISummary, 
        mode: str, 
        player: str
) -> str:
    """
    Generate basic statistical commentary without AI models.
    Mode-aware fallback when all AI models fail.
    """
    player_name = player or "Team"
    
    # Get mode-specific statistics if available
    mode_stats = summary.get('mode_specific_stats', {})  # type: ignore
    
    # Build header based on mode
    if mode.lower() == 'temporal':
        header = f"Temporal Statistical Analysis for {player_name} - Performance Trends\n"
    else:
        header = f"Cumulative Statistical Analysis for {player_name} - Overall Performance\n"
    
    insights = []
    
    # Core performance metrics (same for both modes)
    srv_acc = summary.get('srv_accuracy', 0)
    rcv_acc = summary.get('rcv_accuracy', 0)
    atk_acc = summary.get('atk_accuracy', 0)
    errors = summary.get('avg_errors_per_set', 0)
    
    # Service analysis
    if srv_acc > 0.9:
        insights.append(f"• Excellent service accuracy at {srv_acc:.1%} - well above competitive standards")
    elif srv_acc > 0.85:
        insights.append(f"• Good service accuracy at {srv_acc:.1%} - meeting competitive standards")
    else:
        insights.append(f"• Service accuracy at {srv_acc:.1%} needs improvement to reach 85%+ competitive standard")
    
    # Receive analysis
    if rcv_acc > 0.75:
        insights.append(f"• Strong serve-receive performance at {rcv_acc:.1%} - creating good offensive opportunities")
    elif rcv_acc > 0.65:
        insights.append(f"• Adequate receive accuracy at {rcv_acc:.1%} - room for improvement")
    else:
        insights.append(f"• Receive accuracy at {rcv_acc:.1%} is limiting offensive options - priority for practice")
    
    # Attack analysis
    if atk_acc > 0.3:
        insights.append(f"• Outstanding hitting percentage at {atk_acc:.3f} - elite offensive performance")
    elif atk_acc > 0.2:
        insights.append(f"• Solid hitting percentage at {atk_acc:.3f} - competitive offensive output")
    else:
        insights.append(f"• Hitting percentage at {atk_acc:.3f} indicates offensive struggles")
    
    # Error analysis
    if errors < 4:
        insights.append(f"• Excellent error control at {errors:.1f} per set - maintaining discipline")
    elif errors < 6:
        insights.append(f"• Acceptable error rate at {errors:.1f} per set - some room for improvement")
    else:
        insights.append(f"• High error rate at {errors:.1f} per set is giving away too many points")
    
    # MODE-SPECIFIC INSIGHTS
    if mode.lower() == 'temporal' and mode_stats:
        insights.append("\nTrend Analysis:")
        
        # Service trend
        if 'srv_trend' in mode_stats:
            srv_trend = mode_stats['srv_trend']
            if srv_trend > 0.001:
                insights.append(f"• Service improving: +{srv_trend:.4f} per game trend")
            elif srv_trend < -0.001:
                insights.append(f"• Service declining: {srv_trend:.4f} per game trend")
            else:
                insights.append("• Service performance stable over time")
            
            if 'srv_recent_avg' in mode_stats:
                recent = mode_stats['srv_recent_avg'] * 100
                insights.append(f"  - Recent 3-game average: {recent:.1f}%")
        
        # Receive trend
        if 'rcv_trend' in mode_stats:
            rcv_trend = mode_stats['rcv_trend']
            if rcv_trend > 0.001:
                insights.append(f"• Receive improving: +{rcv_trend:.4f} per game trend")
            elif rcv_trend < -0.001:
                insights.append(f"• Receive declining: {rcv_trend:.4f} per game trend")
            else:
                insights.append("• Receive performance stable over time")
            
            if 'rcv_recent_avg' in mode_stats:
                recent = mode_stats['rcv_recent_avg'] * 100
                insights.append(f"  - Recent 3-game average: {recent:.1f}%")
        
        # Attack trend
        if 'atk_trend' in mode_stats:
            atk_trend = mode_stats['atk_trend']
            if atk_trend > 0.001:
                insights.append(f"• Attack improving: +{atk_trend:.4f} per game trend")
            elif atk_trend < -0.001:
                insights.append(f"• Attack declining: {atk_trend:.4f} per game trend")
            else:
                insights.append("• Attack performance stable over time")
            
            if 'atk_recent_avg' in mode_stats:
                recent = mode_stats['atk_recent_avg']
                insights.append(f"  - Recent 3-game hitting %: {recent:.3f}")
        
        # Error trend (negative is good)
        if 'error_trend' in mode_stats:
            err_trend = mode_stats['error_trend']
            if err_trend < -0.01:
                insights.append(f"• Errors improving (decreasing): {abs(err_trend):.3f} fewer per game")
            elif err_trend > 0.01:
                insights.append(f"• Errors worsening (increasing): +{err_trend:.3f} more per game")
            else:
                insights.append("• Error rate stable over time")
            
            if 'error_recent_avg' in mode_stats:
                recent = mode_stats['error_recent_avg']
                insights.append(f"  - Recent 3-game average: {recent:.2f} errors/set")
        
        # Momentum
        if 'momentum' in mode_stats and 'recent_win_rate' in mode_stats:
            momentum = mode_stats['momentum']
            recent_wr = mode_stats['recent_win_rate'] * 100
            overall_wr = mode_stats.get('overall_win_rate', 0) * 100
            
            if momentum > 0.1:
                insights.append(f"• Strong positive momentum: Recent wins ({recent_wr:.0f}%) exceed season average ({overall_wr:.0f}%)")
            elif momentum < -0.1:
                insights.append(f"• Negative momentum: Recent wins ({recent_wr:.0f}%) below season average ({overall_wr:.0f}%)")
            else:
                insights.append(f"• Steady performance: Recent and overall win rates aligned (~{overall_wr:.0f}%)")
    
    elif mode.lower() == 'cumulative' and mode_stats:
        insights.append("\nCumulative Totals:")
        
        # Games summary
        if 'total_games' in mode_stats:
            total_games = mode_stats['total_games']
            total_wins = mode_stats.get('total_wins', 0)
            total_losses = mode_stats.get('total_losses', 0)
            win_pct = (total_wins / total_games * 100) if total_games > 0 else 0
            insights.append(f"• Record: {total_wins}-{total_losses} ({win_pct:.1f}% win rate) across {total_games} games")
        
        # Service totals
        if 'total_serves' in mode_stats:
            total_serves = mode_stats['total_serves']
            total_aces = mode_stats.get('total_aces', 0)
            ace_pct = mode_stats.get('ace_percentage', 0) * 100
            avg_serves = mode_stats.get('avg_serves_per_game', 0)
            insights.append(f"• Service: {total_serves} total serves with {total_aces} aces ({ace_pct:.1f}%)")
            insights.append(f"  - Averaging {avg_serves:.1f} serves per game")
        
        # Attack totals
        if 'total_attacks' in mode_stats:
            total_attacks = mode_stats['total_attacks']
            total_kills = mode_stats.get('total_kills', 0)
            kill_pct = mode_stats.get('kill_percentage', 0) * 100
            avg_kills = mode_stats.get('avg_kills_per_game', 0)
            insights.append(f"• Offense: {total_attacks} total attacks with {total_kills} kills ({kill_pct:.1f}%)")
            insights.append(f"  - Averaging {avg_kills:.1f} kills per game")
        
        # Receive totals
        if 'total_receives' in mode_stats:
            total_rcv = mode_stats['total_receives']
            perfect_passes = mode_stats.get('total_perfect_passes', 0)
            perfect_pct = mode_stats.get('perfect_pass_percentage', 0) * 100
            insights.append(f"• Receive: {total_rcv} total passes with {perfect_passes} perfect ({perfect_pct:.1f}%)")
        
        # Other stats
        if 'total_blocks' in mode_stats:
            insights.append(f"• Defense: {mode_stats['total_blocks']:.1f} total blocks")
        if 'total_digs' in mode_stats:
            insights.append(f"• Defense: {mode_stats['total_digs']} total digs")
        if 'total_assists' in mode_stats:
            avg_assists = mode_stats.get('avg_assists_per_game', 0)
            insights.append(f"• Setting: {mode_stats['total_assists']} total assists ({avg_assists:.1f} per game)")
    
    # RECOMMENDATIONS based on mode and performance
    recommendations = ["\nRecommendations:"]
    
    if mode.lower() == 'temporal' and mode_stats:
        # Temporal-specific recommendations based on trends
        if mode_stats.get('srv_trend', 0) < -0.001:
            recommendations.append("• Service trending down - review technique and mental approach")
        elif srv_acc < 0.85:
            recommendations.append("• Focus on consistent toss placement in serve practice")
        
        if mode_stats.get('rcv_trend', 0) < -0.001:
            recommendations.append("• Receive declining - increase passing reps and footwork drills")
        elif rcv_acc < 0.65:
            recommendations.append("• Prioritize serve-receive with emphasis on platform control")
        
        if mode_stats.get('atk_trend', 0) < -0.001:
            recommendations.append("• Attack efficiency declining - review approach angles and timing")
        elif atk_acc < 0.2:
            recommendations.append("• Work on shot selection and reading blockers")
        
        if mode_stats.get('error_trend', 0) > 0.01:
            recommendations.append("• Errors increasing - implement controlled scrimmages for consistency")
        elif errors > 6:
            recommendations.append("• High error baseline - focus on ball control fundamentals")
        
        if mode_stats.get('momentum', 0) < -0.1:
            recommendations.append("• Address negative momentum with team building and mental training")
    
    else:
        assert mode_stats   # make sure it's not empty
        # Cumulative recommendations based on overall performance
        if srv_acc < 0.85:
            recommendations.append("• Focus on consistent toss placement in serve practice")
            if mode_stats.get('ace_percentage', 0) < 0.05:
                recommendations.append("• Develop more aggressive serving options for ace opportunities")
        
        if rcv_acc < 0.65:
            recommendations.append("• Increase serve-receive reps with emphasis on platform angle")
            if mode_stats.get('perfect_pass_percentage', 0) < 0.3:
                recommendations.append("• Work on passing accuracy to enable better offensive sets")
        
        if atk_acc < 0.2:
            recommendations.append("• Work on shot selection and identifying open court areas")
            if mode_stats.get('kill_percentage', 0) < 0.25:
                recommendations.append("• Develop power and placement for higher kill conversion")
        
        if errors > 6:
            recommendations.append("• Implement 'zero error' drills focusing on ball control")
        
        # Win rate recommendations
        if mode_stats.get('total_games', 0) > 0:
            win_rate = mode_stats.get('total_wins', 0) / mode_stats['total_games']
            if win_rate < 0.4:
                recommendations.append("• Focus on mental toughness and closing tight sets")
    
    # Add footer
    footer = f"\n\nNote: Statistical summary based on {summary.get('rows', 0)} data points from {summary.get('date_min', 'N/A')} to {summary.get('date_max', 'N/A')}."
    footer += "\nAI-powered insights temporarily unavailable - using statistical analysis only."
    
    return header + "\n".join(insights) + "\n".join(recommendations) + footer

# --- API ---
def generate_commentary_with_api(
        summary: UISummary,
        meta: Meta,
        images: Sequence[ImageRef],
        plot_data: Dict[str, Any] | List[Dict[str, Any]],
        hf_token: str,
        model_id: str = "HuggingFaceTB/SmolLM3-3B:hf-inference",  # Use text model
        max_new_tokens: int = 512,
) -> Optional[tuple]:
    """
    Enhanced commentary using plot metadata + text model.
    """
    if not hf_token:
        return None
    
    # Extract plot information programmatically (no vision needed)
    plot_descriptions = []
    if plot_data:
        if isinstance(plot_data, list):
            for plot in plot_data:
                plot_type = plot.get('kind', 'unknown')
                mode = plot.get('mode', 'cumulative')
                player = plot.get('used_player', 'Team')
                
                # Describe what the plot shows based on your data
                if plot_type == 'offense':
                    desc = f"Offensive performance plot shows {summary.get('kills', 0)} kills with {summary.get('atk_accuracy', 0)*100:.1f}% accuracy"
                elif plot_type == 'service':
                    desc = f"Service plot indicates {summary.get('aces', 0)} aces and {summary.get('srv_accuracy', 0)*100:.1f}% accuracy"
                elif plot_type == 'errors':
                    desc = f"Error analysis shows {summary.get('avg_errors_per_set', 0):.1f} average errors per set"
                else:
                    desc = f"{plot_type} analysis for {player}"
                    
                plot_descriptions.append(desc)
    
    # Build context with plot descriptions
    context = build_agent_context(
        summary=summary,
        meta=meta,
        images=images,
        plot_images=[]  # Don't need actual images
    )
    
    # Add plot descriptions to context
    if plot_descriptions:
        context += "\n\nVisualization Analysis:\n" + "\n".join([f"- {desc}" for desc in plot_descriptions])
    
    # System prompt
    system = (
        "You are an expert volleyball analyst providing data-driven insights. "
        "You have access to performance data and visualization descriptions. "
        "Use ONLY the exact statistics provided - never make up numbers."
    )

    # Build user prompt
    user_parts = [
        f"Volleyball Team Analysis Report\n",
        f"{context}\n",
        f"\n\nKEY METRICS:",
        f"\n• Service Accuracy: {summary.get('srv_accuracy', 0)*100:.1f}%",
        f"\n• Receive Accuracy: {summary.get('rcv_accuracy', 0)*100:.1f}%", 
        f"\n• Attack Accuracy: {summary.get('atk_accuracy', 0)*100:.1f}%",
        f"\n• Avg Errors/Set: {summary.get('avg_errors_per_set', 0):.2f}",
        "\n\nProvide 4-6 insights and recommendations based on this data."
    ]

    prompt = system + "\n\n" + "".join(user_parts) + "\n\nAnalysis:"
    
    # Use your existing call_hf_api function
    text = call_hf_api(
        model_id=model_id,
        prompt=prompt,
        hf_token=hf_token,
        max_tokens=max_new_tokens
    )
    
    # Validate output
    if text and len(text.strip()) > 50:
        print(f"Generated Response using HF API\n\tModel Used: {model_id}")
        return text.strip(), model_id, model_id
    else:
        return None


def generate_commentary(
        summary: UISummary,
        meta: Meta,
        hf_token: str,
        images: Sequence[ImageRef],
        plot_data: Dict[str, Any] | List[Dict[str, Any]],
        vision_model_id: str = "HuggingFaceTB/SmolVLM-Instruct",
        text_model_id: str = "HuggingFaceTB/SmolVLM-Instruct",
        max_new_tokens: int = 512
) -> Optional[tuple]:
    """
    Main wrapper function for commentary generation.
    Handles all the edge cases and calls generate_commentary_with_plots.
    """
    # No LLM
    if not HAVE_LLM:
        return "Commentary unavailable - using statistical analysis instead", "statistical_analysis"
    
    # Handle missing parameters
    if not hf_token:
        return "Commentary unavailable - no API token provided", "statistical_analysis", "statistical_analysis"
    
    if images is None:
        images = []
    
    # If no plot data, return basic statistical commentary
    if not plot_data:
        return "Commentary unavailable", "statistical_analysis", "statistical_analysis"
    
    try:
        if not USE_API:
            # Main commentary generation with plots (local)
            return generate_commentary_with_plots(
                summary=summary,
                meta=meta,
                images=images,
                plot_data=plot_data,
                hf_token=hf_token,
                vision_model_id=vision_model_id,
                text_model_id=text_model_id,
                max_new_tokens=max_new_tokens
            )
        else:
            return generate_commentary_with_api(
                summary=summary,
                meta=meta,
                images=images,
                plot_data=plot_data,
                hf_token=hf_token,
                model_id="HuggingFaceTB/SmolLM3-3B:hf-inference",
                max_new_tokens=max_new_tokens
            )
    except Exception as e:
        print(f"Commentary generation failed: {e}")
        return "Commentary unavailable", "statistical_analysis", "statistical_analysis"

