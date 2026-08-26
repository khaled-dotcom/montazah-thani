"""
importer.py

Loads the district website's exported content into the assistant's database.

The knowledge pipeline normally runs an LLM over a bare service row to invent a
description, aliases and keywords, and an administrator approves the result.
Nothing needs inventing here: the website already publishes a description, the
document list, the steps and the timescale, in the district's own words. So the
generation and approval stages are skipped and the site's text is written
straight in — which makes an import deterministic, repeatable, and free of any
risk that a model rewrites a fee into existence.

The knowledge columns are written through the ORM rather than through
knowledge.updater, because `alias_names` and `keywords` are TEXT columns that
search/engines/fuzzy_search.py reads as comma-separated free text. Writing them
as text here keeps the writer and the reader agreeing on one format.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from typing import Any, Iterable

from knowledge.embedding import generate_embedding
from knowledge.schemas import ApprovedKnowledge, EntityType, GeneratedKnowledge, VectorMetadata
from knowledge.vector_store import upsert_vector
from models.models import CityService, District, db

DEFAULT_FILE = os.path.join(os.path.dirname(__file__), "montazah-thani.json")


@dataclass
class ImportReport:
    district: str = ""
    district_id: int | None = None
    created: list[str] = field(default_factory=list)
    updated: list[str] = field(default_factory=list)
    retired: list[str] = field(default_factory=list)
    embedded: int = 0
    problems: list[str] = field(default_factory=list)

    def lines(self) -> Iterable[str]:
        yield f"District : {self.district} (id={self.district_id})"
        yield f"Created  : {len(self.created)}"
        for name in self.created:
            yield f"           + {name}"
        yield f"Updated  : {len(self.updated)}"
        for name in self.updated:
            yield f"           ~ {name}"
        if self.retired:
            yield f"Retired  : {len(self.retired)}"
            for name in self.retired:
                yield f"           - {name}"
        yield f"Embedded : {self.embedded}"
        for problem in self.problems:
            yield f"           ! {problem}"


def _clean(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _as_text_list(value: Any) -> str | None:
    """A list of aliases or keywords as the comma-separated text the search reads."""
    if not value:
        return None
    if isinstance(value, (list, tuple)):
        parts = [str(item).strip() for item in value if str(item).strip()]
    else:
        parts = [str(value).strip()]
    return "، ".join(parts) or None


def _upsert_district(record: dict) -> District:
    """
    Matches the district on its name and fills it from the site.

    The site is the source of truth for these fields, so it overwrites them —
    but only where it actually has a value. A blank in the export never wipes
    something a clerk typed into the dashboard.
    """
    name = _clean(record.get("name"))
    if not name:
        raise ValueError("The export has no district name")

    district = District.query.filter(District.name == name).first()

    if district is None:
        district = District(name=name)
        db.session.add(district)

    for column in ("zone", "address", "phone", "hotline", "email", "working_hours",
                   "coverage", "info"):
        value = _clean(record.get(column))
        if value:
            setattr(district, column, value)

    district.is_active = True
    db.session.commit()
    return district


def _upsert_service(record: dict, district_id: int) -> tuple[CityService, bool]:
    """Returns the row and whether it was created. Matched on name within the district."""
    name = _clean(record.get("name"))
    if not name:
        raise ValueError("A service in the export has no name")

    service = CityService.query.filter(
        CityService.name == name,
        CityService.district_id == district_id,
    ).first()

    created = service is None
    if created:
        service = CityService(name=name, district_id=district_id)
        db.session.add(service)

    service.category = _clean(record.get("category"))
    service.department = _clean(record.get("department"))
    service.required_documents = _clean(record.get("required_documents"))
    service.steps = _clean(record.get("steps"))
    service.duration = _clean(record.get("duration"))
    service.fees_note = _clean(record.get("fees_note"))
    service.is_bookable = bool(record.get("is_bookable", True))
    service.is_active = True

    # `fees` is left exactly as it is. The site publishes fee *prose* — "calculated
    # by area and use" — never a number, so there is nothing here to put in a
    # numeric column, and blanking it would erase a figure the district typed
    # into the dashboard from the current schedule.

    return service, created


def _write_knowledge(entity, record: dict) -> GeneratedKnowledge:
    """Puts the site's description, aliases and keywords on the row."""
    knowledge = GeneratedKnowledge(
        description=_clean(record.get("description")) or entity.name,
        aliases=list(record.get("aliases") or []),
        keywords=list(record.get("keywords") or []),
    )
    knowledge.construct_search_text(entity.name)

    entity.description = knowledge.description
    entity.alias_names = _as_text_list(knowledge.aliases)
    entity.keywords = _as_text_list(knowledge.keywords)
    entity.search_text = knowledge.search_text

    return knowledge


def _embed(entity, entity_type: EntityType, knowledge: GeneratedKnowledge) -> None:
    """Generates the vector for one row and upserts it into knowledge_vectors."""
    approved = ApprovedKnowledge(
        entity_id=entity.id,
        entity_type=entity_type,
        **knowledge.model_dump(),
    )
    embedding = generate_embedding(entity.name, approved)
    upsert_vector(
        VectorMetadata(id=entity.id, type=entity_type, name=entity.name),
        embedding,
    )


def import_site_knowledge(
    path: str | None = None,
    *,
    embed: bool = True,
    prune: bool = False,
) -> ImportReport:
    """
    Imports the export at `path` (default: the file beside this module).

    embed=False skips the vector stage. Semantic search is then blind to
    anything new until an import runs with embedding on — the fuzzy text search
    still finds it, so this is a way to load content on a machine that has not
    downloaded the embedding model, not a way to finish.

    prune=True deactivates services on this district that the site no longer
    publishes. Off by default, and it deactivates rather than deletes: the
    complaints and appointments already pointing at a row must survive it.
    """
    source = path or DEFAULT_FILE

    with open(source, encoding="utf-8") as handle:
        payload = json.load(handle)

    district_record = payload.get("district") or {}
    service_records = payload.get("services") or []

    report = ImportReport()

    district = _upsert_district(district_record)
    report.district = district.name
    report.district_id = district.id

    published: set[str] = set()
    pending: list[tuple[CityService, GeneratedKnowledge]] = []

    for record in service_records:
        service, created = _upsert_service(record, district.id)
        db.session.flush()  # the row needs an id before its knowledge is written
        knowledge = _write_knowledge(service, record)
        published.add(service.name)
        pending.append((service, knowledge))
        (report.created if created else report.updated).append(service.name)

    district_knowledge = _write_knowledge(district, district_record)

    if prune:
        for service in CityService.query.filter(
            CityService.district_id == district.id,
            CityService.is_active.is_(True),
        ).all():
            if service.name not in published:
                service.is_active = False
                report.retired.append(service.name)

    db.session.commit()

    # ── vectors ───────────────────────────────────────────────────────────────
    # Done after the commit so a failure here — a model that will not download,
    # a vector table on the wrong dimension — leaves the catalogue correct and
    # searchable by text, rather than rolling the whole import back.
    if embed:
        for service, knowledge in pending:
            try:
                _embed(service, EntityType.SERVICE, knowledge)
                report.embedded += 1
            except Exception as error:  # noqa: BLE001 — reported, not swallowed
                report.problems.append(f"{service.name}: {error}")

        try:
            _embed(district, EntityType.DISTRICT, district_knowledge)
            report.embedded += 1
        except Exception as error:  # noqa: BLE001
            report.problems.append(f"{district.name}: {error}")

    return report
