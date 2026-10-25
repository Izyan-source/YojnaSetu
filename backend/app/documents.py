"""Local PDF text extraction and OCR-assisted document field detection."""

import io
import re
from datetime import date, datetime
from typing import Any, Dict, List, Optional, Tuple

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
MAX_PDF_PAGES = 20
OCR_TEXT_MINIMUM = 35
SUPPORTED_TYPES = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
}
INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
    "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
    "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
]


class DocumentAnalysisError(ValueError):
    """A user-correctable upload or extraction problem."""


def _field(value: Optional[str], confidence: Optional[float], page: Optional[int]) -> Dict[str, Any]:
    return {"value": value, "confidence": confidence, "source_page": page}


def _find(pattern: str, text: str, flags: int = re.IGNORECASE) -> Optional[re.Match]:
    return re.search(pattern, text, flags)


def _date_value(raw: str) -> Optional[str]:
    raw = raw.strip()
    for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y", "%Y-%m-%d", "%d/%m/%y", "%d-%m-%y"):
        try:
            return datetime.strptime(raw, fmt).date().isoformat()
        except ValueError:
            continue
    return None


def extract_fields(pages: List[str]) -> Tuple[Dict[str, Dict[str, Any]], List[str]]:
    full_text = "\n".join(pages)
    fields: Dict[str, Dict[str, Any]] = {}
    warnings: List[str] = []

    def page_for(value: Optional[str]) -> Optional[int]:
        if not value:
            return None
        return next((index + 1 for index, page_text in enumerate(pages) if re.search(re.escape(value), page_text, re.I)), None)

    patterns = {
        "applicant_name": r"(?:applicant(?:'s)?\s+name|name\s+of\s+applicant|name)\s*[:\-]\s*([A-Za-z][A-Za-z .'-]{1,70})",
        "date_of_birth": r"(?:date\s+of\s+birth|d\.?o\.?b\.?|birth\s+date)\s*[:\-]?\s*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}-\d{2}-\d{2})",
        "annual_family_income_inr": r"(?:annual\s+(?:family\s+)?income|family\s+income|income\s+per\s+annum)\s*[:\-]?\s*(?:₹|rs\.?|inr)?\s*([\d,]+)",
        "certificate_number": r"(?:certificate|reference|application)\s*(?:no\.?|number|#|id)\s*[:\-]?\s*([A-Z0-9/-]{4,30})",
        "certificate_date": r"(?:date\s+of\s+issue|issued\s+on|issue\s+date|certificate\s+date)\s*[:\-]?\s*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}-\d{2}-\d{2})",
        "certificate_valid_until": r"(?:valid\s+up\s+to|expiry\s+date|expires\s+on)\s*[:\-]?\s*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}-\d{2}-\d{2})",
    }
    for key, pattern in patterns.items():
        match = _find(pattern, full_text)
        if not match:
            fields[key] = _field(None, None, None)
            continue
        raw = match.group(1).strip(" .:-")
        page = next((index + 1 for index, page_text in enumerate(pages) if raw in page_text), None)
        if key in ("date_of_birth", "certificate_date", "certificate_valid_until"):
            value = _date_value(raw)
            if value is None:
                fields[key] = _field(None, 0.0, page)
                warnings.append("A date was detected but could not be interpreted reliably.")
                continue
            raw = value
        elif key == "annual_family_income_inr":
            raw = str(int(raw.replace(",", "")))
        fields[key] = _field(raw, 0.78, page)

    # Age is calculated only when an extracted DOB is a valid date.
    dob = fields["date_of_birth"]["value"]
    age_value = None
    age_confidence = None
    age_page = fields["date_of_birth"]["source_page"]
    if dob:
        born = date.fromisoformat(dob)
        today = date.today()
        age_value = today.year - born.year - ((today.month, today.day) < (born.month, born.day))
        if age_value < 0 or age_value > 120:
            age_value = None
            warnings.append("The detected date of birth is outside a plausible age range.")
        else:
            age_confidence = fields["date_of_birth"]["confidence"]
    fields["age"] = _field(str(age_value) if age_value is not None else None, age_confidence, age_page)

    state_match = next((state for state in sorted(INDIAN_STATES, key=len, reverse=True) if re.search(r"\b" + re.escape(state) + r"\b", full_text, re.I)), None)
    fields["state"] = _field(state_match, 0.72 if state_match else None, page_for(state_match))

    certificate_match = _find(r"\b(caste|community|income|residence|domicile|disability|birth|age|identity)\s+certificate\b", full_text)
    certificate_type = certificate_match.group(0).title() if certificate_match else None
    fields["certificate_type"] = _field(certificate_type, 0.75 if certificate_match else None, page_for(certificate_match.group(0)) if certificate_match else None)
    authority_match = _find(r"(?:issued\s+by|issuing\s+authority|authority)\s*[:\-]\s*([^\n,;]{3,90})", full_text)
    authority = authority_match.group(1).strip() if authority_match else None
    fields["issuing_authority"] = _field(authority, 0.72 if authority_match else None, page_for(authority))

    # Address is surfaced only when there is an explicit labelled line.
    address_match = _find(r"(?:permanent\s+address|residential\s+address|address)\s*[:\-]\s*([^\n]{5,140})", full_text)
    address = address_match.group(1).strip() if address_match else None
    fields["address"] = _field(address, 0.65 if address_match else None, page_for(address))

    for key, item in fields.items():
        if item["value"] is None and key not in ("age",):
            warnings.append("Could not confidently extract " + key.replace("_", " ") + ".")
    validity_match = _find(r"valid\s+(?:for\s+)?(\d{1,2})\s+years?", full_text)
    expiry_match = _find(r"(?:valid\s+up\s+to|expiry\s+date|expires\s+on)\s*[:\-]?\s*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})", full_text)
    if expiry_match:
        expiry = _date_value(expiry_match.group(1))
        if expiry and date.fromisoformat(expiry) < date.today():
            warnings.append("The document appears to have an expired validity date; confirm the applicable rules with the issuing authority.")
    elif validity_match and fields["certificate_date"]["value"]:
        issued = date.fromisoformat(fields["certificate_date"]["value"])
        years = int(validity_match.group(1))
        try:
            expiry = issued.replace(year=issued.year + years)
        except ValueError:
            expiry = issued.replace(month=2, day=28, year=issued.year + years)
        if expiry < date.today():
            warnings.append("Based on the stated validity period and issue date, the certificate may be expired; confirm with the issuing authority.")
    return fields, list(dict.fromkeys(warnings))


