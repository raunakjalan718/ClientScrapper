from pydantic import BaseModel, HttpUrl
from typing import Optional, List, Dict, Any


class GpsCoordinates(BaseModel):
    latitude: float
    longitude: float


class WebsiteAudit(BaseModel):
    url: Optional[str] = None
    status: str  # "EXISTS", "NONE", "ERROR"
    quality_grade: str  # "EXCELLENT", "DECENT", "POOR", "VERY_POOR", "NONE"
    quality_score: int  # 0-100
    checks: Dict[str, Any] = {}


class LeadScoring(BaseModel):
    area_prestige_score: int
    business_prestige_score: int
    opportunity_score: int
    lead_intelligence_score: int
    tag: str  # "Premium Opportunity", "High Opportunity", "Normal Opportunity", "Low Priority"
    area_tier: str  # "High-End", "Normal", "Low-End"


class LeadCard(BaseModel):
    id: str
    name: str
    types: List[str] = []
    address: str
    phone: Optional[str] = None
    gps: Optional[GpsCoordinates] = None

    # Google Maps data
    rating: Optional[float] = None
    review_count: Optional[int] = None
    price_level: Optional[str] = None
    open_state: Optional[str] = None
    operating_hours: Optional[Dict[str, str]] = None
    description: Optional[str] = None
    booking_link: Optional[str] = None
    located_in: Optional[str] = None
    neighborhood: Optional[str] = None
    highlights: List[str] = []
    payments: List[str] = []
    top_reviews: List[str] = []
    thumbnail: Optional[str] = None
    place_id: Optional[str] = None
    data_id: Optional[str] = None

    # Website audit
    website: WebsiteAudit

    # Scoring
    scoring: LeadScoring


class SearchRequest(BaseModel):
    specialty: str
    location: str
    max_results: int = 60
    min_quality_filter: str = "ALL"  # "ALL", "NONE", "VERY_POOR", "POOR"


class ProgressEvent(BaseModel):
    event: str  # "discovery", "enrichment", "audit", "scoring", "done", "error"
    message: str
    lead_name: Optional[str] = None
    progress: Optional[int] = None  # 0-100
    total: Optional[int] = None
    current: Optional[int] = None
    data: Optional[Dict[str, Any]] = None
