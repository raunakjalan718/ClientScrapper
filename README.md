# MedScrape — Medical Lead Intelligence Platform

A professional lead generation scraper targeting the medical sector — doctors, hospitals, clinics, and more. Finds high-opportunity prospects with poor or no online presence and scores them intelligently.

## Features

- 🔍 **4-Phase Pipeline**: Google Maps discovery → Place enrichment → Website audit → Lead scoring
- 📊 **Lead Intelligence Score (LIS)**: 0–100 score combining area prestige, business signals, and opportunity
- 🌐 **Website Quality Audit**: 13-point check (HTTPS, mobile, load time, outdated HTML, booking system, etc.)
- 🏆 **Smart Tagging**: Premium Opportunity / High Opportunity / Normal / Low Priority
- 📍 **Area Prestige Detection**: 80+ Indian + international premium localities pre-mapped
- ⚡ **Real-time SSE Streaming**: See every step live in the browser
- 📥 **Export**: One-click CSV or JSON export

## Project Structure

```
Doc_Scrapper/
├── backend/               # Python FastAPI server
│   ├── main.py            # FastAPI app + SSE endpoint
│   ├── scraper/
│   │   ├── maps_scraper.py    # Phase 1: SerpAPI bulk search
│   │   ├── place_enricher.py  # Phase 2: Place details enrichment
│   │   └── website_auditor.py # Phase 3: Website quality audit
│   ├── scoring/
│   │   ├── lead_scorer.py     # Phase 4: LIS calculation
│   │   ├── area_classifier.py # Area prestige matching
│   │   └── prestige_areas.json# Configurable area keyword DB
│   ├── models.py
│   ├── requirements.txt
│   └── .env.example       # Copy to .env and add your key
└── frontend/              # React + Vite dashboard
    └── src/
        ├── App.jsx
        ├── index.css
        └── components/
```

## Setup

### Backend
```bash
cd backend
pip install -r requirements.txt

# Copy env and add your SerpAPI key
cp .env.example .env
# Edit .env and set SERPAPI_KEY=your_key_here

# Start server
py -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Then open **http://localhost:5173**

## API Key

Get a free SerpAPI key (100 searches/month) at [serpapi.com](https://serpapi.com).

Each scrape job uses ~2 credits per lead (1 for discovery, 1 for enrichment).
