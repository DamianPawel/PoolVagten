# LOG.md

Omvendt kronologisk arbejdslog. Nyeste øverst.

## 2026-08-19 — Sæson-guide, backup, opgave-badge og egen dosismængde
- **Sæson-guide** (Indstillinger → "Sæson"): nedlukning til vinter i 10 trin og opstart om foråret i 5, bygget på Swim & Funs egne guider. Nøgletal fra kilderne: luk først når vandet er **under 10 °C**, pH 7,0–7,4 → chokbehandling → WinterCare → filter ca. **6 timer**, vandstand **15 cm under returslangen**, vinterpude pustet **60–80 %** op, og pumpe/filter/varmepumpe tømmes helt for vand.
- **WinterCare doseres efter vandhårdhed** (400–800 ml pr. 10.000 L). Tabellen vises skaleret til poolens størrelse — for 16.000 L bliver det 640–1.280 ml. Verificeret: 640 ml ved 0–6 °dH.
- Bemærk fra kilderne: WinterCare *"forhindrer ikke isdannelse i poolen! Benyt altid et vintercover."*
- **Varsel på "I dag"** når en frisk vandtemperatur er under 10 °C: tid til at lukke ned.
- **Backup:** nyt `GET /api/pools/{id}/export` (admin/editor) + knap i Indstillinger, der henter hele adressens data som JSON — indstillinger, log, målinger, plan og hvem der har adgang. Ingen koder eller tokens med i eksporten.
- **Badge på "I dag"-fanen** med antal forfaldne opgaver.
- **Ekstra dosis med egen mængde:** "+ Givet" åbner nu et felt, der er forudfyldt med standarddosis, så man kan rette til fx en halv dosis. Loggen — og dermed AI-planens grundlag — bliver derfor sand.
- Ryddet forældede TODO-punkter: profiler og PIN-beskyttelse blev løst med login-systemet.
- Verificeret i browser: badge viser 8 forfaldne, vinter-varsel udløses ved 8 °C, begge sæson-faner viser deres trin, WinterCare skalerer korrekt, og mængdefeltet åbner forudfyldt med "240 g".

## 2026-06-23 — Gratis morgenplan + fastlåst kvote-tæller i chatten
- **Dagens første plan er gratis** (`AI_FREE_PER_DAY = {"plan": 1}`), så den automatiske morgenplan ikke bruger af kvoten. Man har altså 1 gratis + 5 planer og 5 chat-beskeder pr. dag.
- Bevidst valg: det gratis kald gives til dagens **første** plan uanset om den er automatisk eller manuel. Havde vi stolet på et "auto"-flag fra browseren, kunne en klient bare påstå at hvert kald var automatisk.
- `_billable()` trækker de gratis kald fra både i grænsetjekket og i tælleren, så de to altid følges ad.
- **Kvote-tælleren i Spørg klæber nu til toppen** (`position: sticky`), så man altid kan se hvor mange spørgsmål der er tilbage — også midt i en lang samtale. Bjælken går ud i fuld bredde med baggrundsfarve, så beskederne ikke skinner igennem.
- Verificeret i browser ved 375×812: badge'en bliver på y=20 efter 3000 px scroll. (Første måling fejlede, fordi preview-panelet havde `innerHeight: 0` — sticky har intet at klæbe til uden viewport. Test-artefakt, ikke en kodefejl.)

## 2026-06-23 — AI-kvote: 5 chat + 5 planer pr. person pr. dag
Formål: holde token-forbruget nede, med plads til tilkøb senere. Afklaret i pingpong: kvote **pr. person** (ikke pr. husstand), **separate** kvoter for chat og plan, og **synlig tæller** i UI fra start.

