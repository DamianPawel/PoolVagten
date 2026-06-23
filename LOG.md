# LOG.md

Omvendt kronologisk arbejdslog. Nyeste øverst.

## 2026-06-23 — Feature: registrér ekstra doser
- "Dine doser": hver række har nu en valgfri **+ Givet**-knap, der logger en ekstra dosis (med profil) — fx ekstra OxyChock-chok 400 g.
- Datamodel: ingen ny top-level — ekstra doser gemmes som almindelige log-poster med et `extra:{name,amount}`-mærke (holder "ét JSON-dokument").
- AI-plan: `generatePlan` tilføjer sektionen "EKSTRA DOSER GIVET FOR NYLIG" (sidste 4 dage) + en regel, så Claude ikke anbefaler at gentage et chok samme dag og nævner opfølgning.
- Aldrig påkrævet — kun en mulighed, som ønsket.

## 2026-06-23 — Oprydning + nyt domæne
- Slettede overflødig `poolvagten.jsx` (oprindelig artifact) — hele UI'et bor i `app/static/index.html`, og intet refererede til filen.
- Nyt, kortere public domæne: **poolvagten.up.railway.app** (det gamle `web-production-6f6f1a…` blev fjernet, hvilket kortvarigt gav "Application not found" på den gamle adresse — ikke en kodefejl).

## 2026-06-23 — Feature: adresse-opslag i Indstillinger
- Tilføjede `/api/geocode?q=` — proxy til **Nominatim (OpenStreetMap)**: fri-tekst-adresse → bredde/længdegrad. Gratis, ingen nøgle, gade-niveau (Open-Meteos geokoder kan kun stednavne).
- Begrundelse (gylden regel 1): ny ekstern tjeneste, men ingen ny Python-pakke og ingen hemmelighed — fuldstændig samme mønster som det eksisterende vejr-proxy. Rører ikke stak/datamodel, derfor inden for self-directed.
- Frontend: adressefelt + "Find"-knap i Indstillinger udfylder lokation + koordinater automatisk; felterne kan stadig rettes manuelt.
- Note: profilvalg gemmes allerede per-enhed i `localStorage` (`pool:me`) — bekræftet i koden; ingen ændring nødvendig.

## 2026-06-23 — Fix: blank side (Babel 8 brød frontend)
- Symptom: deployet kørte (`/api/health` ok), men `/` viste blank side. Konsol: `SyntaxError: Cannot use import statement outside a module` i Babels `transformScriptTags`.
- Rod-årsag: CDN-scripts var upinnede. unpkg serverede nu **Babel 8.0.2**, hvor `preset-react` skiftede default til "automatic" JSX-runtime → indsætter `import { jsx } from "react/jsx-runtime"` i det transformerede (klassiske) script → fejler. Ikke en netværks- eller udvidelsesfejl (bekræftet i inkognito).
- Fix: pinnede `react@18.3.1`, `react-dom@18.3.1` og `@babel/standalone@7.29.7` (classic runtime, `React.createElement`). Ingen kodeændring i selve appen.
- Læring: pin altid CDN-versioner — "intet byggetrin" gør os afhængige af, at CDN'ets defaults ikke ændrer sig.
- Opfølgning: satte `Cache-Control: no-cache` på `/` (index.html), så fremtidige deploys slår igennem uden blank side fra gammel browser-cache. Bekræftet virkende på desktop + telefon.

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
