from __future__ import annotations
# import os, json
# from datetime import datetime
from typing import List, Dict, Any, Optional, Sequence, Tuple, cast
from dotenv import load_dotenv
from dataclasses import dataclass
from types_common import UISummary, Meta, ImageRef
# from openai import OpenAI
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
from transformers.pipelines.text_generation import TextGenerationPipeline
from transformers.tokenization_utils_base import PreTrainedTokenizerBase
from transformers.modeling_utils import PreTrainedModel
import torch

load_dotenv()
# OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
# client = OpenAI(api_key=OPENAI_API_KEY)

# Singletons so we don't reload on every request
_MODEL: Optional[PreTrainedModel] = None
_TOKENIZER: Optional[PreTrainedTokenizerBase] = None
_PIPE: Optional[TextGenerationPipeline] = None

def _load_model_and_tokenizer(
        model_id: str,
        hf_token: Optional[str]
) -> Tuple[TextGenerationPipeline, PreTrainedTokenizerBase]:
    """Load model/tokenizer WITHOUT device_map/offload so Accelerate won't engage."""
    global _PIPE, _TOKENIZER, _MODEL

    # If already initialized, return both — not just the pipeline.
    if _PIPE is not None and _TOKENIZER is not None:
        return _PIPE, _TOKENIZER

    common_kwargs = {}
    if hf_token:
        common_kwargs["token"] = hf_token  # <— replaces deprecated use_auth_token

    # Choose dtype sensibly: fp16 on CUDA, fp32 otherwise
    use_cuda = torch.cuda.is_available()
    dtype = torch.float16 if use_cuda else torch.float32

    # Load CPU-first to avoid accelerate paths
    _TOKENIZER = AutoTokenizer.from_pretrained(model_id, **common_kwargs)
    _MODEL = AutoModelForCausalLM.from_pretrained(
        model_id,
        torch_dtype=dtype,  # to best suit my laptop gpu/cpu if unavailable
        **common_kwargs)

    # --- Narrow types for the checker ---
    assert _TOKENIZER is not None
    assert _MODEL is not None

    # Ensure pad token is set
    if _TOKENIZER.pad_token_id is None:
        if _TOKENIZER.eos_token_id is not None:
            _TOKENIZER.pad_token = _TOKENIZER.eos_token
        else:
            _TOKENIZER.add_special_tokens({"pad_token": "<|pad|>"})
            _MODEL.resize_token_embeddings(len(_TOKENIZER))
    
    # 3070 GPU
    if use_cuda:
        _MODEL = _MODEL.to(torch.device("cuda:0"))  # type: ignore

    _PIPE = TextGenerationPipeline(
        task="text-generation",
        model=_MODEL,
        tokenizer=_TOKENIZER,
        # reasonable defaults for short commentary
        max_new_tokens=120,
        do_sample=True,
        temperature=0.8,
        top_p=0.95,
        device = 0 if use_cuda else -1,  # runs on GPU if available
    )
    return _PIPE, _TOKENIZER

@dataclass
class AgentResponse:
    commentary: str
    requests: List[Dict[str, Any]]  # e.g., [{"plot":"offense", "player":"Alice"}]


def build_agent_context(
        summary: UISummary,
        meta: Meta,
        images: Sequence[ImageRef]
) -> str:
    """
    Turn summary/meta/images into a compact text description
    suitable for prompting the model.
    """
    parts: list[str] = []
    parts.append(f"Rows: {summary['rows']}, Players: {len(summary['players'])}, "
                 f"Date range: {summary['date_min']} → {summary['date_max']}")
    parts.append(f"Columns: {', '.join(meta.get('columns', []))}")
    if images:
        parts.append(f"{len(images)} plot(s) attached.")
    return "\n".join(parts)

def generate_commentary(
        summary: UISummary,
        meta: Meta,
        images: Optional[Sequence[ImageRef]] = None,
        model_id: str = "meta-llama/Meta-Llama-3-8B-Instruct",      # default to a smaller model
        hf_token: Optional[str] = None,               # pass your HF token if model is gated
        max_new_tokens: int = 256,
    ) -> str:
    # ------- Build system/user content -------
    context = build_agent_context(summary, meta, images or [])
    system = (
        "You are a data analyst agent with an extensive volleyball coaching backgroundd. Provide crisp, objective insights, "
        "noting distributions, outliers, missingness, correlations, and potential caveats."
        "Make sure to keep a positive and supportive tone, providing criticism but showing opportunities for growth."
    )
    user = (
        f"Dataset rows={meta.get('rows', summary.get('rows', 0))}, "
        f"cols={meta.get('cols', 0)}.\n"
        f"Highlights:\n{context}\n"
        "Write 3–6 bullet points with insights and suggested next steps. "
        "Flag data quality issues."
    )

    # ------- Load tokenizer/model & pipeline -------
    pipe, tok = _load_model_and_tokenizer(
        model_id=model_id,
        hf_token=hf_token
    )

    # ------- Chat formatting (preferred) -------
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]

    try:
        # Many chat models ship a chat template
        prompt:str = cast(str, tok.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True,
        ))
    except Exception:
        # Fallback for base/older models: inline our own prompt
        prompt = (
            f"[System]\n{system}\n\n"
            f"[User]\n{user}\n\n"
            "Assistant:"
        )

    # ------- Generate -------
    out = pipe(
        prompt,
        max_new_tokens=max_new_tokens,
        do_sample=True,
        eos_token_id=tok.eos_token_id,
        pad_token_id=tok.eos_token_id if tok.eos_token_id is not None else tok.pad_token_id,
        return_full_text=False,   # only the completion
    )

    # String output
    text = out[0]["generated_text"]

    # if your prompt is included in the return, strip it off:
    if text.startswith(prompt):
        text = text[len(prompt):].lstrip()

    # Ensure bullets (3–6) even if model replies with a paragraph
    if "•" not in text and "-" not in text:
        lines = [l.strip() for l in text.split(". ") if l.strip()]
        bullets = "\n".join(f"• {l.rstrip('.')}" for l in lines[:6])
        return bullets

    return text

# Example OpenAI wiring if you have a key:
# from openai import OpenAI
# client = OpenAI(api_key=OPENAI_API_KEY)
# def generate_commentary(...):
#   resp = client.chat.completions.create(
#       model="gpt-4o-mini",
#       messages=[{"role":"system","content":"You are a volleyball analytics analyst."},
#                 {"role":"user","content": json.dumps({"summary": summary, "player_stats": player_stats})}]
#   )
#   text = resp.choices[0].message.content
#   return AgentResponse(commentary=text, requests=[])
