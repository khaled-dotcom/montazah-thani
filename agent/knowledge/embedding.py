"""
embedding.py
Generates embeddings for approved knowledge using the local fastembed model.

Embedding input = Name + Description + Keywords + Aliases (combined into search_text).
"""

import logging

from llm.embeddings import embed_document, get_dimension

from .schemas import ApprovedKnowledge

logger = logging.getLogger(__name__)


def build_embedding_text(name: str, approved: ApprovedKnowledge) -> str:
    """Combines Name + Description + Keywords + Aliases into search_text string."""
    if approved.search_text:
        return approved.search_text

    aliases_str = (
        ", ".join(approved.aliases)
        if isinstance(approved.aliases, list)
        else str(approved.aliases or "")
    )
    keywords_str = (
        ", ".join(approved.keywords)
        if isinstance(approved.keywords, list)
        else str(approved.keywords or "")
    )

    return (
        f"{name}\n{approved.description}\n"
        f"المرادفات والأسماء البديلة: {aliases_str}\n"
        f"الكلمات المفتاحية: {keywords_str}"
    ).strip()


def generate_embedding(name: str, approved: ApprovedKnowledge) -> list[float]:
    text_input = build_embedding_text(name, approved)
    embedding = embed_document(text_input)

    expected = get_dimension()
    if len(embedding) != expected:
        raise ValueError(
            f"Embedding model returned {len(embedding)} dimensions but the vector "
            f"table expects {expected}. Check EMBEDDING_MODEL / EMBEDDING_DIM."
        )

    logger.info("Generated embedding of length %s for '%s'", len(embedding), name)
    return embedding
