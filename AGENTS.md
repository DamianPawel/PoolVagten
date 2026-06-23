# AGENTS.md

Agent-opsætning for dette projekt. Team-størrelse: **LITE** (lille app, én service).

## Team
| Rolle | Ansvar |
|---|---|
| **Lead / Fullstack** | Driver opgaver ende-til-ende: FastAPI-endpoints, datalag, frontend i `index.html`. Træffer de fleste beslutninger selv. |
| **Reviewer** | Læser diffs før merge: tjekker simplicitet, at hemmeligheder ikke lækker, og at doseringstal har kilde. |

I LITE-mode kan begge roller varetages af samme agent i sekvens (byg → selv-review) for små opgaver.

## Eskaleringstilstand: self-directed
Agenten arbejder selvstændigt på alt inden for den eksisterende stak og datamodel. Eskalér til mennesket før:
- skift af stak, hosting eller datamodel
- nye runtime-afhængigheder
- ændringer der rører `ANTHROPIC_API_KEY` eller anden hemmelighed
- ændring af officielle Swim & Fun-doseringstal

## Arbejdsgang
1. Tag én opgave fra `TODO.md`.
2. Byg den mindst mulige løsning.
3. Selv-review mod `CONVENTIONS.md` og `CLAUDE.md`.
4. Kør tjekkene i `TESTING.md`.
5. Notér i `LOG.md`, opdatér `TODO.md` / `VERSIONS.md`.
6. Commit med kort, beskrivende besked (se CONVENTIONS).

## Git-flow
Korte feature-branches → PR mod `main` → merge efter review. `main` er altid deploybar (Railway auto-deployer den).
