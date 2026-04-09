import os
import httpx
from typing import Optional

SERPAPI_BASE = "https://serpapi.com/search.json"


async def search_web_for_lead(
    http_client: httpx.AsyncClient,
    name: str,
    specialty: str,
    location: str,
) -> list[dict]:
    """
    Phase 2.5a — Google Web Search for a specific doctor/clinic.
    Uses SerpAPI's Google Search engine (not Maps) to find ALL web mentions:
    personal websites, directory profiles, hospital pages, etc.
    Costs 1 SerpAPI credit per lead.
    """
    api_key = os.getenv("SERPAPI_KEY", "")
    if not api_key:
        return []

    # Targeted query: use quotes for the name to get precise results
    query = f'"{name}" {specialty} {location}'

    try:
        resp = await http_client.get(
            SERPAPI_BASE,
            params={
                "engine": "google",
                "q": query,
                "num": 8,           # 8 results is enough, saves bandwidth
                "hl": "en",
                "gl": "in",         # geo: India, for more relevant results
                "api_key": api_key,
            },
            timeout=15.0,
        )
        data = resp.json()
    except Exception:
        # Fallback — try without quotes
        try:
            query_fallback = f"{name} {specialty} {location}"
            resp = await http_client.get(
                SERPAPI_BASE,
                params={
                    "engine": "google",
                    "q": query_fallback,
                    "num": 8,
                    "hl": "en",
                    "gl": "in",
                    "api_key": api_key,
                },
                timeout=15.0,
            )
            data = resp.json()
        except Exception:
            return []

    results = []
    for r in data.get("organic_results", []):
        url = r.get("link", "")
        if url:
            results.append({
                "title": r.get("title", ""),
                "url": url,
                "source": r.get("displayed_link", ""),
                "snippet": r.get("snippet", ""),
            })

    # Also pull knowledge graph website if present
    kg = data.get("knowledge_graph", {})
    if kg.get("website"):
        results.insert(0, {
            "title": f"{kg.get('title', name)} — Official Website",
            "url": kg["website"],
            "source": kg["website"],
            "snippet": kg.get("description", ""),
        })

    return results
