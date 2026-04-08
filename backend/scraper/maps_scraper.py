import os
import asyncio
import httpx
from typing import AsyncGenerator, List, Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

SERPAPI_KEY = os.getenv("SERPAPI_KEY", "")
SERPAPI_BASE = "https://serpapi.com/search.json"


async def search_maps_page(
    client: httpx.AsyncClient,
    query: str,
    start: int = 0,
    ll: Optional[str] = None,
) -> Dict[str, Any]:
    """Fetch one page (20 results) from SerpAPI Google Maps."""
    params = {
        "engine": "google_maps",
        "type": "search",
        "q": query,
        "hl": "en",
        "start": start,
        "api_key": SERPAPI_KEY,
    }
    if ll:
        params["ll"] = ll

    resp = await client.get(SERPAPI_BASE, params=params, timeout=30)
    resp.raise_for_status()
    return resp.json()


async def discover_leads(
    specialty: str,
    location: str,
    max_results: int = 60,
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Phase 1: Bulk discovery of healthcare leads via Google Maps search.
    Yields raw lead dicts as they are discovered (with pagination).
    """
    query = f"{specialty} in {location}"
    seen_ids = set()
    total_fetched = 0
    page = 0

    async with httpx.AsyncClient() as client:
        while total_fetched < max_results:
            start = page * 20
            try:
                data = await search_maps_page(client, query, start=start)
            except Exception as e:
                yield {"_error": str(e), "_page": page}
                break

            local_results = data.get("local_results", [])
            if not local_results:
                break  # No more results

            for item in local_results:
                place_id = item.get("place_id") or item.get("data_id", "")
                if place_id in seen_ids:
                    continue
                seen_ids.add(place_id)

                lead = _parse_local_result(item)
                yield lead
                total_fetched += 1
                if total_fetched >= max_results:
                    break

            page += 1
            # SerpAPI recommends max page 6 (start=100)
            if start >= 100:
                break

            # Small delay to be polite to the API
            await asyncio.sleep(0.5)


def _parse_local_result(item: Dict[str, Any]) -> Dict[str, Any]:
    """Parse a local_results item into a clean lead dict."""
    operating_hours = item.get("operating_hours", {})
    if isinstance(operating_hours, list):
        # Sometimes it comes as a list of day dicts
        hours_dict = {}
        for entry in operating_hours:
            hours_dict.update(entry)
        operating_hours = hours_dict

    return {
        "name": item.get("title", "Unknown"),
        "place_id": item.get("place_id"),
        "data_id": item.get("data_id"),
        "data_cid": item.get("data_cid"),
        "types": item.get("types", [item.get("type", "")]) if item.get("type") else [],
        "address": item.get("address", ""),
        "phone": item.get("phone"),
        "rating": item.get("rating"),
        "review_count": item.get("reviews"),
        "price_level": item.get("price"),
        "open_state": item.get("hours") or item.get("open_state"),
        "operating_hours": operating_hours,
        "description": item.get("description"),
        "website_url": item.get("website"),
        "gps": item.get("gps_coordinates"),
        "thumbnail": item.get("thumbnail"),
        "service_options": item.get("service_options", {}),
    }
