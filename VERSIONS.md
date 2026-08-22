# VERSIONS.md

## App-version
**1.8.0** (2026-08-19) — "Spørg" kan slå op på nettet (afgrænset til pool og til udvalgte domæner).
**1.7.0** (2026-08-19) — sæson-guide (nedlukning/opstart), backup-eksport, badge med forfaldne opgaver og egen mængde ved ekstra dosis.
**1.6.1** (2026-06-23) — dagens første plan er gratis (auto-morgenplanen), og kvote-tælleren klæber til toppen i Spørg.
**1.6.0** (2026-06-23) — AI-kvote: 5 chat og 5 planer pr. person pr. dag, med synlig tæller og forberedt tilkøb.
**1.5.0** (2026-06-23) — doseringsrækkefølge efter Swim & Funs trin 1–4, sikkerhedsregel om ikke at blande, og kildebekræftede ventetider.
**1.4.0** (2026-06-23) — PWA (hjemmeskærm) og trendgraf over målinger.
**1.3.0** (2026-06-23) — login (Google + e-mail/kode), roller pr. adresse (admin/editor/user), flere adresser pr. husstand, og lukkede API-endpoints bag login.
**1.2.0** (2026-06-23) — opfølgning på behandlinger (Ja/Nej efter 2 dage), lokale doseringsforslag ud fra målinger, "Skal gøres" grupperet i Dagligt/Ugentligt/Månedligt/Årligt, og delt spørgechat (/api/chat) der kender poolens data.
**1.1.0** (2026-06-23) — dual-system (aktiv ilt/klor), desinfektionsform (OxyChock/CombiTabs), UV-filterlys, filtertype, udvidet + kildebekræftet produktkatalog.
**1.0.0** (2026-06-23) — første scaffold: state-API, vejr- og plan-proxy, standalone frontend, profiler, auto-plan.

## Datamodel (Postgres)
- `pool_state(id, name, data JSONB, updated_at)` — **én række pr. adresse/pool**; `id` er pool-id'et, `data` er husstandens JSON-dokument. Række 1 = den oprindelige pool.
- `users(id, email, name, initials, password_hash, google_sub, created_at)` — login. Koder hashes med `hashlib.pbkdf2_hmac` (stdlib).
- `ai_usage(user_id, day, kind, count)` — AI-forbrug pr. bruger, dag og type (`chat`/`plan`). `users.ai_bonus` = tilkøbte ekstra kald, `users.ai_limit` = personlig grænse.
- `memberships(user_id, pool_id, role)` — rolle **pr. adresse**: `admin` (alt, inkl. brugere og sletning), `editor` (daglig drift, ikke brugere/sletning), `user` (registrere udført arbejde). Alle roller må bruge chat, se plan og log.

## Konfigurationsflag (ét JSON-dokument, `config`)
- `system`: "oxygen" | "chlorine" — styrer trin 2-produkter, måleværdier og AI-prompt.
- `oxygenForm`: "oxychock" | "combitabs" (kun ved system=oxygen).
- `uvLamp`: bool — reducerer løbende desinfektion (×0,6 vejledende), +2 pumpetimer, årlig pæreskift-opgave.
- `filterType`: "sand" | "glass" | "cartridge" | "balls" — styrer returskyl/rens + flokningsmetode.
- `useWaterfall`: bool — pH-overvågning.

## Miljøvariabler (Railway)
| Variabel | Formål |
|---|---|
| `DATABASE_URL` | Postgres (sættes af Railway) |
| `ANTHROPIC_API_KEY` | Plan + chat, kun server-side |
| `SESSION_SECRET` | Signerer session-cookies — **skift = alle logges ud** |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google-login |
| `AI_SEARCH` | `0` slår websøgning i chatten fra. Default til |
| `AI_SEARCH_DOMAINS` | Kommasepareret domæneliste for søgning. Default `swim-fun.com`; tom = frit på nettet |
| `AI_SEARCH_MAX_USES` | Maks. søgninger pr. svar. Default `3` |
| `AI_DAILY_LIMIT` | Antal AI-kald pr. person pr. dag pr. type (chat/plan). Standard `5` |
| `REQUIRE_AUTH` | `1` = login kræves. Fjern variablen for at åbne appen igen (nødbremse) |

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
- PWA: manifest + ikoner; service worker uden caching (kun installerbarhed)

## Doseringsstandarder (Swim & Fun) — kildebekræftet juni 2026
Tal pr. 10.000 liter (undtagen hvor andet er nævnt). Skaleres lineært med poolstørrelse.

