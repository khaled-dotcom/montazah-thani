import logging

from sqlalchemy import text

from knowledge.schemas import EntityType
from knowledge.utils import vector_session
from llm.embeddings import embed_query
from ..schemas import SearchResult

logger = logging.getLogger(__name__)


def _to_pgvector_literal(vector: list[float]) -> str:
    return "[" + ",".join(str(x) for x in vector) + "]"


def semantic_search(
    query: str,
    description: str | None = None,
    entity_types: list[EntityType] | None = None,
    limit: int = 3,
) -> list[SearchResult]:

    if not query.strip():
        return []

    search_text = query.strip()

    if description:
        search_text += "\n" + description.strip()

    try:
        query_vector = _to_pgvector_literal(embed_query(search_text))

    except Exception as exc:
        # لو الموديل مش متحمّل أو حصل خطأ، البحث النصي لوحده بيكمّل
        logger.warning("[Semantic Search] Embedding generation failed: %s", exc)
        return []

    types_to_search = entity_types or [
        EntityType.SERVICE,
        EntityType.DISTRICT,
    ]

    type_values = [t.value for t in types_to_search]

    results: list[SearchResult] = []

    try:

        with vector_session() as session:

            rows = session.execute(
                text("""
                    SELECT
                        id,
                        type,
                        name,
                        1 - (embedding <=> CAST(:query_vector AS vector)) AS similarity
                    FROM knowledge_vectors
                    WHERE type = ANY(:types)
                    ORDER BY embedding <=> CAST(:query_vector AS vector)
                    LIMIT :limit
                """),
                {
                    "query_vector": query_vector,
                    "types": type_values,
                    "limit": limit,
                },
            ).fetchall()

            for row in rows:
                results.append(
                    SearchResult(
                        id=row.id,
                        type=EntityType(row.type),
                        name=row.name,
                        score=round(float(row.similarity), 3),
                        source="semantic",
                    )
                )

    except Exception as exc:
        logger.warning("[Semantic Search] Vector search failed: %s", exc)

    return results
