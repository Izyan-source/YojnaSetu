"""Deterministic cross-document consistency checks; findings are not fraud judgments."""

import re
from datetime import date, datetime
from typing import Any, Dict, List, Mapping, Optional, Sequence, Tuple

OCR_REVIEW_THRESHOLD = 0.7
FIELDS: Sequence[Tuple[str, str]] = (
    ("applicant_name", "Applicant name"),
    ("date_of_birth", "Date of birth"),
    ("age", "Age"),
    ("address", "Address"),
    ("state", "State"),
    ("annual_family_income_inr", "Annual family income"),
    ("certificate_type", "Certificate type"),
    ("issuing_authority", "Issuing authority"),
    ("certificate_date", "Certificate or issue date"),
    ("certificate_valid_until", "Certificate valid-until date"),
    ("certificate_number", "Certificate/reference number"),
)


def _normalize_date(value: Any) -> Optional[str]:
    text = str(value or "").strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y", "%d/%m/%y", "%d-%m-%y"):
        try:
            return datetime.strptime(text, fmt).date().isoformat()
        except ValueError:
            pass
    return None


def normalize_value(field: str, value: Any) -> Optional[str]:
    if value is None or str(value).strip() == "":
        return None
    text = str(value).strip()
    if field in ("date_of_birth", "certificate_date", "certificate_valid_until"):
        return _normalize_date(text)
    if field in ("age", "annual_family_income_inr"):
        numeric_text = text.casefold().replace("₹", "").replace("inr", "").replace("rs.", "").replace("rs", "")
        if field == "age":
            numeric_text = numeric_text.replace("years", "").replace("year", "").replace("yrs", "").replace("yr", "")
        numeric = numeric_text.replace(",", "").strip()
        if not re.fullmatch(r"\d+(?:\.\d+)?", numeric):
            return None
        if not numeric or numeric.count(".") > 1:
            return None
        if field == "age" and "." in numeric:
            return None
        try:
            amount = float(numeric)
        except ValueError:
            return None
        if field == "age" and not amount.is_integer():
            return None
        return str(int(amount)) if amount.is_integer() else format(amount, "g")
    # Ignore harmless capitalization, whitespace, and punctuation differences.
    # Reference IDs are compared without separators; other text keeps word order.
    folded = text.casefold()
    if field == "certificate_number":
        return re.sub(r"[^a-z0-9]", "", folded)
    folded = re.sub(r"[^\w\s]", " ", folded, flags=re.UNICODE)
    return " ".join(folded.split()) or None


def check_consistency(profile: Mapping[str, Any], documents: Sequence[Mapping[str, Any]]) -> Dict[str, Any]:
    findings: List[Dict[str, Any]] = []
    for field, label in FIELDS:
        sources = [{"source": "Reviewed applicant profile", "kind": "profile", "value": profile.get(field), "confidence": 1.0, "source_page": None}]
        for document in documents:
            extracted = document.get("extracted_fields", {}).get(field, {}) or {}
            sources.append({
                "source": str(document.get("filename") or "Uploaded document")
                + (" · page " + str(extracted.get("source_page")) if extracted.get("source_page") else ""),
                "kind": "document",
                "value": extracted.get("value"),
                "confidence": extracted.get("confidence"),
                "source_page": extracted.get("source_page"),
            })
        provided = [source for source in sources if source["value"] is not None and str(source["value"]).strip() != ""]
        populated = [source for source in provided if normalize_value(field, source["value"]) is not None]
        unparseable = [source for source in provided if normalize_value(field, source["value"]) is None]
        low_confidence = [source for source in provided if source["kind"] == "document" and (source["confidence"] is None or source["confidence"] < OCR_REVIEW_THRESHOLD)]
        normalized = {normalize_value(field, source["value"]) for source in populated}
        missing_sources = [source["source"] for source in sources if normalize_value(field, source["value"]) is None]
        mismatch = len(normalized) > 1

        if len(populated) < 2 or missing_sources:
            status = "MISSING_INFORMATION"
        else:
            status = "CONSISTENT"
        if low_confidence or unparseable:
            status = "UNABLE_TO_VERIFY"
            explanation = "At least one value is uncertain or could not be normalized; review the profile and original document manually before drawing a conclusion."
        elif mismatch:
            status = "POTENTIAL_MISMATCH"
            explanation = "The normalized values differ. Check the original documents and correct the reviewed profile if needed; this is not a finding of fraud or intent."
        elif missing_sources or len(populated) < 2:
            status = "MISSING_INFORMATION"
            explanation = "There are not enough values to compare across the reviewed profile and available documents."
        else:
            explanation = "The available values match after normalizing case, spacing, and harmless formatting differences."

        confidences = [source["confidence"] for source in populated if source["confidence"] is not None]
        findings.append({
            "field": field,
            "label": label,
            "status": status,
            "values": sources,
            "explanation": explanation,
            "confidence": min(confidences) if confidences and len(populated) >= 2 else None,
            "uncertainty": "high" if low_confidence or unparseable else "medium" if missing_sources or status != "CONSISTENT" else "low",
            "manual_review": bool(low_confidence or unparseable or mismatch or missing_sources),
        })

    expiry_reviews = []
    today = date.today()
    for document in documents:
        fields = document.get("extracted_fields", {})
        expiry = fields.get("certificate_valid_until", {}) or {}
        normalized_expiry = _normalize_date(expiry.get("value"))
        if normalized_expiry and date.fromisoformat(normalized_expiry) < today:
            expiry_reviews.append({
                "source": document.get("filename", "Uploaded document"),
                "valid_until": normalized_expiry,
                "confidence": expiry.get("confidence"),
                "manual_review": expiry.get("confidence") is None or expiry.get("confidence") < OCR_REVIEW_THRESHOLD,
                "explanation": "The document contains an explicit valid-until date in the past. Confirm it with the issuing authority; no additional validity period was inferred.",
            })

    return {
        "findings": findings,
        "expiry_reviews": expiry_reviews,
        "notice": "Consistency findings are informational and separate from eligibility. A difference does not establish falsification or intent. OCR values with low confidence are marked for manual review.",
    }
