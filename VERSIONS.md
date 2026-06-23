# VERSIONS.md

## App-version
**1.0.0** (2026-06-23) — første scaffold: state-API, vejr- og plan-proxy, standalone frontend, profiler, auto-plan.

## Runtime
- Python 3.11+
- FastAPI ≥ 0.110
- Uvicorn ≥ 0.29
- httpx ≥ 0.27
- asyncpg ≥ 0.29
- pydantic ≥ 2.6
- Frontend: React 18.3.1 + ReactDOM 18.3.1 + @babel/standalone **7.29.7** via unpkg CDN (pinnede versioner — Babel 8 bruger automatic JSX-runtime og bryder in-browser-transformen)
- AI-model: `claude-sonnet-4-6` (override via `CLAUDE_MODEL`)
- Vejr: Open-Meteo forecast API (ingen nøgle)
- Geokodning: Nominatim / OpenStreetMap (ingen nøgle) — adresse → koordinater

## Doseringsstandarder (Swim & Fun, aktiv ilt-system)
Tal pr. 10.000 liter. Skaleres lineært med poolstørrelse i appen.

| Produkt | Anvendelse | Dosis pr. 10.000 L |
|---|---|---|
| OxyChock + Aktivator | Løbende, hver 3. dag | 40 g + 25 ml (¼ dl) |
| OxyChock | Alternativ, dagligt | 20 g |
| OxyChock + Aktivator | Sæsonstart | 200 g + 100 ml (1 dl) |
| OxyChock | Problem-/chokvand | 250 g |
| KlarPool | Startdosis | 100 ml (1 dl) |
| KlarPool | Ugentligt (estimat) | ~50 ml — bekræft mod etikette |
| FlokPool | Uklart vand, efter pH-justering | 50–100 ml |

Mål-niveauer: pH **7,0–7,4**, aktiv ilt **3–5 mg/l**.

Flokning med sandfilter: tilsæt i skimmeren mens pumpen kører, returskyl efter 2–3 dage. Alternativ: Flocking Sticks i skimmeren til løbende flokning.

> Kilde: Swim & Funs produktvejledninger (OxyChock, Aktivator, KlarPool, FlokPool), juni 2026. Opdatér denne tabel hvis producentens tal ændrer sig.
