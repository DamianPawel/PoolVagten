# TODO.md

## Nu
- [ ] Bekræft delt status mellem to telefoner (deploy + DB er live).
- [ ] Tilføj husstandens profiler (initialer).
- [ ] Bekræft KlarPool ugentlig dosis mod dunkens etikette; ret `klarWeeklyPer10k` hvis nødvendigt.

## Snart
- [ ] "Sæsonstart"-knap der nulstiller cyklus og sætter opstartsdoser.
- [ ] Lille badge på fanen "I dag" med antal forfaldne opgaver.
- [ ] Eksportér log til CSV (til ReRise BI-vanen).

## Måske / nice-to-have
- [ ] Push-/mail-påmindelse om morgenen (kræver baggrundsjob — vej op mod "hold det simpelt").
- [ ] PWA-manifest så appen kan lægges på hjemmeskærmen som ikon.
- [ ] Flere produkter (pH-Minus/-Plus mængdeforslag, Flocking Sticks-tilstand).
- [ ] Simpel adgangskode/PIN hvis det offentlige Railway-link skal beskyttes.

## Gjort
- [x] Oprettet privat GitHub-repo og deployet på Railway med Postgres (`/api/health` → `{"ok":true,"db":true}`).
- [x] FastAPI-service: state, vejr-proxy, plan-proxy, static.
- [x] Frontend portet fra artifact til standalone (React via CDN).
- [x] Profiler + initialer.
- [x] Auto-generér plan hver morgen med til/fra i Indstillinger.
