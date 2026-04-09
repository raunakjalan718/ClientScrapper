import asyncio
import re
import time
from typing import Dict, Any, Optional
from urllib.parse import urlparse, urljoin

import aiohttp
from bs4 import BeautifulSoup

# ── Constants ─────────────────────────────────────────────────────────────────

FREE_BUILDERS = [
    "wix.com", "weebly.com", "squarespace.com", "godaddy.com",
    "jimdo.com", "strikingly.com", "yola.com", "webnode.com",
    "site123.com", "mobirise.com",
]
FREE_BUILDER_META = [
    "wix", "weebly", "squarespace", "godaddy website builder",
    "jimdo", "strikingly", "webflow",
]
BOOKING_PATTERNS = [
    "calendly.com", "zocdoc.com", "practo.com", "doctolib",
    "appointment", "book", "schedule", "consult", "booking",
]
LUXURY_KEYWORDS = [
    "luxury", "boutique", "premium", "exclusive", "concierge",
    "elite", "vip", "executive", "specialist", "advanced",
    "state-of-the-art", "cutting-edge", "world-class",
]

SOCIAL_PLATFORMS = {
    "facebook": ["facebook.com/"],
    "instagram": ["instagram.com/"],
    "twitter": ["twitter.com/", "x.com/"],
    "linkedin": ["linkedin.com/"],
    "youtube": ["youtube.com/"],
    "whatsapp": ["wa.me/", "api.whatsapp.com/"],
    "pinterest": ["pinterest.com/"],
    "threads": ["threads.net/"],
}

DIRECTORY_PLATFORMS = {
    "practo": ["practo.com"],
    "justdial": ["justdial.com"],
    "lybrate": ["lybrate.com"],
    "apollo247": ["apollo247.com"],
    "1mg": ["1mg.com"],
    "healthgrades": ["healthgrades.com"],
    "zocdoc": ["zocdoc.com"],
    "credihealth": ["credihealth.com"],
    "docdoc": ["docdoc.com"],
    "bajajfinservhealth": ["bajajfinservhealth.com"],
    "clinicspots": ["clinicspots.com"],
    "sulekha": ["sulekha.com"],
    "indiamart": ["indiamart.com"],
    "docprime": ["docprime.com"],
    "mfine": ["mfine.co"],
}

# Email domains to ignore (noise)
SKIP_EMAIL_DOMAINS = {
    "example.com", "sentry.io", "wix.com", "weebly.com", "schema.org",
    "w3.org", "jquery.com", "cloudflare.com", "googleapis.com",
    "gstatic.com", "fonts.com", "bootstrapcdn.com", "cdnjs.com",
    "wordpress.org", "wordpress.com", "gravatar.com", "plugin.com",
    "yoursite.com", "yourdomain.com", "email.com", "domain.com",
    "company.com", "test.com", "mail.com", "website.com",
}
SKIP_EMAIL_KEYWORDS = [
    "example", "test", "noreply", "no-reply", "donotreply",
    "sentry", "schema", "jquery", "cloud", "bootstrap", "cdn",
    "support@wordpress", "admin@wordpress",
]

EMAIL_REGEX = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,7}\b')
HTTP_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}


# ── Helper: Email extractor ───────────────────────────────────────────────────

def _extract_emails(soup: BeautifulSoup, html: str) -> list[str]:
    """Extract unique, clean emails from a page."""
    raw = set()

    # 1. mailto: links (most reliable)
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if href.lower().startswith("mailto:"):
            email = href[7:].split("?")[0].strip().lower()
            if "@" in email and "." in email.split("@")[-1]:
                raw.add(email)

    # 2. Regex over visible text
    for match in EMAIL_REGEX.finditer(soup.get_text()):
        raw.add(match.group().lower())

    # Filter noise
    clean = []
    for email in sorted(raw):
        domain = email.split("@")[-1]
        if domain in SKIP_EMAIL_DOMAINS:
            continue
        if any(kw in email for kw in SKIP_EMAIL_KEYWORDS):
            continue
        if len(email) > 80:
            continue
        clean.append(email)

    return clean[:6]  # at most 6


# ── Helper: Social + Directory link extractor ─────────────────────────────────

