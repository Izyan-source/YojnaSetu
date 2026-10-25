from typing import Dict, List, Optional, Union

from pydantic import BaseModel, Field, StrictBool


class ApplicantProfile(BaseModel):
    state: Optional[str] = Field(default=None, min_length=1, max_length=100)
    age: Optional[int] = Field(default=None, ge=0, le=120)
    annual_family_income_inr: Optional[int] = Field(default=None, ge=0, le=1000000000)
    parental_income_inr: Optional[int] = Field(default=None, ge=0, le=1000000000)
    education_level: Optional[str] = Field(default=None, max_length=100)
    occupation: Optional[str] = Field(default=None, max_length=100)
    category: Optional[str] = Field(default=None, max_length=100)

    # Scheme-specific inputs are optional because the current frontend does not
    # collect them. The engine reports UNKNOWN until the relevant fact is known.
    indian_citizen: Optional[StrictBool] = None
    has_savings_bank_account: Optional[StrictBool] = None
    is_income_taxpayer: Optional[StrictBool] = None
    gender: Optional[str] = Field(default=None, max_length=30)
    poor_household_declaration: Optional[StrictBool] = None
    household_has_existing_lpg_connection: Optional[StrictBool] = None
    school_class: Optional[int] = Field(default=None, ge=1, le=12)
    school_type: Optional[str] = Field(default=None, max_length=40)
    passed_nmmss_selection_test: Optional[StrictBool] = None
    meets_nmmss_marks_requirement: Optional[StrictBool] = None
    family_owns_cultivable_land: Optional[StrictBool] = None
    has_qualifying_pm_kisan_land_record: Optional[StrictBool] = None
    pm_kisan_exclusion_applies: Optional[StrictBool] = None
    admitted_to_eligible_qhei: Optional[StrictBool] = None
    admission_by_merit: Optional[StrictBool] = None
    programme_type: Optional[str] = Field(default=None, max_length=30)

    class Config:
        extra = "forbid"


class EligibilityCheckRequest(BaseModel):
    profile: ApplicantProfile
    scheme_id: Optional[str] = Field(default=None, min_length=1, max_length=100)


class AskRequest(BaseModel):
    question: str = Field(min_length=3, max_length=1200)
    scheme_id: Optional[str] = Field(default=None, min_length=1, max_length=100)


class ConsistencyProfile(BaseModel):
    applicant_name: Optional[str] = Field(default=None, max_length=150)
    date_of_birth: Optional[str] = Field(default=None, max_length=40)
    age: Optional[Union[str, int]] = Field(default=None)
    address: Optional[str] = Field(default=None, max_length=300)
    state: Optional[str] = Field(default=None, max_length=100)
    annual_family_income_inr: Optional[Union[str, int]] = Field(default=None)
    certificate_type: Optional[str] = Field(default=None, max_length=100)
    issuing_authority: Optional[str] = Field(default=None, max_length=150)
    certificate_date: Optional[str] = Field(default=None, max_length=40)
    certificate_valid_until: Optional[str] = Field(default=None, max_length=40)
    certificate_number: Optional[str] = Field(default=None, max_length=100)


class ExtractedDocumentValue(BaseModel):
    value: Optional[Union[str, int, float]] = None
    confidence: Optional[float] = Field(default=None, ge=0, le=1)
    source_page: Optional[int] = Field(default=None, ge=1)


class ConsistencyDocument(BaseModel):
    filename: str = Field(min_length=1, max_length=255)
    extracted_fields: Dict[str, ExtractedDocumentValue]


class ConsistencyCheckRequest(BaseModel):
    profile: ConsistencyProfile
    documents: List[ConsistencyDocument] = Field(default_factory=list, max_length=10)
