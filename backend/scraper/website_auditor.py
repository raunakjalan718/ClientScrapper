import asyncio
import re
import ssl
import time
from typing import Dict, Any, Optional
from urllib.parse import urlparse

import aiohttp
from bs4 import BeautifulSoup

# Free website builders / CMS patterns
FREE_BUILDERS = [
    "wix.com", "weebly.com", "squarespace.com", "godaddy.com",
    "jimdo.com", "strikingly.com", "yola.com", "webnode.com",
    "site123.com", "mobirise.com",
]
FREE_BUILDER_META = [
    "wix", "weebly", "squarespace", "godaddy website builder",
    "jimdo", "strikingly", "webflow",
]
OUTDATED_CMS = ["wordpress", "joomla", "drupal", "blogger", "blogspot"]
BOOKING_PATTERNS = [
    "calendly.com", "zocdoc.com", "practo.com", "doctolib",
    "appointment", "book", "schedule", "consult", "booking",
]
LUXURY_KEYWORDS = [
    "luxury", "boutique", "premium", "exclusive", "concierge",
    "elite", "vip", "executive", "specialist", "advanced",
    "state-of-the-art", "cutting-edge", "world-class",
]


async def audit_website(url: Optional[str]) -> Dict[str, Any]:
    """
    Phase 3: Full website quality audit.
    Returns a quality score (0-100) and detailed check results.
    """
    if not url:
        return {
            "url": None,
            "status": "NONE",
            "quality_grade": "NONE",
            "quality_score": 0,
            "checks": {},
        }

    # Ensure URL has scheme
    if not url.startswith("http"):
        url = "https://" + url

    checks = {}
    score = 0

    try:
        # 1. HTTPS check
        parsed = urlparse(url)
        has_https = parsed.scheme == "https"
        checks["https"] = has_https
        if has_https:
            score += 10

        # 2. Fetch the page with timeout
        start_time = time.time()
        html_content = None
        final_url = url

        async with aiohttp.ClientSession(
            connector=aiohttp.TCPConnector(ssl=False),
            timeout=aiohttp.ClientTimeout(total=12),
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                )
            },
        ) as session:
            try:
                async with session.get(url, allow_redirects=True, max_redirects=5) as resp:
                    load_time = round(time.time() - start_time, 2)
                    checks["http_status"] = resp.status
                    checks["load_time_sec"] = load_time
                    final_url = str(resp.url)

                    if resp.status == 200:
                        html_content = await resp.text(errors="ignore")

                        # Load time scoring
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
                # Try HTTP fallback if HTTPS failed
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
                                score -= 10  # Was in HTTPS but fell back
                    except Exception:
                        pass

        if not html_content:
            return {
                "url": url,
                "status": "ERROR",
                "quality_grade": "NONE",
                "quality_score": 0,
                "checks": checks,
            }

        soup = BeautifulSoup(html_content, "html.parser")

        # 3. Mobile viewport
        viewport = soup.find("meta", attrs={"name": re.compile("viewport", re.I)})
        checks["mobile_viewport"] = bool(viewport)
        if viewport:
            score += 10

        # 4. Responsive CSS (@media queries)
        style_tags = soup.find_all("style")
        inline_css = " ".join(tag.get_text() for tag in style_tags)
        link_tags = soup.find_all("link", rel=lambda r: r and "stylesheet" in r)
        has_media_queries = "@media" in inline_css
        checks["responsive_css"] = has_media_queries
        if has_media_queries:
            score += 10

        # 5. Copyright year check (look for recent years)
        footer_text = ""
        footer = soup.find("footer")
        if footer:
            footer_text = footer.get_text()
        else:
            # Fall back to last 500 chars of body
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

        # 6. Social media links
        html_lower = html_content.lower()
        social_platforms = ["facebook.com", "instagram.com", "linkedin.com", "twitter.com", "x.com"]
        has_social = any(p in html_lower for p in social_platforms)
        checks["social_links"] = has_social
        if has_social:
            score += 5

        # 7. Booking/appointment system
        has_booking = any(p in html_lower for p in BOOKING_PATTERNS)
        # Also check links
        all_links = [a.get("href", "") for a in soup.find_all("a", href=True)]
        has_booking_link = any(
            any(p in link.lower() for p in BOOKING_PATTERNS)
            for link in all_links
        )
        checks["has_booking_system"] = has_booking or has_booking_link
        if has_booking or has_booking_link:
            score += 10

        # 8. Custom domain vs free builder
        domain = parsed.netloc.lower()
        is_free_builder = any(builder in domain for builder in FREE_BUILDERS)
        is_free_builder_meta = any(
            kw in html_lower for kw in FREE_BUILDER_META
        )
        checks["free_builder_detected"] = is_free_builder or is_free_builder_meta
        checks["domain"] = domain
        if not is_free_builder and not is_free_builder_meta:
            score += 10
        else:
            score -= 5

        # 9. CMS detection
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

        # 10. Outdated HTML patterns (table-heavy layouts, <font> tags, Flash)
        font_tags = len(soup.find_all("font"))
        table_tags = len(soup.find_all("table"))
        has_flash = "swfobject" in html_lower or ".swf" in html_lower
        is_outdated = font_tags > 3 or table_tags > 10 or has_flash
        checks["outdated_html"] = is_outdated
        checks["font_tag_count"] = font_tags
        checks["table_layout_count"] = table_tags
        if is_outdated:
            score -= 10

        # 11. Images alt attribute check
        all_imgs = soup.find_all("img")
        imgs_with_alt = [
            img for img in all_imgs if img.get("alt", "").strip()
        ]
        if all_imgs:
            alt_ratio = len(imgs_with_alt) / len(all_imgs)
            checks["image_alt_ratio"] = round(alt_ratio, 2)
            if alt_ratio > 0.8:
                score += 5

        # 12. CSS framework detection
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

        # 13. Luxury/premium content markers
        luxury_count = sum(1 for kw in LUXURY_KEYWORDS if kw in html_lower)
        checks["luxury_keyword_count"] = luxury_count

        # Clamp score
        score = max(0, min(100, score))

        # Grade
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
        }

    except Exception as e:
        return {
            "url": url,
            "status": "ERROR",
            "quality_grade": "NONE",
            "quality_score": 0,
            "checks": {"error": str(e)[:200]},
        }
