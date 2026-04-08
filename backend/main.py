import asyncio
import json
import uuid
import os
import httpx
from typing import AsyncGenerator

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from scraper.maps_scraper import discover_leads
from scraper.place_enricher import enrich_place
from scraper.website_auditor import audit_website
from scoring.lead_scorer import calculate_lead_score
from models import SearchRequest

app = FastAPI(title="MedScrape API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store for completed sessions (for export)
_sessions: dict[str, list] = {}


def _sse(event: str, data: dict) -> str:
    """Format a Server-Sent Event message."""
    payload = json.dumps({"event": event, **data})
    return f"data: {payload}\n\n"


async def run_pipeline(
    specialty: str,
    location: str,
    max_results: int,
    session_id: str,
) -> AsyncGenerator[str, None]:
    """Core scraping pipeline as an async generator for SSE streaming."""

    leads_collected = []
    total_found = 0

    yield _sse("start", {
        "message": f"🔍 Starting discovery: {specialty} in {location}",
        "session_id": session_id,
    })

    # ── Phase 1: Discovery ─────────────────────────────────────────────
    raw_leads = []
    async for raw in discover_leads(specialty, location, max_results):
        if "_error" in raw:
            yield _sse("error", {
                "message": f"⚠️ Discovery error: {raw['_error']}"
            })
            continue
        raw_leads.append(raw)
        total_found += 1
        yield _sse("discovery", {
            "message": f"📍 Found: {raw['name']}",
            "lead_name": raw["name"],
            "current": total_found,
        })

    yield _sse("phase", {
        "message": f"✅ Discovery complete — {total_found} leads found. Starting enrichment...",
        "total": total_found,
    })

    # ── Phase 2 + 3 + 4: Enrichment, Audit, Scoring ───────────────────
    async with httpx.AsyncClient() as http_client:
        for idx, raw in enumerate(raw_leads, start=1):
            name = raw.get("name", "Unknown")
            progress = round((idx / total_found) * 100)

            yield _sse("enriching", {
                "message": f"🔎 Enriching ({idx}/{total_found}): {name}",
                "lead_name": name,
                "current": idx,
                "total": total_found,
                "progress": progress,
            })

            # Phase 2: Place enrichment
            enrichment = {}
            place_id = raw.get("place_id")
            if place_id:
                try:
                    enrichment = await enrich_place(http_client, place_id)
                except Exception as e:
                    enrichment = {"_error": str(e)}

            # Merge enrichment data back into raw
            website_url = (
                enrichment.get("website_enriched")
                or raw.get("website_url")
            )
            phone = enrichment.get("phone_enriched") or raw.get("phone")
            description = enrichment.get("description_enriched") or raw.get("description")

            yield _sse("auditing", {
                "message": f"🌐 Auditing website ({idx}/{total_found}): {name}",
                "lead_name": name,
                "current": idx,
                "total": total_found,
                "progress": progress,
            })

            # Phase 3: Website audit
            website_audit = await audit_website(website_url)

            # Phase 4: Lead scoring
            scoring = calculate_lead_score(raw, enrichment, website_audit)

            # Build final lead card
            lead_card = {
                "id": str(uuid.uuid4()),
                "name": name,
                "types": raw.get("types", []),
                "address": raw.get("address", ""),
                "phone": phone,
                "gps": raw.get("gps"),
                "rating": raw.get("rating"),
                "review_count": raw.get("review_count"),
                "price_level": raw.get("price_level"),
                "open_state": raw.get("open_state"),
                "operating_hours": raw.get("operating_hours"),
                "description": description,
                "booking_link": enrichment.get("booking_link"),
                "located_in": enrichment.get("located_in"),
                "neighborhood": enrichment.get("neighborhood"),
                "highlights": enrichment.get("highlights", []),
                "payments": enrichment.get("payments", []),
                "top_reviews": enrichment.get("top_reviews", [])[:3],
                "thumbnail": raw.get("thumbnail"),
                "place_id": raw.get("place_id"),
                "website": website_audit,
                "scoring": scoring,
            }

            leads_collected.append(lead_card)

            yield _sse("lead_ready", {
                "message": f"✅ Scored ({idx}/{total_found}): {name} → {scoring['tag']} (LIS: {scoring['lead_intelligence_score']})",
                "lead_name": name,
                "lead": lead_card,
                "current": idx,
                "total": total_found,
                "progress": progress,
            })

            # Small delay between enrichment calls to avoid rate limits
            await asyncio.sleep(0.3)

    # Store session for export
    _sessions[session_id] = leads_collected

    yield _sse("done", {
        "message": f"🎉 Complete! {len(leads_collected)} leads scored and ready.",
        "total": len(leads_collected),
        "session_id": session_id,
    })


@app.get("/scrape")
async def scrape(
    specialty: str = Query(..., description="e.g. Cardiologist, Dentist, Hospital"),
    location: str = Query(..., description="e.g. Bandra Mumbai, Connaught Place Delhi"),
    max_results: int = Query(40, ge=5, le=120, description="Max leads to discover"),
):
    """SSE endpoint — streams real-time scraping progress and lead cards."""
    session_id = str(uuid.uuid4())

    return StreamingResponse(
        run_pipeline(specialty, location, max_results, session_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/export/{session_id}")
async def export_leads(
    session_id: str,
    format: str = Query("json", description="'json' or 'csv'"),
):
    """Export the results of a completed scraping session."""
    leads = _sessions.get(session_id)
    if leads is None:
        return {"error": "Session not found"}

    if format == "csv":
        import csv
        import io

        output = io.StringIO()
        if leads:
            fieldnames = [
                "name", "types", "address", "phone", "rating", "review_count",
                "price_level", "website_url", "website_quality", "website_score",
                "has_booking", "highlights", "area_tier",
                "lead_intelligence_score", "tag", "description",
            ]
            writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
            writer.writeheader()

            for lead in leads:
                writer.writerow({
                    "name": lead.get("name"),
                    "types": ", ".join(lead.get("types", [])),
                    "address": lead.get("address"),
                    "phone": lead.get("phone"),
                    "rating": lead.get("rating"),
                    "review_count": lead.get("review_count"),
                    "price_level": lead.get("price_level"),
                    "website_url": lead.get("website", {}).get("url"),
                    "website_quality": lead.get("website", {}).get("quality_grade"),
                    "website_score": lead.get("website", {}).get("quality_score"),
                    "has_booking": bool(lead.get("booking_link")),
                    "highlights": ", ".join(lead.get("highlights", [])),
                    "area_tier": lead.get("scoring", {}).get("area_tier"),
                    "lead_intelligence_score": lead.get("scoring", {}).get("lead_intelligence_score"),
                    "tag": lead.get("scoring", {}).get("tag"),
                    "description": lead.get("description"),
                })

        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=medscrape_{session_id[:8]}.csv"
            },
        )

    # Default: JSON
    return leads


@app.get("/health")
async def health():
    return {"status": "ok", "service": "MedScrape API"}
