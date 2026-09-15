from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class TriageRecommendation:
    level: str
    action: str
    rationale: str
    rules: tuple[str, ...]

    def as_dict(self) -> dict[str, object]:
        return {
            "level": self.level,
            "action": self.action,
            "rationale": self.rationale,
            "rules": list(self.rules),
        }


def _numbers(blood_pressure: str) -> tuple[int, int] | None:
    match = re.fullmatch(r"\s*(\d{2,3})\s*/\s*(\d{2,3})\s*", blood_pressure)
    if not match:
        return None
    return int(match.group(1)), int(match.group(2))


def infer_triage(
    *,
    age: int,
    temperature: float,
    blood_pressure: str,
    symptoms: str,
) -> TriageRecommendation:
    """Apply conservative, explainable first-contact triage rules.

    This is decision support, not a diagnosis. Rules intentionally escalate
    when a vital sign or symptom indicates a possible immediate threat.
    """
    normalized = re.sub(r"[^a-z0-9]+", " ", symptoms.lower()).strip()
    pressure = _numbers(blood_pressure)
    systolic, diastolic = pressure or (None, None)
    emergency_rules: list[str] = []

    red_flags = {
        "difficulty breathing": "difficulty breathing",
        "shortness of breath": "difficulty breathing",
        "breathlessness": "difficulty breathing",
        "chest pain": "chest pain",
        "convulsion": "convulsion",
        "seizure": "convulsion",
        "unconscious": "altered consciousness",
        "confusion": "altered consciousness",
        "severe bleeding": "severe bleeding",
        "cannot drink": "unable to drink",
    }
    for phrase, rule_name in red_flags.items():
        if phrase in normalized and rule_name not in emergency_rules:
            emergency_rules.append(rule_name)

    if temperature >= 40 or temperature < 35:
        emergency_rules.append("critical temperature")
    if systolic is not None and diastolic is not None:
        if systolic >= 180 or diastolic >= 120:
            emergency_rules.append("severely elevated blood pressure")
        if systolic < 90 or diastolic < 60:
            emergency_rules.append("low blood pressure")

    if emergency_rules:
        return TriageRecommendation(
            level="emergency",
            action="Refer immediately for emergency assessment and do not delay transfer.",
            rationale="Possible danger sign: " + ", ".join(emergency_rules) + ".",
            rules=tuple(emergency_rules),
        )

    urgent_rules: list[str] = []
    if temperature >= 38.5:
        urgent_rules.append("high fever")
    if age < 5 or age >= 65:
        urgent_rules.append("higher-risk age group")
    for phrase in ("persistent vomiting", "severe dehydration", "unable to eat"):
        if phrase in normalized:
            urgent_rules.append(phrase)

    if urgent_rules:
        return TriageRecommendation(
            level="urgent",
            action="Assess promptly today, provide appropriate first-line care, and arrange referral if worsening.",
            rationale="Needs same-day review because of " + ", ".join(urgent_rules) + ".",
            rules=tuple(urgent_rules),
        )

    return TriageRecommendation(
        level="routine",
        action="Continue routine assessment, provide guideline-based care, and give safety-net advice.",
        rationale="No immediate danger sign was identified from the recorded inputs.",
        rules=(),
    )