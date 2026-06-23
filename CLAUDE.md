# CLAUDE.md

Kontekst og regler for Claude Code når der arbejdes i dette repo.

## Projektet i én sætning
En lille, delt husstands-app til pool-vedligehold — den skal forblive **uhyrligt nem**: minimal kode, ingen unødvendige afhængigheder, intet byggetrin i frontend.

## Stak (må ikke udvides uden grund)
- Backend: FastAPI + Python 3.11+, async via `httpx` og `asyncpg`.
- Data: én Postgres-tabel (`pool_state`) med ét JSON-dokument. Falder tilbage til lokal JSON-fil uden `DATABASE_URL`.
- Frontend: én `app/static/index.html`, React 18 + Babel via CDN. Ingen npm, ingen bundler.
- Hosting: Railway, push-to-deploy fra GitHub.

## Gyldne regler
1. **Hold det simpelt.** Ny afhængighed eller nyt lag kræver en eksplicit begrundelse i `LOG.md`.
2. **Hele app-tilstanden er ét JSON-dokument.** Læs/skriv via `/api/state`. Last-write-wins er accepteret for en husstand.
3. **Hemmeligheder kun server-side.** `ANTHROPIC_API_KEY` må aldrig nå browseren — AI-kald går altid gennem `/api/plan`.
4. **Doseringstal er fakta.** Standarderne stammer fra Swim & Funs vejledning (se VERSIONS). Lav dem ikke om uden kilde.
5. **Dansk UI.** Al brugervendt tekst på dansk, venlig og kort.
6. **Mobil først.** Layout testes på smal skærm (~380 px) før desktop.
7. Opdatér `LOG.md`, `TODO.md` og `VERSIONS.md` ved hver meningsfuld ændring.

## Eskaleringstilstand
Selvkørende (self-directed). Agenten må selv beslutte og udføre småændringer, men skal eskalere til mennesket ved: skift af stak/hosting, datamodel-brud, nye afhængigheder, eller noget der rører hemmeligheder.

## Hvor tingene er
- API + datalag: `app/main.py`
- Hele UI'et: `app/static/index.html`
- Doseringslogik og vejr-koder: i `index.html` (`doses()`, `wx()`, `pumpHours()`)
