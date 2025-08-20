from __future__ import annotations
from typing import List, Dict, Any, Optional, Sequence, Tuple, cast
from types_common import UISummary, Meta, ImageRef
from transformers import AutoTokenizer, AutoModelForCausalLM, AutoProcessor, AutoModelForImageTextToText
import torch

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
    Turn summary/meta/images/plots into context that can be fed into a VLM.
    """
    parts: list[str] = []

    # Dataset Overview using meta
    parts.append(f"Dataset Overview:")
    parts.append(f"- Total Rows: {meta.get('rows', summary['rows'])}")
    parts.append(f"- Total Columns: {meta.get('cols', 'unknown')}")
    parts.append(f"- Players: {len(summary['players'])} ({', '.join(summary['players'][:5])}{'...' if len(summary['players']) > 5 else ''})")
    parts.append(f"- Date range: {summary['date_min']} to {summary['date_max']}")
    
    # Column information from meta
    if 'columns' in meta:
        cols = meta['columns']
        parts.append(f"- Available metrics: {len(cols)} columns")
        if len(cols) <= 10:
            parts.append(f"  Columns: {', '.join(cols)}")
    
    # Team Performance Summary
    parts.append(f"\nTeam Performance Averages:")
    parts.append(f"  • Service Accuracy: {summary.get('srv_accuracy', 0):.1%}")
    parts.append(f"  • Receive Accuracy: {summary.get('rcv_accuracy', 0):.1%}")
    parts.append(f"  • Attack Accuracy: {summary.get('atk_accuracy', 0):.3f}")
    parts.append(f"  • Avg Errors/Set: {summary.get('avg_errors_per_set', 0):.2f}")

    # Static Images Information
    if images:
        parts.append(f"\nStatic Analysis Images: {len(images)} plot(s) available")
        for i, img in enumerate(images):
            if isinstance(img, dict):
                parts.append(f"  - {img.get('name', f'Image {i+1}')}: {img.get('url', 'available')}")
            else:
                parts.append(f"  - Image {i+1}: {img}")
    
    # Visual analysis context for dynamic plots
    if plot_images:
        parts.append(f"\nDynamic Visualizations: {len(plot_images)} plot(s) for analysis")
        for i, img in enumerate(plot_images):
            meta_info = img.get("metadata", {})
            parts.append(f"  - Plot {i+1}: {meta_info.get('kind', 'Unknown')} analysis for {meta_info.get('player', 'team')}")
    
    return "\n".join(parts)

def visually_analyze_plot(
        plot_base_64: str,
        plot_metadata: Dict[str, Any],
        summary: UISummary,
        hf_token: str,
        model_id: str = "HuggingFaceTB/SmolVLM-Instruct",
) -> str:
    """
    Analyze a plot image (encoded to base64) using a VLM.
    Any Models used must be VLMs, else no useful commentary will be provided.
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

        # Create conversation-style prompt for SmolVLM
        messages = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "image": img  # Pass PIL Image directly
                    },
                    {
                        "type": "text", 
                        "text": f"""You are analyzing a volleyball statistics visualization.
                        Plot type: {plot_kind}
                        Player/Team focus: {player}

                        Current team statistics:
                        - Service Accuracy: {summary.get('srv_accuracy', 0):.1%}
                        - Receive Accuracy: {summary.get('rcv_accuracy', 0):.1%}  
                        - Attack Accuracy: {summary.get('atk_accuracy', 0):.3f}
                        - Avg Errors/Set: {summary.get('avg_errors_per_set', 0):.2f}

                        Analyze this chart and describe:
                        1. What are the main visual patterns or trends you observe?
                        2. Which players or time periods show strong/weak performance?
                        3. Are there any concerning patterns or outliers?
                        4. What specific improvements would you recommend based on what you see?

                        Be specific about what you observe in the chart - mention colors, bar heights, line trends, and any labels you can see."""
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

        # Generate Response (no gradient to save memory)
        with torch.no_grad():
            generated_ids = model.generate(
                **inputs,   #unpack the dictionary of inputs
                max_new_tokens=500,
                do_sample=True,     # probabilistic sampling rather than greedy decoding (highest probability)
                temperature=0.8,    # not too creative but not too conservative
                top_p=0.95,
                pad_token_id=processor.tokenizer.pad_token_id,
                eos_token_id=processor.tokenizer.eos_token_id
            )

        # Decode the response from tokens into readable text
        generated_response = processor.batch_decode(
            generated_ids[:, inputs['input_ids'].size(1):] if inputs['input_ids'].size(1) < generated_ids.size(1) else generated_ids,
            skip_special_tokens=True,
            clean_up_tokenization_spaces=True
        )

        analysis = generated_response[0]  if generated_response else "Unable to analyze image..."

        # Format the analysis
        formatted_analysis = f"Visual analysis ({plot_kind} - {player}):\n\t{analysis}"

        return formatted_analysis
    except Exception as e:
        return f"Unable to analyze plot visually: {str(e)}"

def generate_commentary_with_plots(
        summary: UISummary,
        meta: Meta,
        images: Sequence[ImageRef],
        plot_data: Dict[str, Any] | List[Dict[str, Any]],  # Can be single or multiple plots
        hf_token: str,
        vision_model_id: str = "HuggingFaceTB/SmolVLM-Instruct",
        text_model_id: str = "meta-llama/Llama-3.2-3B-Instruct",
        max_new_tokens: int = 512,
) -> str:
    """
    Enhanced commentary generation that analyzes plot images.
    This is the main implementation function.
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

    # Build context
    context = build_agent_context(
        summary=summary,
        meta=meta,
        images=images,
        plot_images=plot_images
    )
    
    # System prompt
    system = (
        "You are an expert volleyball analyst and coach with deep knowledge of statistics and performance metrics. "
        "You provide insightful, actionable commentary that helps teams improve their performance. "
        "Your analysis is data-driven, specific, and constructive. "
        "Focus on practical recommendations and positive reinforcement while addressing areas for improvement. "
        "DO NOT make up numbers or statistics not directly provided!"
    )

    # Build user prompt with visual insights
    user_parts = [
        f"Volleyball Team Analysis Report\n",
        f"{context}\n"
    ]
    
    if visual_insights:
        user_parts.append("\nVisual Analysis Results:")
        for insight in visual_insights:
            user_parts.append(f"\n{insight}")
    
    # Add synthesis instructions if multiple plots
    if len(plot_images) > 1:
        user_parts.append(
            "\n\nSYNTHESIS TASK - Analyze across ALL visualizations:"
            "\n• What patterns appear in multiple charts?"
            "\n• How do different metrics relate to each other?"
            "\n• What's the overall performance story?"
        )
    
    user_parts.append(
        "\n\nBased on all available data and visualizations, provide 4-6 detailed insights covering:\n"
        "• Performance strengths and specific achievements\n"
        "• Areas needing immediate attention\n"
        "• Individual player highlights or concerns\n"
        "• Tactical adjustments for upcoming matches\n"
        "• Specific drills or practice focus areas\n"
        "\nBe specific with numbers and player names. Keep a constructive, coaching-oriented tone."
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
        temperature=0.7,  # Slightly lower for more focused output
        eos_token_id=tok.eos_token_id,
        pad_token_id=tok.eos_token_id if tok.eos_token_id is not None else tok.pad_token_id,
        return_full_text=False,
    )

    # Extract text
    text = out[0]["generated_text"]

    if text.startswith(prompt):
        text = text[len(prompt):].lstrip()

    # Ensure bullets if needed
    if "•" not in text and "-" not in text and "1." not in text:
        lines = [l.strip() for l in text.split(". ") if l.strip()]
        if lines:
            bullets = "\n".join(f"• {l.rstrip('.')}" for l in lines[:6])
            return bullets

    # Validate output
    if not text or len(text.strip()) < 50:
        return "Commentary unavailable"

    return text

def generate_commentary(
        summary: UISummary,
        meta: Meta,
        hf_token: str,
        images: Sequence[ImageRef],
        plot_data: Dict[str, Any] | List[Dict[str, Any]],
        vision_model_id: str = "HuggingFaceTB/SmolVLM-Instruct",
        text_model_id: str = "HuggingFaceTB/SmolVLM-Instruct",
        max_new_tokens: int = 512
) -> str:
    """
    Main wrapper function for commentary generation.
    Handles all the edge cases and calls generate_commentary_with_plots.
    """
    # Handle missing parameters
    if not hf_token:
        return "Commentary unavailable - no API token provided"
    
    if images is None:
        images = []
    
    # If no plot data, return basic statistical commentary
    if not plot_data:
        return "Commentary unavailable"
    
    try:
        # Main commentary generation with plots
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
    except Exception as e:
        print(f"Commentary generation failed: {e}")
        return "Commentary unavailable"
