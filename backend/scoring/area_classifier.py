import json
import os
from typing import Dict, Any, Tuple

_DATA_PATH = os.path.join(os.path.dirname(__file__), "prestige_areas.json")

with open(_DATA_PATH, "r", encoding="utf-8") as f:
    _PRESTIGE_DATA = json.load(f)

HIGH_END_KEYWORDS = [
    kw.lower()
    for kw in (
        _PRESTIGE_DATA["high_end"].get("india", [])
        + _PRESTIGE_DATA["high_end"].get("international", [])
    )
]
MID_TIER_KEYWORDS = [
    kw.lower()
    for kw in _PRESTIGE_DATA["mid_tier"].get("india", [])
]


def classify_area(address: str, neighborhood: str | None = None) -> Tuple[str, int]:
    """
    Classify the area tier and return (tier_label, prestige_score).
    tier_label: "High-End" | "Normal" | "Low-End"
    prestige_score: 0–30
    """
    combined = (address + " " + (neighborhood or "")).lower()

    for keyword in HIGH_END_KEYWORDS:
        if keyword in combined:
            return "High-End", 28

    for keyword in MID_TIER_KEYWORDS:
        if keyword in combined:
            return "Normal", 15

    return "Low-End", 5
