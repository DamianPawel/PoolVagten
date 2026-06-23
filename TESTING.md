# TESTING.md

Let, manuel teststrategi der matcher appens størrelse. Automatisér først hvis projektet vokser.

## Smoke-test lokalt
```bash
uvicorn app.main:app --reload
```
1. `GET /api/health` → `{"ok": true, "db": false}` uden DB.
2. Åbn `/` — appen loader, vejr for Kerteminde vises (eller manuelle vejr-knapper hvis offline).
3. Tilføj en profil → vælg den → sæt flueben på en opgave → den får ✓ + initialer.
4. Gå til **Log** → handlingen står der med initialer og tid.
5. Genindlæs siden → status er bevaret (skrevet til `pool_state.json`).
6. **Plan** → "Generér plan" giver dag-for-dag-kort (kræver `ANTHROPIC_API_KEY`).

## Delt status (to faner)
Åbn appen i to faner. Sæt flueben i den ene → den anden opdaterer inden for ~20 sek. Bekræfter delt tilstand + polling.

## Doseringskontrol
For 16.000 L skal "Dine doser" vise: OxyChock+Aktivator **64 g + 40 ml** hver 3. dag, KlarPool **80 ml**, FlokPool **80–160 ml**, sæsonstart **320 g + 160 ml**. Ændr poolstørrelse i Indstillinger og bekræft at tallene skalerer lineært.

## Endpoints (curl)
```bash
curl localhost:8000/api/health
curl "localhost:8000/api/weather?lat=55.45&lng=10.66"
curl -X PUT localhost:8000/api/state -H "Content-Type: application/json" -d '{"hello":"world","updatedAt":1}'
curl localhost:8000/api/state
```

## Før deploy
- `pip install -r requirements.txt` kører rent.
- Ingen hemmeligheder i git (`git grep -i "sk-ant"` skal være tom).
- `main` er grøn.
