from sqlalchemy import text
from rapidfuzz import fuzz

from knowledge.utils import main_session
from knowledge.schemas import EntityType
from search.preprocess.normalize import normalize
from search.preprocess.ngram import ngram_similarity
from ..schemas import SearchResult

TABLE_BY_TYPE = {
    EntityType.SERVICE: "city_services",
    EntityType.DISTRICT: "districts",
}

MIN_SCORE = 0.45  # final score (0-1)


def _split_aliases(raw) -> list[str]:
    """
    alias_names is stored as free text (comma / newline separated).
    Returns the individual alias strings.
    """
    if not raw:
        return []
    if isinstance(raw, (list, tuple)):
        return [str(x) for x in raw if x]
    return [
        part.strip()
        for part in str(raw).replace("\n", ",").split(",")
        if part.strip()
    ]


def _best_score(query_variants: list[str], name_variants: list[str]) -> float:
    """
    Scores every (query variant, stored name variant) pair and keeps the best.
    Each pair is scored as the mean of rapidfuzz and character n-gram similarity.
    """
    best = 0.0

    for q in query_variants:
        for n in name_variants:
            if not q or not n:
                continue

            rapid = max(
                fuzz.partial_ratio(q, n),
                fuzz.token_set_ratio(q, n),
            ) / 100

            ngram = ngram_similarity(q, n)
            score = (rapid + ngram) / 2

            if score > best:
                best = score

    return best


def fuzzy_search(
    query: str,
    aliases: list[str] | None = None,
    entity_types: list[EntityType] | None = None,
    limit: int = 2,
) -> list[SearchResult]:

    # الاستعلام نفسه + المرادفات اللي ولّدها الـ intent node
    query_variants = [normalize(query)]
    for alias in (aliases or []):
        normalized_alias = normalize(alias)
        if normalized_alias and normalized_alias not in query_variants:
            query_variants.append(normalized_alias)

    query_variants = [q for q in query_variants if q]

    if not query_variants:
        return []

    results = []

    types_to_search = entity_types or [
        EntityType.SERVICE,
        EntityType.DISTRICT,
    ]

    with main_session() as session:

        for entity_type in types_to_search:

            table = TABLE_BY_TYPE[entity_type]

            rows = session.execute(
                text(f"""
                    SELECT id, name, alias_names
                    FROM {table}
                    WHERE is_active IS TRUE
                """)
            ).fetchall()

            scored = []

            for row in rows:

                # الاسم الرسمي + كل الأسماء البديلة المخزّنة
                name_variants = [normalize(row.name)]
                for alias in _split_aliases(row.alias_names):
                    normalized_alias = normalize(alias)
                    if normalized_alias:
                        name_variants.append(normalized_alias)

                final_score = _best_score(query_variants, name_variants)

                if final_score >= MIN_SCORE:
                    scored.append((row, final_score))

            scored.sort(key=lambda x: x[1], reverse=True)

            for row, final_score in scored[:limit]:
                results.append(
                    SearchResult(
                        id=row.id,
                        type=entity_type,
                        name=row.name,
                        score=round(final_score, 3),
                        source="fuzzy",
                    )
                )

    results.sort(key=lambda x: x.score, reverse=True)

    return results[:limit]
