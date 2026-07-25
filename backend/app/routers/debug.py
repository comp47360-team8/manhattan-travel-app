# TEMPORARY — diagnostic for the Gemini "User location is not supported" (400
# FAILED_PRECONDITION) geo-block. Probes Gemini through each proxy in the
# DEBUG_PROXIES env var (comma-separated) to find which egress countries are
# accepted, then delete this file and its include in main.py.
import os

import httpx
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/api/debug", tags=["debug"])

GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/"
    "models/gemini-3.5-flash:generateContent?key={key}"
)


def _probe(key: str, proxy: str | None) -> dict:
    out = {"via": proxy or "direct (this server's region)"}
    try:
        out["egress_ip"] = httpx.get(
            "https://api.ipify.org", proxy=proxy, timeout=20
        ).text
    except Exception as e:
        out["egress_ip"] = f"error: {e}"
    try:
        r = httpx.post(
            GEMINI_URL.format(key=key),
            json={"contents": [{"parts": [{"text": "ping"}]}]},
            proxy=proxy,
            timeout=30,
        )
        out["gemini_status"] = r.status_code
        out["gemini_body"] = r.text[:300]
    except Exception as e:
        out["gemini_status"] = "error"
        out["gemini_body"] = str(e)
    return out


@router.get("/gemini-region-test")
def gemini_region_test(token: str = Query(...)):
    if token != os.environ.get("DEBUG_TOKEN"):
        raise HTTPException(status_code=404)
    key = os.environ["GEMINI_API_KEY"]
    # Comma-separated proxy URLs, each an egress country to test. A blank entry
    # (e.g. a trailing comma) probes this server's own region as a control.
    targets = [
        p.strip() or None
        for p in os.environ.get("DEBUG_PROXIES", "").split(",")
    ] or [None]
    return {"results": [_probe(key, p) for p in targets]}