def _extract_links(soup: BeautifulSoup) -> tuple[dict, dict, list]:
    """
    Returns (social_links, directory_links, other_sites).
    social_links: {platform: url}
    directory_links: {platform: url}
    other_sites: [url, ...]  — other external domains found in page
    """
    social_links: dict[str, str] = {}
    directory_links: dict[str, str] = {}
    other_external: list[str] = []

    all_hrefs = [a.get("href", "") for a in soup.find_all("a", href=True)]

    for href in all_hrefs:
        if not href or href.startswith(("mailto:", "tel:", "javascript:", "#")):
            continue
        href_lower = href.lower()

        matched_social = False
        for platform, patterns in SOCIAL_PLATFORMS.items():
            if platform not in social_links:
                if any(p in href_lower for p in patterns):
                    # Filter out share buttons (usually very short paths)
                    if "sharer" not in href_lower and "share?" not in href_lower:
                        social_links[platform] = href
                        matched_social = True
                        break

        if matched_social:
            continue

        matched_dir = False
        for platform, patterns in DIRECTORY_PLATFORMS.items():
            if platform not in directory_links:
                if any(p in href_lower for p in patterns):
                    directory_links[platform] = href
                    matched_dir = True
                    break

        if matched_dir:
            continue

    return social_links, directory_links


# ── Helper: Try contact page for additional emails ────────────────────────────

async def _try_contact_page(session: aiohttp.ClientSession, base_url: str) -> list[str]:
    """Attempt to load /contact or /contact-us and extract emails."""
    contact_paths = ["/contact", "/contact-us", "/contactus", "/about", "/about-us"]
    for path in contact_paths:
        try:
            contact_url = base_url.rstrip("/") + path
            async with session.get(
                contact_url, allow_redirects=True, timeout=aiohttp.ClientTimeout(total=8)
            ) as resp:
                if resp.status == 200:
                    html = await resp.text(errors="ignore")
                    soup = BeautifulSoup(html, "html.parser")
                    emails = _extract_emails(soup, html)
                    if emails:
                        return emails
        except Exception:
            pass
    return []


# ── Main audit function ───────────────────────────────────────────────────────

