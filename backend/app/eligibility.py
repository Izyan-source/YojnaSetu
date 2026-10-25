"""Deterministic evaluation of explicitly encoded scheme rules."""

from typing import Any, Dict, List, Mapping, Optional


PASS = "PASS"
FAIL = "FAIL"
UNKNOWN = "UNKNOWN"

POTENTIALLY_ELIGIBLE = "POTENTIALLY_ELIGIBLE"
NOT_ELIGIBLE = "NOT_ELIGIBLE"
UNDETERMINED = "UNDETERMINED"


def evaluate_rule(rule: Mapping[str, Any], profile: Mapping[str, Any]) -> Dict[str, Any]:
    """Return one rule result; absent or unusable profile information is UNKNOWN."""
    attribute = rule["attribute"]
    actual = profile.get(attribute)
    operator = rule["operator"]
    expected = rule.get("value")

    if actual is None or actual == "":
        status = UNKNOWN
        explanation = "Cannot assess this condition because the required profile information was not provided."
    else:
        try:
            if operator == "min":
                matched = actual >= expected
            elif operator == "max":
                matched = actual <= expected
            elif operator == "equals":
                matched = _normalized(actual) == _normalized(expected)
            elif operator == "in":
                matched = _normalized(actual) in {_normalized(item) for item in expected}
            elif operator == "state_in":
                matched = _normalized(actual) in {_normalized(item) for item in expected}
            else:
                status = UNKNOWN
                explanation = "This rule uses an unsupported operator and was not evaluated."
                return _rule_result(rule, status, explanation)
        except (TypeError, ValueError):
            status = UNKNOWN
            explanation = "The supplied profile value could not be compared with this condition."
        else:
            status = PASS if matched else FAIL
            explanation = (
                "The supplied information meets this condition."
                if matched
                else "The supplied information does not meet this condition."
            )

    return _rule_result(rule, status, explanation)


def _normalized(value: Any) -> Any:
    return value.strip().casefold() if isinstance(value, str) else value


def _rule_result(rule: Mapping[str, Any], status: str, explanation: str) -> Dict[str, Any]:
    return {
        "rule_id": rule["rule_id"],
        "label": rule["label"],
        "attribute": rule["attribute"],
        "status": status,
        "mandatory": bool(rule.get("mandatory", True)),
        "explanation": explanation,
    }


def evaluate_scheme(scheme: Mapping[str, Any], profile: Mapping[str, Any]) -> Dict[str, Any]:
    rule_results = [evaluate_rule(rule, profile) for rule in scheme.get("eligibility_rules", [])]
    mandatory_results = [result for result in rule_results if result["mandatory"]]

    if any(result["status"] == FAIL for result in mandatory_results):
        status = NOT_ELIGIBLE
        summary = "At least one encoded mandatory condition was not met."
    elif not mandatory_results or any(result["status"] == UNKNOWN for result in mandatory_results):
        status = UNDETERMINED
        summary = "More information is needed to assess all encoded mandatory conditions."
    else:
        status = POTENTIALLY_ELIGIBLE
        summary = "The supplied information meets the encoded mandatory conditions; this is not an official eligibility decision."

    return {
        "scheme_id": scheme["scheme_id"],
        "name": scheme["name"],
        "status": status,
        "summary": summary,
        "rule_results": rule_results,
        "document_readiness": {
            "status": "NOT_ASSESSED",
            "required_documents": scheme.get("required_documents", []),
            "note": scheme.get("documents_note", "Document requirements have not been assessed."),
        },
        "source_references": [
            {
                "name": scheme["name"],
                "url": scheme["official_source_url"],
                "verification_status": scheme["source_verification_status"],
            }
        ],
    }


def evaluate_all(schemes: List[Mapping[str, Any]], profile: Mapping[str, Any]) -> List[Dict[str, Any]]:
    return [evaluate_scheme(scheme, profile) for scheme in schemes]
