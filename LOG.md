# LOG.md

Omvendt kronologisk arbejdslog. Nyeste øverst.

## 2026-06-23 — Live på Railway
- Oprettede privat GitHub-repo `DamianPawel/PoolVagten` og pushede scaffold (første commit).
- Deployede `web`-service på Railway + tilføjede PostgreSQL-plugin.
- Koblede DB på via Variable Reference `${{Postgres.DATABASE_URL}}` (intern URL, ikke kopieret streng — holder sig selv opdateret).
- Sat `ANTHROPIC_API_KEY` og `CLAUDE_MODEL` på `web`-servicen.
- Bekræftet: `GET /api/health` → `{"ok":true,"db":true}`. App oppe og forbundet til Postgres.
- Mangler stadig: bekræfte delt status mellem to telefoner.

## 2026-06-23 — Initialt scaffold (v1.0.0)
- Oprettede projektet efter bootstrap-standarden (microservice / LITE / self-directed).
- `app/main.py`: FastAPI med `/api/state` (GET/PUT), `/api/weather` (Open-Meteo proxy), `/api/plan` (Claude proxy), `/api/health`, samt static-servering af frontend.
- Datalag: Postgres via `asyncpg` når `DATABASE_URL` findes; ellers lokal `pool_state.json`. Bevidst ét JSON-dokument i én tabel for enkelhed.
- `app/static/index.html`: hele UI'et portet fra den oprindelige Claude-artifact til standalone (React 18 + Babel via CDN, ingen bundler). Browser-storage erstattet af `/api/state`; valgt profil i `localStorage`.
- Tilføjede profiler (initialer) og auto-generering af AI-plan hver morgen med til/fra under Indstillinger.
- Doseringsstandarder sat efter Swim & Funs officielle vejledning (se VERSIONS).
- Beslutning: AI-nøgle holdes server-side bag `/api/plan`, så den aldrig når browseren.
- Åben note: KlarPools ugentlige dosis er et kvalificeret estimat (kun startdosis er officielt oplyst) — skal bekræftes mod etiketten.
