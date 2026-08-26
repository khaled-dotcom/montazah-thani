"""
llm/model.py

موديل المحادثة — Groq.

كل عقد الـ agent بتنادي get_llm(). الموديل والحرارة بيتحددوا من متغيرات البيئة
عشان تقدر تبدّل الموديل من غير ما تلمس الكود.
"""

import os

from langchain_groq import ChatGroq

# الافتراضي: gpt-oss-120b — التزام عالي بالتعليمات ودعم tool calling،
# واللي بيعتمد عليه with_structured_output في كل العقد.
DEFAULT_MODEL = "openai/gpt-oss-120b"

# التسعير بالدولار لكل مليون توكن (input, output) — من صفحة أسعار Groq.
# لو غيّرت الموديل لواحد مش في الجدول، حط سعره في GROQ_PRICE_IN / GROQ_PRICE_OUT.
MODEL_PRICING = {
    "llama-3.3-70b-versatile": (0.59, 0.79),
    "llama-3.1-8b-instant":    (0.05, 0.08),
    "openai/gpt-oss-120b":     (0.15, 0.75),
    "openai/gpt-oss-20b":      (0.10, 0.50),
}

FALLBACK_PRICING = (0.15, 0.75)


def get_model_name() -> str:
    return os.environ.get("GROQ_MODEL", DEFAULT_MODEL)


def get_pricing() -> tuple[float, float]:
    """
    Returns (input, output) USD per 1M tokens for the configured model.
    Env overrides win, so a model missing from the table is never a blocker.
    """
    model = get_model_name()
    default_in, default_out = MODEL_PRICING.get(model, FALLBACK_PRICING)

    def _read(env_key: str, default: float) -> float:
        raw = os.environ.get(env_key)
        if not raw:
            return default
        try:
            return float(raw)
        except ValueError:
            return default

    return (
        _read("GROQ_PRICE_IN", default_in),
        _read("GROQ_PRICE_OUT", default_out),
    )


# الموديلات اللي بتدعم response_format=json_schema على Groq.
# الباقي بيستخدم function calling.
#
# ليه الفرق مهم: gpt-oss موديل استدلالي، ومع function calling بيسرّب
# تفكيره مكان الـ JSON فالطلب بيفشل بـ tool_use_failed. مع json_schema
# التوليد بيتقيّد بالمخطط فبيشتغل. وllama-3.3 بالعكس تمامًا —
# بيدعم function calling بس ومش بيدعم json_schema.
JSON_SCHEMA_MODELS = {
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "moonshotai/kimi-k2-instruct",
}


def get_structured_method(model: str | None = None) -> str:
    """The structured-output method that actually works for a given model."""
    override = os.environ.get("GROQ_STRUCTURED_METHOD")
    if override:
        return override

    model = model or get_model_name()

    if model in JSON_SCHEMA_MODELS or model.startswith("meta-llama/llama-4"):
        return "json_schema"

    return "function_calling"


def structured(llm: ChatGroq, schema, include_raw: bool = True, model: str | None = None):
    """
    Wraps with_structured_output with the right method for the given model,
    so switching GROQ_MODEL never silently breaks every node.
    """
    return llm.with_structured_output(
        schema,
        method=get_structured_method(model),
        include_raw=include_raw,
    )


def invoke_structured(schema, messages, include_raw: bool = True):
    """
    Runs a structured-output call, walking the model chain on failure.

    Returns (parsed, raw). Raises only if every model in the chain failed —
    the caller still needs its own fallback reply for that case.

    Retrying matters because the two failure modes here are both transient or
    model-specific: a daily quota that a different model does not share, and a
    weaker model emitting JSON that does not validate.
    """
    chain = get_model_chain()
    last_error = None

    for index, model in enumerate(chain):
        try:
            llm = get_llm(model=model)
            structured_llm = structured(llm, schema, include_raw=include_raw, model=model)
            result = structured_llm.invoke(messages)

            if index > 0:
                print(f"[LLM] recovered on fallback model '{model}'", flush=True)

            if not include_raw:
                return result, None

            parsed = result.get("parsed")
            if parsed is None:
                raise ValueError(
                    f"model returned no parsed output: {result.get('parsing_error')}"
                )

            return parsed, result.get("raw")

        except Exception as e:
            last_error = e
            reason = str(e)[:130]
            print(f"[LLM] model '{model}' failed: {reason}", flush=True)

    raise RuntimeError(f"All models failed. Last error: {last_error}")


# ترتيب الموديلات: الأساسي وبعده البدائل.
#
# كل موديل على Groq ليه حصة يومية مستقلة، فلو الأساسي رجّع 429 أو فشل في
# توليد JSON صالح، بننتقل للي بعده بدل ما المواطن يقف في نص تسجيل بلاغ.
# الترتيب من الأقوى للأضعف — الأضعف أحسن من لا شيء.
# Groq retires models, and a fallback that 404s is worse than no fallback: the
# chain spends a round trip discovering it before moving on, while a citizen
# waits. `flask check-models` verifies this list against the account — run it
# after any Groq deprecation notice.
DEFAULT_FALLBACKS = [
    "openai/gpt-oss-20b",
    "qwen/qwen3.6-27b",
]


def get_model_chain() -> list[str]:
    raw = os.environ.get("GROQ_MODEL_FALLBACKS")
    fallbacks = (
        [m.strip() for m in raw.split(",") if m.strip()]
        if raw is not None
        else list(DEFAULT_FALLBACKS)
    )

    primary = get_model_name()
    chain = [primary] + [m for m in fallbacks if m != primary]
    return chain


def get_llm(temperature: float | None = None, model: str | None = None) -> ChatGroq:
    api_key = os.environ.get("GROQ_API_KEY")

    if not api_key:
        raise ValueError("GROQ_API_KEY must be set in the environment variables.")

    return ChatGroq(
        model=model or get_model_name(),
        api_key=api_key,
        # حرارة صفر: كل العقد بترجع structured output، والثبات أهم من التنويع
        temperature=float(os.environ.get("GROQ_TEMPERATURE", "0")) if temperature is None else temperature,
        # Groq بيرجّع 429 كتير على الخطط المجانية — نعيد المحاولة بدل ما
        # المواطن يشوف رسالة خطأ
        max_retries=int(os.environ.get("GROQ_MAX_RETRIES", "3")),
        timeout=float(os.environ.get("GROQ_TIMEOUT", "45")),
    )
