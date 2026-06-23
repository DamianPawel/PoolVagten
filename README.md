# Poolvagten ☀️🏊

Fritstående husstands-app til vedligehold af en klorfri pool (Swim & Fun aktiv ilt-system). Én FastAPI-service serverer frontend, gemmer delt status, henter vejr og lægger en AI-plan for de næste dage.

Bygget efter ReRisePeople bootstrap-standarden: **microservice**-variant, **LITE** agent-team.

## Hvad den kan
- **Delt status** for hele husstanden — alle ser samme tjekliste, log og målinger.
- **Profiler** med initialer — se hvem der gjorde hvad, uden login.
- **Live vejr** for din lokation (Open-Meteo, ingen nøgle).
- **AI-plan** for de næste dage (Claude), der genereres automatisk hver morgen.
- **Doser** regnet til din poolstørrelse ud fra Swim & Funs officielle vejledning.

## Stak
- FastAPI + Python (én service, serverer også frontend)
- PostgreSQL på Railway (falder tilbage til lokal JSON-fil uden DB)
- Frontend: én `index.html` med React via CDN — **intet byggetrin**

## Kør lokalt
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export ANTHROPIC_API_KEY=sk-ant-...      # kun nødvendig for AI-planen
uvicorn app.main:app --reload
# åbn http://localhost:8000
```
Uden `DATABASE_URL` gemmes status i `pool_state.json` i projektmappen — nemt til test.

## Deploy på Railway
1. Push repoet til GitHub.
2. Railway → **New Project** → **Deploy from GitHub repo**.
3. Tilføj **PostgreSQL** (Railway sætter selv `DATABASE_URL`).
4. Variables → tilføj `ANTHROPIC_API_KEY`.
5. Railway bygger via Nixpacks og starter med kommandoen i `railway.toml`.
6. Generér et domæne under **Settings → Networking** og send linket til familien.

## API
| Metode | Sti | Funktion |
|---|---|---|
| GET | `/api/state` | Hent delt status |
| PUT | `/api/state` | Gem delt status |
| GET | `/api/weather?lat=&lng=` | Vejr (Open-Meteo proxy) |
| POST | `/api/plan` | AI-plan (Claude proxy) |
| GET | `/api/health` | Health check |

## Struktur
```
poolvagten-cloud/
├── app/
│   ├── main.py            # FastAPI: state, vejr, plan, static
│   └── static/index.html  # hele frontend'en
├── requirements.txt
├── Procfile
├── railway.toml
├── .env.example
└── docs: README, CLAUDE, AGENTS, CONVENTIONS, TESTING, TODO, LOG, VERSIONS
```