- Ny tabel `ai_usage(user_id, day, kind, count)` — én tæller pr. bruger, dag og type. Additiv, som altid.
- `users` fik `ai_bonus` (tilkøbte ekstra kald, klar til senere salg) og `ai_limit` (personlig grænse der overstyrer standarden).
- Standard 5 pr. type pr. dag via `AI_DAILY_LIMIT`. Er dagskvoten brugt, trækkes der automatisk af `ai_bonus`; er den også tom, svarer serveren **429** med en venlig dansk besked.
- Tælling og afvisning sker **før** kaldet til Anthropic, så en afvist forespørgsel ikke koster tokens.
- `consume_ai` kører i en transaktion med `SELECT ... FOR UPDATE`, så to samtidige forespørgsler ikke kan omgå grænsen.
- UI: `QuotaBadge` viser "x af y tilbage i dag" ved både Spørg og Plan, og skifter til "Kvote brugt i dag" i advarselsfarve. Kvoten returneres direkte i svaret fra `/api/plan` og `/api/chat`, så tælleren opdateres uden ekstra kald.
- 429 håndteres pænt: i chatten som en besked i tråden, på Plan-fanen som fejltekst under knappen.
- Bemærk: den automatiske morgenplan bruger én af dagens fem planer (efter ønske om at planer også tælles).
- Nødventil indtil rigtigt tilkøb: `POST /api/pools/{id}/users/{uid}/ai-bonus` (kun admin) lægger ekstra kald til en bruger. Intet UI endnu.
- Verificeret i browser med mockede kvoter: "3 af 5 tilbage i dag" og "Kvote brugt i dag" med korrekt advarselsfarve.

## 2026-06-23 — "Spørg"-chatten: kildegrundlag og emne-afgrænsning
- Chatten stod tidligere kun på poolens egne tal. Nu får den `GUIDE`-konstanten med **Swim & Funs retningslinjer**: trin 1–4-rækkefølgen, håndteringsreglerne ("må aldrig blandes", egen spand, vand først, pumpen kører), de dokumenterede ventetider, og behandlingsforløbene for grønt/mælkehvidt/tåget vand. Plus kildelinks den kan henvise til.
- Læste yderligere artikler til grundlaget: mælkehvidt vand, tåget/uklart vand, viden om klor og aktiv ilt. Alle tre problemløsnings-artikler følger samme forløb: rengør/filter → pH → chok → flokning (24 t) → fjern bundfald.
- **Fakta-regel:** chatten må ikke opfinde doseringstal eller ventetider; er noget ikke dækket, henviser den til etiketten eller swim-fun.com.
- **Emne-afgrænsning håndhæves server-side.** `TOPIC_RULE` i `main.py` sættes altid forrest i system-prompten, uanset hvad browseren sender. Frontend sender poolens data som system-prompt, og den kunne en klient ændre — derfor ligger selve begrænsningen på serveren. Reglen dækker også forsøg på at få den til at ignorere sine instruktioner.
- Note fra kilderne: Swim & Fun skriver at *"Aktiv ilt og Klor er kompatibelt"* og anbefaler klor-chok hver 14. dag til aktiv ilt-pools. Appens UI holder fortsat systemerne adskilt efter brugerens ønske, men chatten kan svare korrekt hvis der spørges direkte.

## 2026-06-23 — Nulstil kræver nu at man skriver SLET
- Nulstil er tre trin: tryk → "Tryk igen for at nulstille log & plan" → popup hvor man skal skrive **SLET**. Knappen i popuppen er deaktiveret indtil teksten er korrekt (accepterer små bogstaver og mellemrum via trim+uppercase). Annullér, Escape og klik udenfor lukker uden at slette.
- Rollegating var allerede på plads i begge lag: UI viser kun knappen for admin/editor (`canEdit`), og serveren afviser en `user` der forsøger at rydde. Tilføjede `plan` til serverens beskyttede felter, så hele nulstillingen er dækket.
- "Hurtige målinger" (og trendgrafen) flyttet op før "Skal gøres" — mål først, så ved man hvad der skal gøres.
- Rettet "~1 dage" → "~1 dag" i ventetids-visningen.
- Verificeret i browser: tom/forkert tekst holder knappen deaktiveret, "SLET" aktiverer den, og Annullér lukker uden at slette.

