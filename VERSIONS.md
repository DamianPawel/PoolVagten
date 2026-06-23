# VERSIONS.md

## App-version
**1.1.0** (2026-06-23) — dual-system (aktiv ilt/klor), desinfektionsform (OxyChock/CombiTabs), UV-filterlys, filtertype, udvidet + kildebekræftet produktkatalog.
**1.0.0** (2026-06-23) — første scaffold: state-API, vejr- og plan-proxy, standalone frontend, profiler, auto-plan.

## Konfigurationsflag (ét JSON-dokument, `config`)
- `system`: "oxygen" | "chlorine" — styrer trin 2-produkter, måleværdier og AI-prompt.
- `oxygenForm`: "oxychock" | "combitabs" (kun ved system=oxygen).
- `uvLamp`: bool — reducerer løbende desinfektion (×0,6 vejledende), +2 pumpetimer, årlig pæreskift-opgave.
- `filterType`: "sand" | "glass" | "cartridge" | "balls" — styrer returskyl/rens + flokningsmetode.
- `useWaterfall`: bool — pH-overvågning.

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

App'en holder systemerne adskilt: i aktiv ilt-tilstand vises kun ilt-produkter, i klor-tilstand kun klor — ingen krydsanbefalinger. (Klor og aktiv ilt er teknisk kompatible iflg. Swim & Fun, men appen blander dem ikke.)
Flokning, sandfilter: i skimmeren mens pumpen kører → returskyl efter 2–3 dage. Patronfilter: pumpe slukket, bundfæld 1–2 dage, støvsug. FilterBalls: kun SeaKlear.
UV-faktor (×0,6 på løbende desinfektion) er vejledende — verificér med teststrips.

> Kilde: Swim & Funs produktsider (pH-Minus, pH-Plus, Metal Out, CombiTabs klorfri, Aktivator, KlarPool, FlokPool, SeaKlear, Teststrimler Aktivt Oxygen) og artikler (klor vs. aktiv ilt, pH-værdi, grønt/mælkehvidt/tåget vand), juni 2026. Klor-doser tilføjes når guiderne modtages.
