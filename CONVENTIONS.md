# CONVENTIONS.md

## Python (backend)
- Python 3.11+, async hele vejen (`async def`, `httpx.AsyncClient`).
- Type hints på alle funktionssignaturer.
- Hold `main.py` flad og læsbar; udskil kun i moduler hvis filen vokser markant.
- Ingen ORM. Rå SQL mod den ene tabel er bevidst valgt for enkelhed.
- Miljøvariabler læses ét sted, øverst i `main.py`.

## Frontend (index.html)
- React-funktionskomponenter med hooks. Ingen klassekomponenter.
- Styling via inline-style-objekter og det fælles `T`-temaobjekt — ingen ekstern CSS-ramme.
- Brugervendt tekst på **dansk**. Knapper siger hvad der sker ("Gem", "Tilføj", "Generér plan").
- Tal til UI rundes ét sted (`doses()`), så visning og log altid stemmer.
- Ingen nye CDN-scripts uden begrundelse i LOG.

## Data
- Al delt tilstand er ét JSON-objekt: `{ config, profiles, checks, log, readings, plan, updatedAt }`.
- `checks`-nøgler: `"YYYY-MM-DD::taskId"`.
- `updatedAt` (epoch ms) bumpes ved hver skrivning; klienter poller og adopterer nyeste.
- Per-enhed (ikke delt): valgt profil i `localStorage["pool:me"]`.

## Git
- Branches: `feat/...`, `fix/...`, `chore/...`.
- Commit-beskeder i imperativ: "Tilføj auto-plan toggle", ikke "tilføjede".
- Små, fokuserede commits. `main` skal altid kunne deployes.

## Sikkerhed
- Hemmeligheder kun i miljøvariabler, aldrig i koden eller frontend.
- `ANTHROPIC_API_KEY` forlader aldrig serveren.
