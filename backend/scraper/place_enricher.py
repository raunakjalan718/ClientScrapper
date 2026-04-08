import os
import httpx
from typing import Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

SERPAPI_KEY = os.getenv("SERPAPI_KEY", "")
SERPAPI_BASE = "https://serpapi.com/search.json"


async def enrich_place(
    client: httpx.AsyncClient,
    place_id: str,
) -> Dict[str, Any]:
    """
    Phase 2: Fetch full Place Details from SerpAPI using place_id.
    Returns rich data: highlights, payments, user_reviews, neighborhood, etc.
    """
    params = {
        "engine": "google_maps",
        "type": "place",
        "place_id": place_id,
        "hl": "en",
        "api_key": SERPAPI_KEY,
    }

    try:
        resp = await client.get(SERPAPI_BASE, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        place = data.get("place_results", {})
        return _parse_place_results(place)
    except Exception as e:
        return {"_error": str(e)}


def _parse_place_results(place: Dict[str, Any]) -> Dict[str, Any]:
    """Parse the place_results object into enrichment fields."""
    # Parse extensions (highlights, payments, accessibility, crowd, etc.)
    highlights = []
    payments = []
    accessibility = []
    crowd_info = []

    for ext_block in place.get("extensions", []):
        if "highlights" in ext_block:
            highlights.extend(ext_block["highlights"])
        if "payments" in ext_block:
            payments.extend(ext_block["payments"])
        if "accessibility" in ext_block:
            accessibility.extend(ext_block["accessibility"])
        if "crowd" in ext_block:
            crowd_info.extend(ext_block["crowd"])
        # Also catch from unsupported_extensions
    for ext_block in place.get("unsupported_extensions", []):
        if "highlights" in ext_block:
            highlights.extend(ext_block["highlights"])
        if "payments" in ext_block:
            payments.extend(ext_block["payments"])

    # Parse top user reviews
    top_reviews = []
    user_reviews = place.get("user_reviews", {})
    summary_snippets = user_reviews.get("summary", [])
    for s in summary_snippets[:3]:
        snippet = s.get("snippet", "").strip('"').strip()
        if snippet:
            top_reviews.append(snippet)

    most_relevant = user_reviews.get("most_relevant", [])
    for r in most_relevant[:3]:
        desc = r.get("description", "").strip()
        if desc and desc not in top_reviews:
            top_reviews.append(desc[:300])  # Cap length

    # Parse neighborhoods
    neighborhoods = place.get("neighborhoods", [])
    neighborhood = neighborhoods[0] if neighborhoods else None

    # Parse booking link
    booking_link = place.get("booking_link")
    if not booking_link:
        # Check links object
        links = place.get("links", {})
        booking_link = links.get("book_a_table") or links.get("order_online")

    return {
        "highlights": highlights,
        "payments": payments,
        "accessibility": accessibility,
        "crowd_info": crowd_info,
        "top_reviews": top_reviews,
        "neighborhood": neighborhood,
        "booking_link": booking_link,
        "located_in": place.get("located_in"),
        "plus_code": place.get("plus_code"),
        "phone_enriched": place.get("phone"),
        "website_enriched": place.get("website"),
        "description_enriched": place.get("description"),
    }