## 2026-06-23 — Doseringsrækkefølge og håndtering (kildebekræftet)
Ønske: gøre det intuitivt hvad der må gives sammen, og hvad der kræver ventetid. Aftalt i pingpong: **100 % producentens vejledninger, ingen antagelser**.

- **Kilder læst** (Swim & Funs produktsider + artikler, links i VERSIONS): pH-Minus, pH-Plus, Metal Out, CombiTabs, Aktivator, KlarPool, FlokPool, SeaKlear, teststrimler + artikler om grønt/mælkehvidt/tåget vand og pH.
- **Nøglefund:** Swim & Fun har selv opdelt produkterne i **trin 1–4** (pH-balance → desinfektion → klar pool → flokning). Det *er* rækkefølgen, og deres problemløsnings-artikler følger samme forløb. "Dine doser" er nu sorteret og grupperet efter trin, med en kort note pr. trin.
- **Fast sikkerhedsadvarsel** øverst i doser, citeret fra etiketterne: bland aldrig to produkter — ét ad gangen, hver i sin rene plastspand, vand først, pumpen kører.
- **Aktive ventetider** vises på rækken efter en registreret dosis, men **kun de ventetider producenten faktisk angiver**: Metal Out 48 t, FlokPool 2–3 dage (sand) / 1–2 dage (papir/patron), chok 24 t før gentagelse. Vises i dage når der er over et døgn tilbage.
- **Rettet tidligere gætværk:** de oprindelige fremgangsmåde-tekster indeholdt tal jeg ikke havde kilde på ("bad tidligst 15 min efter", "kør pumpen 8–12 timer", "vent et par timer og mål igen"). Alle 13 produkttekster er skrevet om efter producentens ordlyd.
- **Afkræftet antagelse:** der findes ingen 5-minutters regel mellem OxyChock og Aktivator — de angives i samme dosering. Den reelle regel er, at de ikke må blandes i samme spand.
- Verificeret visuelt i browser: trin 1–4 vises i orden, og ventetider beregnes korrekt (Metal Out 1,9 dage / FlokPool 2,6 dage i test).

## 2026-06-23 — PWA (hjemmeskærm) og trendgraf
**PWA:**
- `manifest.webmanifest` + ikoner (192/512 maskable + apple-touch 180) tegnet ud fra appens bølgelogo. PNG'erne er genereret én gang med Pillow lokalt og committet — **ingen runtime-afhængighed**.
- `sw.js` serveres fra **roden** (`/sw.js`), så dens scope dækker hele appen; `/static/sw.js` ville kun dække `/static`.
- Service workeren cacher **bevidst ingenting** og rydder gamle caches. Formålet er alene installerbarhed. Begrundelse: en cachet `index.html` gav os tidligere en blank side, og cachede API-svar ville rode med login og delt status.
- Manifest, sw.js og ikoner ligger uden for login — nødvendigt for at appen kan installeres.

**Trendgraf:**
- Målinger gemmes nu i `state.history` (`{k, v, ts}`, max 400) — adskilt fra loggen, så de ikke forsvinder når den kappes ved 60 poster.
- `historyFromLog()` genskaber historik fra gamle log-poster ("Målte pH: 7,2") ved første load. Testet mod produktions-backuppen: **22 målinger genskabt** (9 pH, 9 ilt, 4 temp), så grafen starter med data.
- Foldbar SVG-graf under Hurtige målinger (intet bibliotek, intet byggetrin): målområde som bånd, skift mellem pH, ilt/klor og vandtemp, y-akse-tal også når der ikke er målområde, og status "Inden for mål".
- Verificeret visuelt i browser med mockede data for alle tre måletyper.

## 2026-06-23 — Login er tændt (REQUIRE_AUTH=1)
- `REQUIRE_AUTH=1` sat i Railway. Verificeret: `state`, `pools`, `weather`, `geocode`, `plan` og `chat` svarer **401** uden login; login-skærm, `/api/auth/me` og `/api/health` er fortsat åbne (nødvendigt for selve login-flowet).
- Anthropic-nøglen er dermed ikke længere tilgængelig for enhver med linket.
- DP (admin) og BUH (editor) er begge logget ind via Google, og yderligere to brugere er tilføjet bevidst — i alt 4 med adgang. `/api/health` viser `orphans: 0`, så ingen sidder fast uden adgang.
- Nødbremse dokumenteret: slet `REQUIRE_AUTH`-variablen, så er appen åben igen inden for et halvt minut, uden datatab.
- Data uændret gennem alle fire etaper: 60 log-poster, 104 checks, 22 chat-beskeder — identisk med backuppen.