| Produkt | Anvendelse | Dosis |
|---|---|---|
| OxyChock + Aktivator | Løbende, hver 3. dag | 40 g + 25 ml (¼ dl) |
| OxyChock | Alternativ, dagligt | 20 g |
| OxyChock + Aktivator | Opstart | 100 g + 100 ml (1 dl) |
| OxyChock | Chok / problemvand | ~200–250 g (følg etiket) |
| CombiTabs (klorfri) | Dagligt | 1 tablet pr. 3.000 L |
| pH-Minus | Sænker pH | 150 g → −0,2 |
| pH-Plus | Hæver pH | 100 g → +0,2 |
| Metal Out | Metaller/kobber | 0,3–0,5 L (hæv pH 7,5–8,0 først, kør 48 t) |
| KlarPool | Startdosis | 100 ml (1 dl) |
| KlarPool | Ugentligt | 50 ml (½ dl) |
| FlokPool | Uklart vand (efter pH-justering) | 50–100 ml |
| SeaKlear | Ugentligt, alle filtre inkl. FilterBalls | 25 ml pr. 2.000 L |

Mål-niveauer: pH **7,0–7,4** (ideelt 7,2); aktiv ilt **3–5 mg/l**; frit klor **1–3 mg/l**; cyanursyre **< 80 ppm**; filtertid **≥ 8 t/dag**.

## Rækkefølge og håndtering (Swim & Funs egen trin-inddeling)
Produkterne er hos Swim & Fun opdelt i fire trin, og **det er rækkefølgen**. Appen viser doserne i samme orden.

| Trin | Produkter |
|---|---|
| 1 · pH-balance | pH-Minus, pH-Plus, Metal Out, teststrimler |
| 2 · Desinfektion | OxyChock, CombiTabs (klor: Klor Starter) |
| 3 · Klar pool | Aktivator, KlarPool |
| 4 · Flokning | FlokPool, SeaKlear |

**Sikkerhedsregel (citeret fra pH-Minus/pH-Plus):** *"Må aldrig blandes med andre kemikalier!"* KlarPool: *"bør ikke blandes med andre kemikalier"*. Hvert produkt opløses i **sin egen** rene plastspand — *"Tilsæt først vand!"* — og fordeles langs bassinkanten mens pumpen kører.

**Dokumenterede ventetider** (kun disse er angivet af producenten):
- **Metal Out:** pH 7,5–8,0 først; hold systemet i gang **mindst 48 timer**; backwash/vask filter derefter og justér pH.
- **FlokPool, sandfilter:** tilsæt ved skimmeren mens pumpen kører → **2–3 dage** → returskyl.
- **FlokPool, papir-/patronfilter:** pumpen slukket → **1–2 dage** bundfældning → rengør bunden → genstart og rens filter.
- **Chokbehandling (grønt/uklart vand):** filtersystemet kører uafbrudt; stadig uklart efter **24 timer** → gentag forfra.
- **KlarPool ved eksisterende belægninger:** chokbehandl med OxyChock/Hurtigklor **inden** KlarPool bruges.

> Der er **ingen** minut-baserede ventetider mellem produkter i Swim & Funs vejledninger — heller ikke mellem OxyChock og Aktivator, som angives i samme dosering. Appen opfinder ingen tal.

App'en holder systemerne adskilt: i aktiv ilt-tilstand vises kun ilt-produkter, i klor-tilstand kun klor — ingen krydsanbefalinger. (Klor og aktiv ilt er teknisk kompatible iflg. Swim & Fun, men appen blander dem ikke.)
Flokning, sandfilter: i skimmeren mens pumpen kører → returskyl efter 2–3 dage. Patronfilter: pumpe slukket, bundfæld 1–2 dage, støvsug. FilterBalls: kun SeaKlear.
UV-faktor (×0,6 på løbende desinfektion) er vejledende — verificér med teststrips.

> Sæson: guiderne "Vinterklargøring af pool" og "Guide til opstart af pool efter vinteren" samt WinterCare-produktsiden (dosering efter vandhårdhed, 400–800 ml pr. 10.000 L).

> Kilde: Swim & Funs produktsider (pH-Minus, pH-Plus, Metal Out, CombiTabs klorfri, Aktivator, KlarPool, FlokPool, SeaKlear, Teststrimler Aktivt Oxygen) og artikler (klor vs. aktiv ilt, pH-værdi, grønt/mælkehvidt/tåget vand), juni 2026. Klor-doser tilføjes når guiderne modtages.