def analyze_document(filename: str, content_type: str, content: bytes) -> Dict[str, Any]:
    suffix = ("." + filename.rsplit(".", 1)[-1].lower()) if "." in filename else ""
    if suffix not in SUPPORTED_TYPES or content_type not in (SUPPORTED_TYPES[suffix], "application/octet-stream"):
        raise DocumentAnalysisError("Unsupported file. Upload a PDF, PNG, JPG, or JPEG document.")
    if not content:
        raise DocumentAnalysisError("The uploaded file is empty.")
    if len(content) > MAX_UPLOAD_BYTES:
        raise DocumentAnalysisError("File exceeds the 10 MB upload limit.")

    warnings: List[str] = []
    pages: List[str] = []
    methods: List[str] = []
    try:
        import fitz
        import pytesseract
        from PIL import Image

        if suffix == ".pdf":
            try:
                pdf = fitz.open(stream=content, filetype="pdf")
            except Exception as exc:
                raise DocumentAnalysisError("The PDF is malformed or cannot be opened.") from exc
            if pdf.page_count == 0:
                raise DocumentAnalysisError("The PDF contains no pages.")
            if pdf.page_count > MAX_PDF_PAGES:
                raise DocumentAnalysisError("PDF exceeds the 20-page analysis limit.")
            for page in pdf:
                text = page.get_text("text").strip()
                if len(text) < OCR_TEXT_MINIMUM:
                    try:
                        pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
                        image = Image.open(io.BytesIO(pixmap.tobytes("png")))
                        text = pytesseract.image_to_string(image).strip()
                        methods.append("OCR")
                    except Exception as exc:
                        warnings.append("OCR was unavailable for page " + str(page.number + 1) + ". Install Tesseract and confirm it is on PATH.")
                else:
                    methods.append("PDF text extraction")
                if len(text) < 8:
                    warnings.append("Page " + str(page.number + 1) + " appears unreadable or contains no extractable text.")
                pages.append(text)
            pdf.close()
        else:
            try:
                image = Image.open(io.BytesIO(content)).convert("RGB")
                pages = [pytesseract.image_to_string(image).strip()]
                methods.append("OCR")
                if len(pages[0]) < 8:
                    warnings.append("The image appears unreadable or contains no extractable text.")
            except Exception as exc:
                if "tesseract" in str(exc).lower() or "executable" in str(exc).lower():
                    raise DocumentAnalysisError("Tesseract OCR is unavailable. Install the Tesseract system package and retry.") from exc
                raise DocumentAnalysisError("The image is malformed or could not be processed.") from exc
    except ImportError as exc:
        raise DocumentAnalysisError("Document analysis dependencies are not installed. Install backend requirements.") from exc

    if not any(page.strip() for page in pages):
        warnings.append("No readable text was extracted. Try a clearer scan or a text-based PDF.")
    fields, field_warnings = extract_fields(pages)
    warnings.extend(field_warnings)
    return {
        "filename": filename,
        "extraction_methods": list(dict.fromkeys(methods)),
        "page_count": len(pages),
        "extracted_fields": fields,
        "warnings": list(dict.fromkeys(warnings)),
        "authenticity_notice": "Text extraction does not verify document authenticity, validity, ownership, or government approval. Confirm details with the issuing authority.",
    }