## 2026-06-23 — Login etape 3+4/4: adgangskontrol, adresser og brugere
**Etape 3 — adgangskontrol** (deployet, tændes med `REQUIRE_AUTH=1` i Railway):
- `require_role()` på `state`, `weather`, `geocode`, `plan` og `chat`. No-op mens `REQUIRE_AUTH` er slukket, så deployet var risikofrit.
- Rolle-regler håndhæves **server-side**, ikke kun i UI: da hele tilstanden er ét dokument, sammenlignes det indsendte med det gemte. Rollen `user` afvises hvis `config` ændres eller hvis `log`/`checks`/`readings` ryddes.
- **Fanget undervejs:** `apiGetState` returnerede tidligere "tom" ved 401 → appen ville tro poolen var ny og **overskrive husstandens data med et blankt dokument**. Nu returneres `"denied"` eksplicit, og login-skærmen vises i stedet. Denne fejl ville have ramt præcis i det øjeblik låsen blev tændt.
- Sikkerhedsventil: `/api/health` viser `admins` (antal), så vi kunne bevise at der fandtes en admin **før** tænding.

**Etape 4 — adresser og brugere:**
- `get_state`/`put_state` tager nu `pool_id`; `/api/state?pool=N` (default 1, så intet ældre gik i stykker). Aktiv adresse gemmes pr. enhed i `localStorage`.
- `/api/pools`: list, opret (opretteren bliver admin på den nye), slet (kun admin, og aldrig den sidste adresse).
- `/api/pools/{id}/users`: list, giv adgang via e-mail + rolle, skift rolle, fjern adgang. Værn: man kan ikke fjerne sig selv, og der skal altid være mindst én admin tilbage.
- UI: `HouseholdView` i Indstillinger (adresseliste med skift/tilføj/slet + hvem-har-adgang med rollevælger). Log ud med navn, e-mail og rolle.
- Invitation uden e-mail-tjeneste: admin tilføjer en e-mail, og personen får adgang første gang de logger ind med den.

## 2026-06-23 — Login etape 2/4: sessions, e-mail/kode og Google OAuth
- **Ingen ny afhængighed:** kodehash med `hashlib.pbkdf2_hmac` (PBKDF2-SHA256, 240k runder, tilfældigt salt) og HMAC-signeret session-cookie — alt stdlib. Google-flowet kører på `httpx`, som vi allerede havde.
- Cookie: `httponly`, `secure`, `samesite=lax`, 30 dage. Ingen server-side session-state (signeret token).
- Endpoints: `/api/auth/` → `me`, `login`, `logout`, `password`, `google/start`, `google/callback`.
- Google-flow verificerer **state** (CSRF, 10 min levetid), **aud** (skal matche vores client id) og **email_verified**. `id_token` valideres hos Google via tokeninfo, så vi ikke selv skal håndtere JWKS.
- Login-fejl giver samme besked uanset om e-mailen findes → ingen bruger-optælling udefra.
- **Bootstrap uden hemmeligheder i koden:** er `users` tom, bliver den første der logger ind admin på alle eksisterende adresser. Derefter tilføjer admin resten. Ingen e-mails eller koder i repoet.
- Frontend: `LoginView` (Google-knap + e-mail/kode). Appen tjekker login ved opstart og henter initialer fra brugeren.
- **Stadig slukket:** `REQUIRE_AUTH` er ikke sat, så alle endpoints er åbne som før og familien mærker intet. Tændes i etape 3.
- Verificeret live: `auth.google=true`, `auth.ready=true`, `auth.required=false`, `/api/state` → 200, Google-redirect peger korrekt på callback.

