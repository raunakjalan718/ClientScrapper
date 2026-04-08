from typing import Dict, Any
from .area_classifier import classify_area

BUSINESS_PRESTIGE_KEYWORDS = [
    "luxury", "boutique", "premium", "exclusive", "concierge",
    "elite", "vip", "executive", "specialist", "advanced",
    "state-of-the-art", "cutting-edge", "world-class", "renowned",
    "by appointment", "five star",
]

PREMIUM_LOCATIONS = [
    "tower", "plaza", "mall", "hotel", "business park",
    "medical centre", "medical center", "clinic complex", "hub",
    "arcade", "square", "avenue",
]


def calculate_lead_score(
    lead: Dict[str, Any],
    enrichment: Dict[str, Any],
    website_audit: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Phase 4: Calculate Lead Intelligence Score (LIS) 0–100.
    Returns full scoring breakdown + tag.
    """

    address = lead.get("address", "")
    neighborhood = enrichment.get("neighborhood") or lead.get("neighborhood", "")

    # --- Area Prestige Score (0-30) ---
    area_tier, area_score = classify_area(address, neighborhood)

    # --- Business Prestige Score (0-30) ---
    biz_score = 0

    # Price level
    price_map = {"$$$$": 20, "$$$": 12, "$$": 5, "$": 0}
    price_level = lead.get("price_level", "") or ""
    biz_score += price_map.get(price_level, 0)

    # Highlights contain luxury keywords
    highlights = enrichment.get("highlights", [])
    highlights_text = " ".join(highlights).lower()
    for kw in BUSINESS_PRESTIGE_KEYWORDS:
        if kw in highlights_text:
            biz_score += 5
            break  # one-time bonus

    # Located in a premium building
    located_in = enrichment.get("located_in", "") or ""
    located_lower = located_in.lower()
    if any(loc in located_lower for loc in PREMIUM_LOCATIONS):
        biz_score += 5

    # Has online booking
    if enrichment.get("booking_link"):
        biz_score += 3

    # Cap business score
    biz_score = min(30, biz_score)

    # --- Opportunity Score (0-40) ---
    # Inverse of digital presence quality
    website_quality = website_audit.get("quality_grade", "NONE")
    opp_map = {
        "NONE": 40,
        "VERY_POOR": 35,
        "POOR": 25,
        "DECENT": 10,
        "EXCELLENT": 0,
        "ERROR": 35,  # Can't reach site = likely outdated or non-existent
    }
    opp_score = opp_map.get(website_quality, 20)

    # Bonus: no booking link AND no website = maximum opportunity
    if website_quality in ("NONE", "ERROR") and not enrichment.get("booking_link"):
        opp_score = min(40, opp_score + 3)

    # --- Total LIS ---
    lis = area_score + biz_score + opp_score

    # --- Final Tag ---
    tag = _assign_tag(lis, area_tier, website_quality)

    return {
        "area_prestige_score": area_score,
        "business_prestige_score": biz_score,
        "opportunity_score": opp_score,
        "lead_intelligence_score": lis,
        "tag": tag,
        "area_tier": area_tier,
    }


def _assign_tag(lis: int, area_tier: str, website_quality: str) -> str:
    if lis >= 60 and area_tier == "High-End":
        return "Premium Opportunity"
    elif lis >= 55:
        return "High Opportunity"
    elif lis >= 35:
        return "Normal Opportunity"
    else:
        return "Low Priority"
