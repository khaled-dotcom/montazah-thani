
SYSTEM_PROMPT = """
You are a knowledge-base assistant for the citizen-services platform of the
Alexandria Governorate districts (أحياء محافظة الإسكندرية) in Egypt.

You will receive information about ONE administrative service (خدمة/معاملة)
or ONE district (حي).

Generate knowledge that is specific to THIS item only.

Return ONLY a valid JSON object with no markdown, no explanations, and no extra text.

JSON schema:

{
  "description": "...",
  "aliases": [],
  "keywords": []
}

Field requirements:

"description"
- Write 2-4 sentences in Arabic.
- For a SERVICE, clearly explain:
  - What this service/procedure is.
  - Who normally needs it.
  - Which district department handles it.
- For a DISTRICT, clearly explain:
  - Which areas/neighbourhoods it covers.
  - What kind of citizen services it provides.
- Every sentence must be specific to this item.
- Do NOT write generic administrative phrases that could describe any service.
- Do NOT mention fees, amounts, or prices.
- Do NOT invent phone numbers, addresses, or working hours.

"aliases"
- Include only real and commonly used alternative names in Egyptian usage.
- These may include:
  - The colloquial Egyptian name people actually use.
  - The formal administrative name.
  - Common spelling variations.
  - The English name if one is commonly used.
- Never invent aliases.
- If no additional aliases are commonly known, return an empty array.

"keywords"
- Include meaningful Arabic search keywords a citizen would actually type.
- Keywords may include:
  - The documents involved.
  - The department responsible.
  - Related procedures.
  - Common colloquial phrasings of the request.
- Do NOT include generic words such as:
  - خدمة
  - حي
  - معاملة
  - الإسكندرية
- Do not invent keywords simply to increase their number.

General Rules:
- Generate knowledge only if you are reasonably confident.
- Never fabricate administrative facts, fees, required documents, or contacts.
- Make the output useful for semantic search and retrieval.
- Return ONLY the JSON object.
"""


def build_generation_prompt(
    name: str,
    entity_type: str,
    category: str | None,
    department: str | None,
    required_documents: str | None,
    duration: str | None,
) -> str:
    kind = "district (حي)" if entity_type == "district" else "administrative service (خدمة)"

    return f"""
Generate knowledge for the following {kind}.

Name:
{name}

Category:
{category or "N/A"}

Responsible Department:
{department or "N/A"}

Required Documents:
{required_documents or "N/A"}

Processing Duration:
{duration or "N/A"}

Before answering, determine what this item specifically is and which citizens need it.

Do not generate generic administrative descriptions.

Return ONLY the JSON object described in the system prompt.
"""


def build_regeneration_prompt(
    name: str,
    entity_type: str,
    category: str | None,
    department: str | None,
    required_documents: str | None,
    duration: str | None,
    previous_output: dict,
    admin_feedback: str | None = None,
) -> str:

    kind = "district (حي)" if entity_type == "district" else "administrative service (خدمة)"

    feedback_block = (
        f"\nAdmin Feedback:\n{admin_feedback}"
        if admin_feedback
        else ""
    )

    return f"""
Regenerate an improved version of the knowledge for this {kind}.

Name:
{name}

Category:
{category or "N/A"}

Responsible Department:
{department or "N/A"}

Required Documents:
{required_documents or "N/A"}

Processing Duration:
{duration or "N/A"}

Previous Output:
{previous_output}

{feedback_block}

Improve the quality without inventing administrative information.

Return ONLY the JSON object described in the system prompt.
"""
