"""
llm/embeddings.py

الـ embeddings بتتولّد محليًا على السيرفر باستخدام fastembed (ONNX) —
مش عبر API.

ليه محلي: Groq بيقدّم موديلات محادثة بس، ومالوش endpoint للـ embeddings.
بدل ما نضيف مزوّد تاني ومفتاح تاني عشان البحث الدلالي بس، بنشغّل موديل
صغير متعدد اللغات جوّه السيرفر: مفيش تكلفة، مفيش استدعاء شبكة في مسار
البحث، وبيشتغل من غير إنترنت بعد أول تحميل.

الافتراضي multilingual-e5-large (1024 بُعد، ~2.2GB). الحجم كبير، لكن
الموديلات الأصغر اتقاست على استعلامات مصرية عامية حقيقية وفشلت:
paraphrase-multilingual-MiniLM (384 بُعد، 220MB) جاب 1 من 3 صح،
وe5-large جاب 3 من 3 — "عايز اطلع تصريح مزاولة نشاط" لازم توصل
لـ"ترخيص محل تجاري"، والصغير كان بيوديها لـ"ترخيص لافتة".

لو الحجم مشكلة، غيّر EMBEDDING_MODEL — الكود بيظبط الأبعاد والبادئات
لوحده — بس اعرف إن البحث الدلالي هيبقى ضعيف، والبحث النصي بالمرادفات
هو اللي هيشيل الحمل.
"""

import logging
import os
import threading

logger = logging.getLogger(__name__)

DEFAULT_MODEL = "intfloat/multilingual-e5-large"

# أبعاد كل موديل مدعوم. الجدول ده مصدر الحقيقة لعمود pgvector كمان،
# فأي تغيير في الموديل بيغيّر شكل الجدول أوتوماتيك.
MODEL_DIMENSIONS = {
    "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2": 384,
    "sentence-transformers/paraphrase-multilingual-mpnet-base-v2": 768,
    "intfloat/multilingual-e5-large": 1024,
}

DEFAULT_DIMENSION = 1024

_model = None
_model_lock = threading.Lock()


def get_model_name() -> str:
    return os.environ.get("EMBEDDING_MODEL", DEFAULT_MODEL)


def get_dimension() -> int:
    """
    أبعاد المتجه للموديل المضبوط. EMBEDDING_DIM بيغلب الجدول عشان
    تقدر تستخدم موديل مش مدرج من غير ما تعدّل الكود.
    """
    raw = os.environ.get("EMBEDDING_DIM")
    if raw:
        try:
            return int(raw)
        except ValueError:
            pass

    return MODEL_DIMENSIONS.get(get_model_name(), DEFAULT_DIMENSION)


def _needs_e5_prefix() -> bool:
    """
    موديلات e5 مدرّبة ببادئات "query:" و"passage:" وبتفقد دقة ملحوظة
    من غيرها. باقي الموديلات بتاخد النص زي ما هو.
    """
    return "e5" in get_model_name().lower()


def get_embedding_model():
    """
    Loads the ONNX model once per process and caches it.

    First call downloads the model (a few hundred MB) — that is why it is
    lazy and locked: two concurrent chat requests must not both download it.
    """
    global _model

    if _model is not None:
        return _model

    with _model_lock:
        if _model is not None:
            return _model

        from fastembed import TextEmbedding

        model_name = get_model_name()
        logger.info("Loading embedding model '%s' (first run downloads it)...", model_name)

        _model = TextEmbedding(
            model_name=model_name,
            cache_dir=os.environ.get("EMBEDDING_CACHE_DIR") or None,
        )

        logger.info("Embedding model ready (%s dimensions).", get_dimension())

    return _model


def _embed(text: str, prefix: str) -> list[float]:
    if not text or not text.strip():
        raise ValueError("Cannot embed empty text")

    payload = f"{prefix}{text.strip()}" if prefix else text.strip()

    model = get_embedding_model()
    vector = next(iter(model.embed([payload])))

    # fastembed بيرجّع numpy array — pgvector عايز list عادية
    return [float(x) for x in vector]


def embed_document(text: str) -> list[float]:
    """المتجه اللي بيتخزن في قاعدة البيانات لخدمة أو حي."""
    return _embed(text, "passage: " if _needs_e5_prefix() else "")


def embed_query(text: str) -> list[float]:
    """المتجه اللي بيتقارن بيه وقت البحث."""
    return _embed(text, "query: " if _needs_e5_prefix() else "")
