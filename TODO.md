# TODO.md

## Nu
- [ ] Bekræft delt status mellem to telefoner (deploy + DB er live).
- [ ] Tilføj husstandens profiler (initialer).
- [ ] **Klor-doser:** indtast løbende klor + Klor Starter-chok når guiderne er modtaget (placeholdere står "doser følger" i UI'et og prompten).

## Snart
- [ ] "Sæsonstart"-knap der nulstiller cyklus og sætter opstartsdoser.
- [ ] Lille badge på fanen "I dag" med antal forfaldne opgaver.
- [ ] Eksportér log til CSV (til ReRise BI-vanen).
- [ ] Cyanursyre-måling (klor-system) som tredje hurtig-måling.

## Måske / nice-to-have
- [ ] Push-/mail-påmindelse om morgenen (kræver baggrundsjob — vej op mod "hold det simpelt").
- [ ] PWA-manifest så appen kan lægges på hjemmeskærmen som ikon.
- [ ] Flere produkter (pH-Minus/-Plus mængdeforslag, Flocking Sticks-tilstand).
- [ ] Simpel adgangskode/PIN hvis det offentlige Railway-link skal beskyttes.
- [ ] Ekstra dosis: mulighed for at indtaste egen mængde (i stedet for den faste).
- [ ] Vis dagens ekstra doser som små chips på "I dag"-fanen.
- [ ] Lille trend-graf over pH/aktiv ilt over tid.
- [ ] Påmindelse hvis pH/ilt ikke er målt i X dage.

## Gjort
- [x] Log grupperet per dag (foldbar) + dedup af identiske hændelser + slet enkelt post.
- [x] Tjekliste: "Børst siderne" og "Støvsug bunden" som to opgaver; FilterBalls behandles som sandfilter (backwash + månedlig spuling).
- [x] Dual-system (aktiv ilt / klor) + desinfektionsform (OxyChock granulat / CombiTabs) som valg i Indstillinger.
- [x] UV-filterlys-flag: reducerer løbende desinfektionsdoser (~×0,6), +2 pumpetimer, årlig pæreskift-opgave.
- [x] Filtertype (sand/glas/patron/FilterBalls) styrer returskyl-/rens-opgave; flokning matcher.
- [x] Udvidet produktkatalog + kildebekræftede doser (pH-Minus 150 g/0,2, pH-Plus 100 g/0,2, Metal Out 0,3–0,5 L, SeaKlear 25 ml/2.000 L, CombiTabs 1/3.000 L). KlarPool-uge bekræftet til 0,5 dl/10.000 L. Opstart rettet til 100 g OxyChock.
- [x] Ekstra dosis-registrering under "Dine doser" (+ Givet) — havner i log og medtages i AI-planen.
- [x] Adresse-opslag i Indstillinger (Nominatim) der udfylder koordinater.
- [x] Oprettet privat GitHub-repo og deployet på Railway med Postgres (`/api/health` → `{"ok":true,"db":true}`).
- [x] FastAPI-service: state, vejr-proxy, plan-proxy, static.
- [x] Frontend portet fra artifact til standalone (React via CDN).
- [x] Profiler + initialer.
- [x] Auto-generér plan hver morgen med til/fra i Indstillinger.
