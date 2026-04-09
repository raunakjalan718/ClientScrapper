"""
Gemini-powered web intelligence enricher.
Uses Gemini 1.5 Flash to analyse Google search results for each lead and extract:
  - Personal/official website URL
  - All directory profile URLs (Practo, JustDial, MediBuddy, etc.)
  - Email addresses visible in search snippets
  - Hospital affiliations
  - Whether the doctor has a real personal website
  - A short AI-generated web-presence summary

Requires GEMINI_API_KEY in .env
If key is not set, all functions return empty dicts gracefully.
"""

import asyncio
import json
import os
import re

# Lazy-loaded to avoid import errors if package not installed
_model = None
_genai_loaded = False


def _load_model():
    """Load Gemini model once. Returns None if key missing or SDK not installed."""
    global _model, _genai_loaded

    if _genai_loaded:
        return _model

    _genai_loaded = True
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None

    try:
        import google.generativeai as genai

        genai.configure(api_key=api_key)
        _model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.1,        # Low temperature = more factual
                max_output_tokens=1024,
            ),
        )
        return _model
    except Exception as e:
        print(f"[Gemini] Failed to load model: {e}")
        return None


def _build_prompt(name: str, specialty: str, location: str, address: str, results: list[dict]) -> str:
    results_text = "\n".join([
        f"[{i+1}] TITLE: {r['title']}\n"
        f"    URL: {r['url']}\n"
        f"    SOURCE: {r.get('source', '')}\n"
        f"    SNIPPET: {r.get('snippet', '')}\n"
        for i, r in enumerate(results)
    ])

    return f"""You are a medical lead intelligence assistant helping identify website and online presence data.

SUBJECT:
- Name: {name}
- Specialty: {specialty}
- Location: {location}
- Address (from Google Maps): {address or 'N/A'}

GOOGLE SEARCH RESULTS for "{name}" "{specialty}" "{location}":
{results_text}

TASK: Extract ALL web presence data that is DEFINITELY about this specific person/clinic.

Return ONLY a JSON object with this exact structure (no extra text):
{{
  "personal_website": "https://drajitmenon.com" or null,
  "profile_urls": [
    {{"platform": "Practo", "url": "https://www.practo.com/mumbai/doctor/ajit-r-menon-cardiologist"}},
    {{"platform": "MediBuddy", "url": "https://..."}},
    {{"platform": "JustDial", "url": "https://..."}},
    {{"platform": "Lybrate", "url": "https://..."}},
    {{"platform": "Apollo247", "url": "https://..."}},
    {{"platform": "1mg", "url": "https://..."}},
    {{"platform": "BreachCandyHospital", "url": "https://..."}},
    {{"platform": "BajajFinservHealth", "url": "https://..."}}
  ],
  "hospital_affiliations": ["Lilavati Hospital", "Saifee Hospital", "Breach Candy Hospital"],
  "emails": ["contact@drajitmenon.com"],
  "has_real_website": true,
  "web_presence_summary": "Dr. {name} has a personal website at drajitmenon.com and active profiles on Practo, MediBuddy, and BestIndiaHospitals. Associated with Lilavati and Breach Candy hospitals."
}}

RULES:
- personal_website = their own personal domain (e.g. drajitmenon.com, drnileshclinic.in) — NOT Practo/JD/hospital sites
- has_real_website = true ONLY if a genuine personal website was found
- profile_urls = complete clickable URLs for directory/hospital profile pages
- hospital_affiliations = hospital names only (strings), not URLs
- emails = only if clearly visible in a snippet
- Exclude any URL that is about a DIFFERENT person with a similar name
- If nothing is found, return empty arrays/null — do not hallucinate"""


async def gemini_enrich(
    name: str,
    specialty: str,
    location: str,
    address: str,
    search_results: list[dict],
) -> dict:
    """
    Phase 2.5b — Gemini AI enrichment.
    Analyses web search results and extracts structured intelligence about the lead.
    Returns empty dict if Gemini API key not configured or on any error.
    """
    if not search_results:
        return {}

    model = _load_model()
    if model is None:
        return {}

    prompt = _build_prompt(name, specialty, location, address, search_results)

    try:
        # Run Gemini in executor to avoid blocking the async event loop
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: model.generate_content(prompt),
        )

        raw = response.text.strip()

        # Try parsing JSON
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            # Try to extract from markdown code block
            match = re.search(r'```(?:json)?\s*([\s\S]+?)\s*```', raw)
            if match:
                data = json.loads(match.group(1))
            else:
                return {}

        # Validate & sanitise
        if not isinstance(data, dict):
            return {}

        # Ensure lists default to empty
        data.setdefault("profile_urls", [])
        data.setdefault("hospital_affiliations", [])
        data.setdefault("emails", [])
        data.setdefault("has_real_website", False)
        data.setdefault("web_presence_summary", "")

        return data

    except Exception as e:
        print(f"[Gemini] Enrichment error for {name}: {e}")
        return {}


def gemini_enabled() -> bool:
    """Returns True if GEMINI_API_KEY is configured."""
    return bool(os.getenv("GEMINI_API_KEY", "").strip())
