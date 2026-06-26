# LOG.md

Omvendt kronologisk arbejdslog. Nyeste øverst.

## 2026-06-23 — Dine doser: foldbar fremgangsmåde
- Tryk på et produktnavn i "Dine doser" → folder en kort how-to ud (`DOSE_INFO`, keyet på produktnavn; `DoseRow` har nu lokal open-state + chevron).
- Teksterne følger de eksisterende retningslinjer (pH-mål, intervaller, filter/flok-metode) — ingen nye doseringstal.

## 2026-06-23 — v1.2.0: opfølgning, måleforslag, grupper, spørgechat
- **Opfølgning:** hver ekstra dosis (logExtra) opretter en followup (due = +2 dage). På "I dag" vises forfaldne followups (dedup pr. navn) med Ja/Nej; svaret logges (`followup`-mærke) og medtages i AI-planen, så den kan foreslå næste skridt ved manglende bedring. Valg: alle 'efter behov'-doser.
- **Måleforslag (lokalt):** `measureSuggestions` regner et konkret forslag ud fra seneste pH/ilt/klor vs. målområder og JERES satser (fx pH 7,8 → ~X g pH-Minus). Vises som alert på "I dag". Ingen AI involveret (brugervalg).
- **Skal gøres grupperet:** `FREQ_BUCKET`/`BUCKET_ORDER` → Dagligt/Ugentligt/Månedligt/Årligt; eksakt interval står stadig som undertekst på opgaven.
- **Spørgechat (delt):** ny "Spørg"-fane + `ChatView`; `state.chat` deles i husstanden; `buildChatSystem` giver Claude pool-kontekst (system, satser, mål, seneste målinger/log/vejr). Backend: nyt `/api/chat` + `_anthropic`-hjælper (genbrugt retry/reservemodel; `/api/plan` refaktoreret oveni).
- Datamodel: kun nye top-level `followups`/`chat` (migreres ind med defaults). Ingen ny pakke. Verificeret: JSX transpilerer rent (Babel 7), main.py importerer, uafhængig agent-review fandt ingen fejl.

## 2026-06-23 — Log: dedup + slet enkelt post
- Dedup: ny `addLogEntry` slår identiske hændelser (samme person+label) sammen inden for 90 sek. — bruges i `toggleTask`, `saveReading`, `logExtra`. Stopper dubletter fra fluebens-fjern/sæt og dobbelt-tryk.
- Slet: hver log-post har nu en to-trins **× → Slet?**-knap (auto-fortryd efter 3 sek.), `deleteLog` filtrerer posten ud. Rydder også gamle dubletter.

## 2026-06-23 — Log grupperet per dag (foldbar)
- `LogView` grupperer nu hændelser per dato i foldbare sektioner ("I dag", "I går", ellers "Ugedag DD/MM") med antal hændelser; dagens sektion er åben som standard.
- Inde i hver dag vises hvem (initialer) + hvad + klokkeslæt. Nye hjælpere `dayHeading`/`clockTime`.

## 2026-06-23 — Tjekliste: opdel rengøring + FilterBalls-backwash
- Delt "Børst sider & støvsug bund" op i to opgaver: "Børst siderne" (id `brush`) og "Støvsug bunden" (id `vacuum`, bevarer historik).
- FilterBalls sidder i et sandfilter hos brugeren → opgaven hedder nu "Returskyl FilterBalls (backwash + rinse)" (før: "Skyl/vask"), plus ny månedlig "Spul FilterBalls rene" (kun ved filterType=balls).
- Ny frekvens `monthly` (≥30 dage) i FREQ_LABEL + isDue.

## 2026-06-23 — Fix: plan fejlede (Anthropic 529 overloaded)
- Symptom: "Opdatér plan" gav "Kunne ikke hente planen". `/api/plan` returnerede generisk 500.
- Rod-årsag: Anthropic svarede **529 overloaded** (forbigående). `resp.raise_for_status()` skjulte årsagen som 500. Model/nøgle var i orden.
- Fix: `/api/plan` returnerer nu den faktiske upstream-fejl (502 m. status+besked) **og** prøver igen ved 529/503/429 med backoff (1,5s · 3s · 4,5s, op til 4 forsøg).

## 2026-06-23 — Adskil systemerne helt (aktiv ilt vs klor)
- Efter ønske: ingen krydsreferencer. Aktiv ilt-tilstand viser kun ilt-produkter (klor-chok-opgave og -dose-række fjernet); klor-tilstand viser kun klor (ingen OxyChock/sæsonstart — var allerede tilfældet).
- Fjernet i `index.html`: klor-chok fra `buildTasks` og `buildDoseRows` (aktiv ilt-grene), klor-chok-sætningen i AI-prompten og den tilhørende plan-regel. UV-reglen bevaret.
- Verificeret: JSX transpilerer rent (Babel 7); eneste tilbageværende "Klor-chok (grønt vand)" hører til klor-tilstand.

## 2026-06-23 — Dual-system, UV & udvidet katalog (v1.1.0)
- **Dual-system:** `config.system` ("oxygen"/"chlorine") styrer trin 2-produkter, måleværdier (aktiv ilt 3–5 mg/l vs frit klor 1–3 mg/l) og AI-prompten. Klor-doser er placeholdere ("doser følger") indtil guiderne modtages — resten (pH, klar pool, flokning, målinger) virker for begge.
- **Desinfektionsform:** `config.oxygenForm` ("oxychock"/"combitabs"). CombiTabs doseres 1 tablet/3.000 L dagligt.
- **UV-filterlys:** `config.uvLamp`. Reducerer løbende desinfektion (×0,6, vejledende), lægger +2 pumpetimer på, og tilføjer en årlig "Skift UV-pære"-opgave (ny `yearly`-frekvens). Rører ikke pH; mind om at måle.
- **Filtertype:** `config.filterType` (sand/glass/cartridge/balls) styrer returskyl-/rens-opgaven og flokningsmetoden.
- **Katalog + doser kildebekræftet** mod Swim & Funs produktsider/artikler: pH-Minus 150 g/0,2-fald, pH-Plus 100 g/0,2-stigning, Metal Out 0,3–0,5 L, SeaKlear 25 ml/2.000 L (ugentligt), FlokPool 50–100 ml, KlarPool ugentlig **bekræftet** til 0,5 dl/10.000 L. **Rettelse:** opstart er 100 g OxyChock + 100 ml Aktivator pr. 10.000 L (ikke 200 g — de ~200–250 g er chok/problemvand).
- Tjekliste, dosistabel og hurtig-målinger bygges nu dynamisk ud fra config (`buildTasks`/`buildDoseRows`). Ny tjekliste-opgave: klor-chok hver 14. dag (aktiv ilt-pools, varme perioder).
- Datamodel uændret i form: stadig ét JSON-dokument; kun nye `config`-felter (migreres ind ved load med defaults). Ingen ny Python-pakke. Inden for self-directed.
- Verificeret: JSX kompilerer (Babel classic runtime), `/api/health` ok, frontend serveres, gammel state migreres klientside.

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