async def audit_website(url: Optional[str]) -> Dict[str, Any]:
    """
    Phase 3: Full website quality audit.
    Returns quality score, detailed checks, emails, links, and social profiles.
    """
    if not url:
        return {
            "url": None,
            "status": "NONE",
            "quality_grade": "NONE",
            "quality_score": 0,
            "checks": {},
            "emails": [],
            "social_links": {},
            "directory_links": {},
        }

    if not url.startswith("http"):
        url = "https://" + url

    checks = {}
    score = 0
    emails: list[str] = []
    social_links: dict = {}
    directory_links: dict = {}

    try:
        parsed = urlparse(url)
        has_https = parsed.scheme == "https"
        checks["https"] = has_https
        if has_https:
            score += 10

        start_time = time.time()
        html_content = None
        final_url = url
        base_url = f"{parsed.scheme}://{parsed.netloc}"

        async with aiohttp.ClientSession(
            connector=aiohttp.TCPConnector(ssl=False),
            timeout=aiohttp.ClientTimeout(total=12),
            headers=HTTP_HEADERS,
        ) as session:
            try:
                async with session.get(url, allow_redirects=True, max_redirects=5) as resp:
                    load_time = round(time.time() - start_time, 2)
                    checks["http_status"] = resp.status
                    checks["load_time_sec"] = load_time
                    final_url = str(resp.url)

                    if resp.status == 200:
                        html_content = await resp.text(errors="ignore")
                        if load_time < 2:
                            score += 15
                        elif load_time < 4:
                            score += 8
                        elif load_time < 8:
                            score += 3
                    else:
                        checks["fetch_error"] = f"HTTP {resp.status}"
            except aiohttp.ClientError as e:
                load_time = round(time.time() - start_time, 2)
                checks["fetch_error"] = str(e)[:100]
                checks["load_time_sec"] = load_time
                if has_https:
                    http_url = url.replace("https://", "http://")
                    try:
                        async with session.get(
                            http_url, allow_redirects=True, max_redirects=5
                        ) as resp2:
                            if resp2.status == 200:
                                html_content = await resp2.text(errors="ignore")
                                checks["https"] = False
                                checks["http_status"] = resp2.status
                                score -= 10
                    except Exception:
                        pass

            if not html_content:
                return {
                    "url": url, "status": "ERROR", "quality_grade": "NONE",
                    "quality_score": 0, "checks": checks,
                    "emails": [], "social_links": {}, "directory_links": {},
                }

            soup = BeautifulSoup(html_content, "html.parser")

            # ── Extract emails & links ──────────────────────────────────────
            emails = _extract_emails(soup, html_content)
            social_links, directory_links = _extract_links(soup)

            # If no emails found on main page, try contact page
            if not emails:
                extra_emails = await _try_contact_page(session, base_url)
                emails = extra_emails

        # ── Quality checks ──────────────────────────────────────────────────
        html_lower = html_content.lower()

        # Mobile viewport
        viewport = soup.find("meta", attrs={"name": re.compile("viewport", re.I)})
        checks["mobile_viewport"] = bool(viewport)
        if viewport:
            score += 10

        # Responsive CSS
        style_tags = soup.find_all("style")
        inline_css = " ".join(tag.get_text() for tag in style_tags)
        checks["responsive_css"] = "@media" in inline_css
        if "@media" in inline_css:
            score += 10

        # Copyright year
        footer_text = ""
        footer = soup.find("footer")
        if footer:
            footer_text = footer.get_text()
        else:
            body = soup.find("body")
            if body:
                footer_text = body.get_text()[-500:]

        copyright_year = None
        year_matches = re.findall(r"20[12][0-9]", footer_text)
        if year_matches:
            copyright_year = max(int(y) for y in year_matches)
            checks["copyright_year"] = copyright_year
            if copyright_year >= 2023:
                score += 10
            elif copyright_year >= 2021:
                score += 5
            elif copyright_year <= 2018:
                score -= 10
        else:
            checks["copyright_year"] = None

        # Social media (scoring bool — social_links dict is the real data)
        checks["social_links"] = bool(social_links)
        if social_links:
            score += 5

        # Email found bonus
        checks["emails_found"] = len(emails)
        if emails:
            score += 5  # bonus for having a contactable email

        # Booking system
        all_hrefs = [a.get("href", "") for a in soup.find_all("a", href=True)]
        has_booking = any(p in html_lower for p in BOOKING_PATTERNS)
        has_booking_link = any(
            any(p in link.lower() for p in BOOKING_PATTERNS)
            for link in all_hrefs
        )
        checks["has_booking_system"] = has_booking or has_booking_link
        if has_booking or has_booking_link:
            score += 10

        # Directory presence (scoring bonus)
        checks["directory_profiles_count"] = len(directory_links)
        if directory_links:
            score += 3

        # Custom domain vs free builder
        domain = parsed.netloc.lower()
        is_free_builder = any(b in domain for b in FREE_BUILDERS)
        is_free_builder_meta = any(kw in html_lower for kw in FREE_BUILDER_META)
        checks["free_builder_detected"] = is_free_builder or is_free_builder_meta
        checks["domain"] = domain
        if not is_free_builder and not is_free_builder_meta:
            score += 10
        else:
            score -= 5

        # CMS detection
        cms = None
        if "wp-content" in html_lower or "wp-includes" in html_lower:
            cms = "WordPress"
        elif "drupal" in html_lower:
            cms = "Drupal"
        elif "joomla" in html_lower:
            cms = "Joomla"
        elif "wix.com" in html_lower:
            cms = "Wix"
        elif "squarespace" in html_lower:
            cms = "Squarespace"
        elif "weebly" in html_lower:
            cms = "Weebly"
        checks["cms_detected"] = cms

        # Outdated HTML
        font_tags = len(soup.find_all("font"))
        table_tags = len(soup.find_all("table"))
        has_flash = "swfobject" in html_lower or ".swf" in html_lower
        is_outdated = font_tags > 3 or table_tags > 10 or has_flash
        checks["outdated_html"] = is_outdated
        checks["font_tag_count"] = font_tags
        checks["table_layout_count"] = table_tags
        if is_outdated:
            score -= 10

        # Images alt ratio
        all_imgs = soup.find_all("img")
        if all_imgs:
            imgs_with_alt = [i for i in all_imgs if i.get("alt", "").strip()]
            alt_ratio = round(len(imgs_with_alt) / len(all_imgs), 2)
            checks["image_alt_ratio"] = alt_ratio
            if alt_ratio > 0.8:
                score += 5

        # CSS framework
        css_framework = None
        if "bootstrap" in html_lower:
            css_framework = "Bootstrap"
        elif "tailwindcss" in html_lower or "tailwind" in html_lower:
            css_framework = "Tailwind"
        elif "materialize" in html_lower:
            css_framework = "Materialize"
        elif "bulma" in html_lower:
            css_framework = "Bulma"
        checks["css_framework"] = css_framework
        if css_framework:
            score += 5

        # Luxury keywords
        luxury_count = sum(1 for kw in LUXURY_KEYWORDS if kw in html_lower)
        checks["luxury_keyword_count"] = luxury_count

        # Clamp + grade
        score = max(0, min(100, score))
        if score >= 75:
            grade = "EXCELLENT"
        elif score >= 55:
            grade = "DECENT"
        elif score >= 35:
            grade = "POOR"
        else:
            grade = "VERY_POOR"

        return {
            "url": final_url,
            "status": "EXISTS",
            "quality_grade": grade,
            "quality_score": score,
            "checks": checks,
            "emails": emails,
            "social_links": social_links,
            "directory_links": directory_links,
        }

    except Exception as e:
        return {
            "url": url,
            "status": "ERROR",
            "quality_grade": "NONE",
            "quality_score": 0,
            "checks": {"error": str(e)[:200]},
            "emails": [],
            "social_links": {},
            "directory_links": {},
        }
