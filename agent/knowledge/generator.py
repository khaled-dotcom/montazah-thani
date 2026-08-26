"""
generator.py
Calls Groq to generate structured knowledge for a service or district.
"""

import logging

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import ValidationError

from llm.model import invoke_structured

from .prompts import SYSTEM_PROMPT, build_generation_prompt, build_regeneration_prompt
from .schemas import GeneratedKnowledge, KnowledgeGenerationRequest

logger = logging.getLogger(__name__)

MAX_RETRIES = 2


def _call_llm(prompt: str) -> GeneratedKnowledge:
    """
    Uses structured output rather than parsing raw JSON, so a stray markdown
    fence or a trailing comment can no longer break generation.
    """
    parsed, _ = invoke_structured(
        GeneratedKnowledge,
        [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=prompt)],
        include_raw=False,
    )
    return parsed


def _generate_with_retries(prompt: str, label: str) -> GeneratedKnowledge:
    last_error = None

    for attempt in range(1, MAX_RETRIES + 2):
        try:
            result = _call_llm(prompt)

            if result is None:
                raise ValueError("Model returned no structured output")

            return result

        except (ValidationError, ValueError) as e:
            last_error = e
            logger.warning("%s attempt %s failed: %s", label, attempt, e)

        except Exception as e:
            # أخطاء الشبكة والحدود — نبلّغ فورًا بدل ما نعيد المحاولة
            # على حاجة مش هتتصلح بالتكرار
            logger.error("%s failed with a non-retryable error: %s", label, e)
            raise RuntimeError(f"فشل الاتصال بالموديل: {e}") from e

    raise RuntimeError(f"Failed to produce valid knowledge after retries: {last_error}")


def generate_knowledge(request: KnowledgeGenerationRequest) -> GeneratedKnowledge:
    """
    Calls the LLM to generate knowledge for a new service or district.
    Retries a couple of times if the model returns a malformed object.
    """
    prompt = build_generation_prompt(
        name=request.name,
        entity_type=request.entity_type.value,
        category=request.category,
        department=request.department,
        required_documents=request.required_documents,
        duration=request.duration,
    )

    result = _generate_with_retries(prompt, "Generation")
    result.construct_search_text(request.name)
    return result


def regenerate_knowledge(
    request: KnowledgeGenerationRequest,
    previous_output: GeneratedKnowledge,
    admin_feedback: str | None = None,
) -> GeneratedKnowledge:
    """Used by the 'Generate Again' button on the review page."""
    prompt = build_regeneration_prompt(
        name=request.name,
        entity_type=request.entity_type.value,
        category=request.category,
        department=request.department,
        required_documents=request.required_documents,
        duration=request.duration,
        previous_output=previous_output.model_dump(),
        admin_feedback=admin_feedback,
    )

    return _generate_with_retries(prompt, "Regeneration")
