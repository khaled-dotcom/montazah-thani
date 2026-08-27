from dataclasses import dataclass
from typing import Optional


@dataclass
class AgentResponse:
    response:              str
    intent:                Optional[str]
    complaint_saved:       Optional[bool]
    appointment_saved:     Optional[bool]
    complaint_reference:   Optional[str]
    appointment_reference: Optional[str]
    # وصف الفورم اللي بيتعرض تحت الرد، أو None — شكله في graph/forms.py
    form:                  Optional[dict]
    usage:                 dict

    @staticmethod
    def from_result(result: dict) -> "AgentResponse":
        usage = {
            "intent":      result.get("intent_usage")      or {},
            "inquiry":     result.get("inquiry_usage")     or {},
            "complaint":   result.get("complaint_usage")   or {},
            "appointment": result.get("appointment_usage") or {},
            "direct":      result.get("direct_usage")      or {},
        }

        return AgentResponse(
            response              = result.get("response") or "",
            intent                = result.get("intent"),
            complaint_saved       = result.get("complaint_saved"),
            appointment_saved     = result.get("appointment_saved"),
            complaint_reference   = result.get("complaint_reference"),
            appointment_reference = result.get("appointment_reference"),
            form                  = result.get("form"),
            usage                 = usage,
        )

    def to_dict(self) -> dict:
        return {
            "response":              self.response,
            "intent":                self.intent,
            "complaint_saved":       self.complaint_saved,
            "appointment_saved":     self.appointment_saved,
            "complaint_reference":   self.complaint_reference,
            "appointment_reference": self.appointment_reference,
            "form":                  self.form,
            "usage":                 self.usage,
        }
