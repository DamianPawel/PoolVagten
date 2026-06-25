"""Poolvagten — fritstående backend.

Én FastAPI-service der:
  * serverer frontend (app/static/index.html)
  * gemmer delt husstandsstatus (Postgres hvis DATABASE_URL findes, ellers lokal JSON-fil)
  * proxy'er vejr fra Open-Meteo (ingen nøgle)
  * proxy'er AI-plan til Claude (server-side nøgle, så den aldrig ligger i browseren)

Bevidst holdt minimal: én tabel med ét JSON-dokument = "uhyrligt nemt".
"""
from __future__ import annotations

import asyncio
import json
import os
from contextlib import asynccontextmanager
from pathlib import Path

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

DATABASE_URL = os.getenv("DATABASE_URL")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
MODEL = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-6")
# Reservemodel hvis den primære er overbelastet (529). Haiku er hurtigere/mindre presset.
FALLBACK_MODEL = os.getenv("CLAUDE_FALLBACK_MODEL", "claude-haiku-4-5-20251001")

BASE = Path(__file__).resolve().parent
STATIC = BASE / "static"
STATE_FILE = Path(os.getenv("STATE_FILE", BASE.parent / "pool_state.json"))

_pool = None  # asyncpg pool, set on startup when a database is configured


# --------------------------------------------------------------------------- #
# Storage: Postgres when available, otherwise a local JSON file (local dev).
# --------------------------------------------------------------------------- #
async def _db_init() -> None:
    global _pool
    if not DATABASE_URL:
        return
    import asyncpg  # imported lazily so local dev needs no DB driver

    _pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=4)
    async with _pool.acquire() as conn:
        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS pool_state (
                id         INT PRIMARY KEY DEFAULT 1,
                data       JSONB NOT NULL,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
            """
        )


async def get_state() -> dict | None:
    if _pool:
        async with _pool.acquire() as conn:
            row = await conn.fetchrow("SELECT data FROM pool_state WHERE id = 1")
            return json.loads(row["data"]) if row else None
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text("utf-8"))
    return None


async def put_state(data: dict) -> dict:
    payload = json.dumps(data, ensure_ascii=False)
    if _pool:
        async with _pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO pool_state (id, data, updated_at)
                VALUES (1, $1, now())
                ON CONFLICT (id) DO UPDATE
                    SET data = EXCLUDED.data, updated_at = now()
                """,
                payload,
            )
    else:
        STATE_FILE.write_text(payload, "utf-8")
    return data


@asynccontextmanager
async def lifespan(_: FastAPI):
    await _db_init()
    yield
    if _pool:
        await _pool.close()


app = FastAPI(title="Poolvagten", version="1.2.0", lifespan=lifespan)


# --------------------------------------------------------------------------- #
# API
# --------------------------------------------------------------------------- #
@app.get("/api/health")
async def health() -> dict:
    return {"ok": True, "db": bool(_pool)}


@app.get("/api/state")
async def read_state() -> dict:
    return await get_state() or {}


@app.put("/api/state")
async def write_state(payload: dict) -> dict:
    return await put_state(payload)


@app.get("/api/weather")
async def weather(lat: float = 55.4486, lng: float = 10.6622) -> dict:
    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lng}"
        "&daily=weather_code,temperature_2m_max,temperature_2m_min,"
        "precipitation_sum,uv_index_max"
        "&timezone=Europe%2FCopenhagen&forecast_days=4"
    )
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.json()


@app.get("/api/geocode")
async def geocode(q: str) -> dict:
    """Slå en fri-tekst-adresse op → bredde/længdegrad via Nominatim (OpenStreetMap).

    Gratis og uden nøgle, ligesom vejr-proxyen. Nominatim kræver en sigende
    User-Agent. Gade-niveau, så man kan indtaste en fuld adresse i stedet for
    selv at finde koordinater.
    """
    q = (q or "").strip()
    if not q:
        raise HTTPException(400, "Tom adresse.")
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": q, "format": "jsonv2", "limit": 1},
            headers={"User-Agent": "Poolvagten/1.0 (husstands-pool-app)"},
        )
        resp.raise_for_status()
        hits = resp.json()
    if not hits:
        raise HTTPException(404, "Adressen blev ikke fundet.")
    hit = hits[0]
    return {
        "lat": float(hit["lat"]),
        "lng": float(hit["lon"]),
        "name": hit.get("display_name", q),
    }


async def _anthropic(extra: dict, max_tokens: int = 1000) -> str:
    """Send et kald til Anthropic med retry + reservemodel og returnér teksten.

    `extra` indeholder fx {"messages": [...]} og evt. {"system": "..."}.
    Anthropic kan svare 529 (overloaded) / 503 / 429 i korte perioder, så vi
    prøver den primære model med backoff og falder ellers tilbage til
    reservemodellen, før vi giver op.
    """
    if not ANTHROPIC_API_KEY:
        raise HTTPException(500, "ANTHROPIC_API_KEY er ikke sat på serveren.")
    headers = {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    overloaded = (429, 503, 529)
    models = [MODEL] + ([FALLBACK_MODEL] if FALLBACK_MODEL and FALLBACK_MODEL != MODEL else [])
    resp = None
    async with httpx.AsyncClient(timeout=45) as client:
        for model in models:
            payload = {"model": model, "max_tokens": max_tokens, **extra}
            for attempt in range(3):
                resp = await client.post(
                    "https://api.anthropic.com/v1/messages", headers=headers, json=payload
                )
                if resp.status_code == 200 or resp.status_code not in overloaded:
                    break
                if attempt < 2:
                    await asyncio.sleep(1.5 * (attempt + 1))  # 1,5s · 3s
            if resp.status_code == 200:
                break
            if resp.status_code not in overloaded:
                raise HTTPException(
                    502, f"Anthropic {resp.status_code} (model={model}): {resp.text[:400]}"
                )
            # ellers: overbelastet → prøv næste model
    if resp is None or resp.status_code != 200:
        raise HTTPException(503, "AI-tjenesten er overbelastet lige nu. Prøv igen om et øjeblik.")
    data = resp.json()
    return "".join(
        block.get("text", "")
        for block in data.get("content", [])
        if block.get("type") == "text"
    )


class PlanRequest(BaseModel):
    prompt: str


@app.post("/api/plan")
async def plan(req: PlanRequest) -> dict:
    text = await _anthropic({"messages": [{"role": "user", "content": req.prompt}]}, max_tokens=1000)
    return {"text": text}


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    system: str = ""
    messages: list[ChatMessage]


@app.post("/api/chat")
async def chat(req: ChatRequest) -> dict:
    msgs = [{"role": m.role, "content": m.content} for m in req.messages][-20:]
    # Anthropic kræver at samtalen starter med en bruger-besked.
    while msgs and msgs[0]["role"] != "user":
        msgs.pop(0)
    if not msgs:
        raise HTTPException(400, "Ingen besked.")
    extra: dict = {"messages": msgs}
    if req.system.strip():
        extra["system"] = req.system
    text = await _anthropic(extra, max_tokens=700)
    return {"text": text}


# --------------------------------------------------------------------------- #
# Frontend (mounted last so /api/* wins)
# --------------------------------------------------------------------------- #
app.mount("/static", StaticFiles(directory=str(STATIC)), name="static")


@app.get("/")
async def index() -> FileResponse:
    # no-cache: browseren skal altid revalidere index.html mod serverens etag,
    # så et nyt deploy slår igennem med det samme (ingen blank side fra gammel cache).
    return FileResponse(str(STATIC / "index.html"), headers={"Cache-Control": "no-cache"})