## 2026-06-23 — Login etape 1/4: backup + additivt skema
**Eskaleret og godkendt af mennesket** (CLAUDE.md kræver eskalering ved datamodel, hemmeligheder og adgangskontrol). Aftalt i pingpong: Google-login + e-mail/kode, håndkodet (ingen managed auth), roller admin/editor/user pr. adresse, flere adresser pr. husstand, og `/api/state|plan|chat` lukkes bag login i etape 3.

- **Backup taget først:** `backups/pool_state-backup-2026-06-23.json` (22,6 KB — Revninge Bygade, DP+BUH, 60 log-poster, 104 checks). Verificeret fri for hemmeligheder.
- **Nøgleindsigt — ingen data flyttes:** `pool_state.id` bruges som pool-id, så den eksisterende række (id=1) *er* husstandens første adresse. Ingen UPDATE af JSON-dokumentet, ingen kopiering.
- Additivt skema: `pool_state` + kolonnen `name`; nye tabeller `users` (email, navn, initialer, password_hash, google_sub) og `memberships` (user_id + pool_id + rolle). Kun `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` — ingen DROP.
- Første adresse navngives fra sin egen `config.locationName` (kun hvis `name` er NULL).
- `/api/health` returnerer nu tællinger (pools/users/named) så migreringen kan verificeres live uden at lække indhold.
- Ingen UI- eller adfærdsændring i denne etape — appen kører præcis som før.
- Planlagt: auth aktiveres først når `SESSION_SECRET` + `GOOGLE_CLIENT_ID` er sat, så appen aldrig er i stykker undervejs. Password-hashing via `hashlib.pbkdf2_hmac` (stdlib) og Google-flow via `httpx` → **ingen ny afhængighed**.

## 2026-06-23 — Frisk vandtemp fører; luft/vejr udfylder
- Frisk målt vandtemp (≤ `TEMP_FRESH_MS` = 2 dage) styrer nu **pumpetimer** (`pumpHours(vandtemp)`) og **varme-varsel** (vand ≥ 25 °C). Er der ingen frisk måling, bruges luft-forecast som før (luft ≥ 22 °C).
- Varme-varslet er kilde-bevidst: viser målt badevandstemp når den fører, ellers "varmt vejr".
- Fjernede det duplikerede vandtemp-varsel i `measureSuggestions` (håndteres nu ét sted).
- Planen: målt vandtemp medtages kun som "dagens faktiske tilstand" når den er frisk, med besked om at bruge luft-forecast for de kommende dage. Gammel måling ignoreres til styring (står stadig i loggen).
- Baggrund: vandtemp er den fysisk mest korrekte driver for kemiforbrug/omsætning (pumpetimer ≈ vandtemp-regel); luft/vejr er den altid-tilgængelige forudsigelse og dækker fremtiden.

## 2026-06-23 — Badevandstemperatur som hurtig måling
- Ny måling `temp` (°C) i "Hurtige målinger" (fuld bredde under pH/ilt). `READING_UNIT` styrer enhed pr. måling (°C / mg/l).
- Varmt vand (≥25 °C) giver et lokalt varsel på "I dag" (mål oftere, kør pumpen længere, overvej ekstra dosis).
- Målt vandtemp sendes med i chat-konteksten og plan-prompten (varmt vand øger kemiforbrug/algevækst).

## 2026-06-23 — Fjern flueben rydder også loggen + plan ser hvad der er gjort
- `toggleTask` gemmer nu log-postens id på fluebenet (`checks[key].logId`). Fjernes fluebenet, slettes den tilhørende log-post automatisk (ingen manuel oprydning i Log-fanen). Gamle flueben uden logId lader loggen være.
- `generatePlan`: prompten indeholder nu eksplicit "ALLEREDE GJORT I DAG" (dagens flueben) + "SENESTE AKTIVITET" (log, 5 dage) + en regel om ikke at gentage udført arbejde og bygge videre på hvad der faktisk er gjort. Så en ny plan tager højde for afvigelser fra den gamle plan.

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
