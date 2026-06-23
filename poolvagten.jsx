import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Droplets, Waves, Check, Settings, Sparkles, RefreshCw, Beaker,
  CalendarDays, History, AlertTriangle, Gauge, Sun, MapPin, ChevronDown, Home,
} from "lucide-react";

/* ---------- theme: pool water + warm deck ---------- */
const T = {
  bg: "#EAF6F5",
  surface: "#FFFFFF",
  ink: "#0A2E33",
  sub: "#5C7B7E",
  teal: "#0B6E78",
  tealDeep: "#085159",
  aqua: "#26C6BE",
  aquaSoft: "#D7F2EF",
  sand: "#E5D4B3",
  sandDeep: "#C9A86E",
  line: "#D6E8E6",
  ok: "#0E9F6E",
  warn: "#B45309",
  warnBg: "#FDF2D8",
  danger: "#C0392B",
  dangerBg: "#FBE3DF",
  info: "#0B6E78",
  infoBg: "#DCEFF1",
};
const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

/* ---------- defaults ---------- */
const DEFAULT_CONFIG = {
  poolSize: 16000,
  pumpCap: 10000,
  lat: 55.4486,
  lng: 10.6622,
  locationName: "Kerteminde",
  useWaterfall: false,
  autoPlan: true,
  rates: {
    oxyPer10k: 40,      // g / 3 dage
    oxyDailyPer10k: 20, // g / dag (alternativ)
    aktPer10k: 25,      // ml / 3 dage
    klarStartPer10k: 100,
    klarWeeklyPer10k: 50,
    flokMinPer10k: 50,
    flokMaxPer10k: 100,
  },
};

const TASKS = [
  { id: "net", label: "Fjern blade & rens overflade", freq: "daily" },
  { id: "ph", label: "Mål pH (mål: 7,0–7,4)", freq: "daily" },
  { id: "oxy", label: "OxyChock + Aktivator", freq: "every3" },
  { id: "klar", label: "KlarPool (algeforebyggelse)", freq: "weekly" },
  { id: "backwash", label: "Returskyl sandfilter (backwash + rinse)", freq: "weekly" },
  { id: "vacuum", label: "Børst sider & støvsug bund", freq: "weekly" },
];
const FREQ_LABEL = { daily: "Dagligt", every3: "Hver 3. dag", weekly: "Ugentligt" };

const WEEKDAYS = ["Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag"];

/* ---------- pure helpers ---------- */
const pad = (n) => String(n).padStart(2, "0");
const dateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => dateStr(new Date());
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
const r0 = (n) => Math.round(n);

function doses(cfg) {
  const f = cfg.poolSize / 10000;
  const x = cfg.rates;
  return {
    f,
    oxy3: r0(x.oxyPer10k * f),
    oxyDaily: r0(x.oxyDailyPer10k * f),
    akt3: r0(x.aktPer10k * f),
    klarWeekly: r0(x.klarWeeklyPer10k * f),
    klarStart: r0(x.klarStartPer10k * f),
    flokMin: r0(x.flokMinPer10k * f),
    flokMax: r0(x.flokMaxPer10k * f),
    oxyStart: r0(200 * f),
    oxyProblem: r0(250 * f),
    aktStart: r0(100 * f),
  };
}

function pumpHours(tmax) {
  if (tmax == null) return 5;
  if (tmax < 18) return 4;
  if (tmax < 22) return 5;
  if (tmax < 25) return 6;
  if (tmax < 28) return 8;
  return 10;
}

function wx(code) {
  if (code === 0) return { t: "Klart", e: "☀️" };
  if (code === 1 || code === 2) return { t: "Let skyet", e: "🌤️" };
  if (code === 3) return { t: "Overskyet", e: "☁️" };
  if (code === 45 || code === 48) return { t: "Tåge", e: "🌫️" };
  if ([51, 53, 55, 56, 57].includes(code)) return { t: "Støvregn", e: "🌦️" };
  if ([61, 63, 65, 66, 67].includes(code)) return { t: "Regn", e: "🌧️" };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { t: "Sne", e: "❄️" };
  if ([80, 81, 82].includes(code)) return { t: "Byger", e: "🌦️" };
  if ([95, 96, 99].includes(code)) return { t: "Torden", e: "⛈️" };
  return { t: "—", e: "🌡️" };
}

/* most recent completion date for a task id, across all logged checks */
function lastDone(checks, id) {
  let best = null;
  for (const k of Object.keys(checks || {})) {
    if (k.endsWith("::" + id)) {
      const d = k.split("::")[0];
      if (!best || d > best) best = d;
    }
  }
  return best;
}
function isDue(checks, task) {
  const last = lastDone(checks, task.id);
  if (!last) return true;
  const gap = daysBetween(last, today());
  if (task.freq === "daily") return gap >= 1;
  if (task.freq === "every3") return gap >= 3;
  if (task.freq === "weekly") return gap >= 7;
  return true;
}

/* ---------- storage ---------- */
const KEY = "pool:state";
async function loadState() {
  if (!window.storage) return null;
  try {
    const r = await window.storage.get(KEY, true);
    return r ? JSON.parse(r.value) : null;
  } catch {
    return null;
  }
}
async function saveState(s) {
  if (!window.storage) return;
  try {
    await window.storage.set(KEY, JSON.stringify(s), true);
  } catch (e) {
    console.error("save failed", e);
  }
}

/* ===================================================================== */
export default function Poolvagten() {
  const [state, setState] = useState(null);
  const [me, setMe] = useState("");
  const [editMe, setEditMe] = useState(false);
  const [tab, setTab] = useState("home");
  const [weather, setWeather] = useState(null);
  const [wErr, setWErr] = useState(false);
  const [manualWx, setManualWx] = useState("normal");
  const [planLoading, setPlanLoading] = useState(false);
  const [planErr, setPlanErr] = useState(null);
  const [toast, setToast] = useState(null);
  const stateRef = useRef(null);
  stateRef.current = state;
  const autoTriedRef = useRef(false);

  /* boot */
  useEffect(() => {
    (async () => {
      let s = await loadState();
      if (!s) {
        s = { config: DEFAULT_CONFIG, checks: {}, log: [], readings: {}, plan: null, updatedAt: Date.now() };
        await saveState(s);
      }
      if (!s.config.rates) s.config.rates = DEFAULT_CONFIG.rates;
      if (s.config.autoPlan === undefined) s.config.autoPlan = true;
      if (!s.profiles) s.profiles = [];
      setState(s);
      if (window.storage) {
        try {
          const r = await window.storage.get("pool:me", false);
          if (r && r.value) setMe(JSON.parse(r.value));
        } catch {}
      }
    })();
  }, []);

  /* poll shared state so the household stays in sync */
  useEffect(() => {
    const iv = setInterval(async () => {
      const remote = await loadState();
      const cur = stateRef.current;
      if (remote && cur && remote.updatedAt > (cur.updatedAt || 0)) setState(remote);
    }, 20000);
    return () => clearInterval(iv);
  }, []);

  /* weather */
  const cfg = state?.config;
  useEffect(() => {
    if (!cfg) return;
    let dead = false;
    (async () => {
      try {
        const url =
          `https://api.open-meteo.com/v1/forecast?latitude=${cfg.lat}&longitude=${cfg.lng}` +
          `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,uv_index_max` +
          `&timezone=Europe%2FCopenhagen&forecast_days=4`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("weather");
        const data = await res.json();
        if (!dead) { setWeather(data.daily); setWErr(false); }
      } catch {
        if (!dead) setWErr(true);
      }
    })();
    return () => { dead = true; };
  }, [cfg?.lat, cfg?.lng]);

  /* auto-generate plan once per session when enabled and today's plan is missing */
  useEffect(() => {
    if (!state || !cfg || !cfg.autoPlan || autoTriedRef.current || planLoading) return;
    const fresh = state.plan && dateStr(new Date(state.plan.generatedAt)) === today();
    if (fresh) { autoTriedRef.current = true; return; }
    if (!weather && !wErr) return; // wait until weather resolves either way
    autoTriedRef.current = true;
    generatePlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, weather, wErr, planLoading]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  const mutate = useCallback(async (fn) => {
    const cur = stateRef.current;
    const next = { ...fn(cur), updatedAt: Date.now() };
    setState(next);
    await saveState(next);
  }, []);

  const saveMe = async (val) => {
    const v = (val || "").toUpperCase().slice(0, 4).trim();
    setMe(v);
    if (window.storage) { try { await window.storage.set("pool:me", JSON.stringify(v), false); } catch {} }
  };
  const addProfile = (name, initials) => {
    const p = { id: Math.random().toString(36).slice(2), name: (name || "").trim(), initials: (initials || "").toUpperCase().slice(0, 4).trim() };
    if (!p.initials) return;
    mutate((s) => ({ ...s, profiles: [...(s.profiles || []), p] }));
    saveMe(p.initials);
  };
  const removeProfile = (id) =>
    mutate((s) => ({ ...s, profiles: (s.profiles || []).filter((p) => p.id !== id) }));

  const toggleTask = (taskId, label) => {
    if (!me) { showToast("Vælg en profil først"); return; }
    const key = `${today()}::${taskId}`;
    mutate((s) => {
      const checks = { ...s.checks };
      const log = [...(s.log || [])];
      if (checks[key]) {
        delete checks[key];
      } else {
        checks[key] = { initials: me, ts: Date.now() };
        log.unshift({ id: Math.random().toString(36).slice(2), ts: Date.now(), label, initials: me });
      }
      return { ...s, checks, log: log.slice(0, 60) };
    });
  };

  const saveReading = (kind, value) => {
    if (!value) return;
    if (!me) { showToast("Vælg en profil først"); return; }
    mutate((s) => {
      const readings = { ...s.readings, [kind]: { value, ts: Date.now(), initials: me } };
      const log = [
        { id: Math.random().toString(36).slice(2), ts: Date.now(),
          label: `Målte ${kind === "ph" ? "pH" : "aktiv ilt"}: ${value}${kind === "oxy" ? " mg/l" : ""}`,
          initials: me },
        ...(s.log || []),
      ];
      return { ...s, readings, log: log.slice(0, 60) };
    });
    showToast("Måling gemt");
  };

  /* ---------- AI plan ---------- */
  const generatePlan = async () => {
    if (!state) return;
    setPlanErr(null);
    setPlanLoading(true);
    try {
      const d = doses(cfg);
      const lastOxy = lastDone(state.checks, "oxy") || "ukendt";
      let wxLines = "";
      if (weather && weather.time) {
        for (let i = 0; i < weather.time.length; i++) {
          const w = wx(weather.weather_code[i]);
          wxLines += `- ${weather.time[i]} (${WEEKDAYS[new Date(weather.time[i]).getDay()]}): ${Math.round(weather.temperature_2m_max[i])}°C max, ${weather.precipitation_sum[i]} mm nedbør, ${w.t}\n`;
        }
      } else {
        const m = { normal: "under 22°C, tørt", hot: "over 22°C, varmt", rain: "regn" }[manualWx];
        wxLines = `- ${today()}: ${m} (manuelt valgt – ingen live-vejrdata)\n`;
      }

      const prompt =
`Du er en erfaren dansk pool-tekniker. Lav en kort, konkret vedligeholdelsesplan for de næste dage for et KLORFRIT aktiv ilt-system (Swim & Fun OxyChock + Aktivator).

POOL: ${cfg.poolSize} liter. Sandfilterpumpe ${cfg.pumpCap} l/t. Lokation ${cfg.locationName}. Vandfald/dykpumpe i brug: ${cfg.useWaterfall ? "JA" : "nej"}.
FASTE DOSER: OxyChock ${d.oxy3} g + Aktivator ${d.akt3} ml hver 3. dag. KlarPool ${d.klarWeekly} ml ugentligt. Mål: pH 7,0–7,4, aktiv ilt 3–5 mg/l.
SIDST GIVET OXYCHOCK: ${lastOxy}.
VEJRUDSIGT:
${wxLines}
Returnér KUN gyldig JSON, ingen markdown, ingen tekst udenom, præcis dette format:
{"days":[{"date":"YYYY-MM-DD","weekday":"Tirsdag","weather":"24° klart","headline":"kort, maks 6 ord","actions":["punkt med dosis hvor relevant"],"tip":"én kort sætning","alert":"kort advarsel eller null"}]}

REGLER:
- Beregn selv hvilke dage OxyChock+Aktivator skal gives ud fra "sidst givet" + hver 3. dag.
- temp > 22°C: anbefal hyppigere iltmåling, evt. ekstra halv dosis (${d.oxyDaily} g) og flere pumpetimer.
- nedbør > 3 mm: mind om pH-tjek efter regn.
- vandfald JA: mind om at pH stiger, hav pH-Minus klar.
- 1–4 actions pr. dag. Dansk, venligt, kort. Sæt alert til null hvis intet særligt.`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      const plan = { generatedAt: Date.now(), days: parsed.days || [] };
      mutate((s) => ({ ...s, plan }));
    } catch (e) {
      console.error(e);
      setPlanErr("Kunne ikke hente planen lige nu. Prøv igen om lidt.");
    } finally {
      setPlanLoading(false);
    }
  };

  if (!state) {
    return (
      <div style={{ fontFamily: FONT, background: T.bg, minHeight: 420, display: "grid", placeItems: "center", color: T.sub }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Droplets size={20} color={T.teal} /> Indlæser Poolvagten…
        </div>
      </div>
    );
  }

  const d = doses(cfg);
  const tmax = weather?.temperature_2m_max?.[0];
  const precip = weather?.precipitation_sum?.[0];
  const wToday = weather ? wx(weather.weather_code[0]) : null;
  const hot = tmax != null ? tmax >= 22 : manualWx === "hot";
  const rain = precip != null ? precip >= 3 : manualWx === "rain";
  const hours = pumpHours(tmax);

  const alerts = [];
  if (hot) alerts.push({ kind: "warn", icon: Sun, text: "Varmt vejr — alger og bakterier trives. Tjek iltniveau før badning, og overvej en ekstra halv dosis OxyChock i dag." });
  if (rain) alerts.push({ kind: "info", icon: Droplets, text: "Regn i dag — regnvand skubber ofte pH. Tjek pH efter skybruddet." });
  if (cfg.useWaterfall) alerts.push({ kind: "warn", icon: Waves, text: "Vandfald aktivt — luftningen hæver pH. Mål pH ekstra ofte og hav pH-Minus klar." });

  return (
    <div style={{ fontFamily: FONT, background: T.bg, color: T.ink, minHeight: 560 }}>
      <style>{`
        @keyframes wave { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        .pv-wave{ animation: wave 9s linear infinite; }
        .pv-btn:active{ transform: translateY(1px); }
        @media (prefers-reduced-motion: reduce){ .pv-wave{ animation:none } }
        .pv-in{ outline:none; }
        .pv-in:focus{ border-color:${T.aqua}!important; box-shadow:0 0 0 3px ${T.aquaSoft}; }
      `}</style>

      <div style={{ maxWidth: 540, margin: "0 auto", padding: "0 14px 90px" }}>
        {/* header */}
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 2px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: T.teal, display: "grid", placeItems: "center", boxShadow: `0 4px 12px ${T.aquaSoft}` }}>
              <Waves size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: -0.4, lineHeight: 1 }}>Poolvagten</div>
              <div style={{ fontSize: 12, color: T.sub, display: "flex", alignItems: "center", gap: 3, marginTop: 3 }}>
                <MapPin size={11} /> {cfg.locationName}
              </div>
            </div>
          </div>
          {/* profile picker */}
          <ProfilePicker profiles={state.profiles || []} me={me}
            onSelect={saveMe} onAdd={addProfile} onRemove={removeProfile} />
        </header>

        {tab === "home" && (
          <>
            {/* hero water card */}
            <section style={{ ...card, padding: 0, overflow: "hidden", position: "relative", background: T.tealDeep }}>
              <div style={{ padding: "16px 18px 26px", color: "#fff", position: "relative", zIndex: 2 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ ...eyebrow, color: T.aqua }}>I dag · {WEEKDAYS[new Date().getDay()]}</div>
                    <div style={{ fontSize: 15, opacity: 0.9, marginTop: 2 }}>
                      {wToday ? `${wToday.e} ${wToday.t}` : "Vejr ikke hentet"}
                      {tmax != null && <span style={{ fontWeight: 700 }}>{" · "}{Math.round(tmax)}°</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ ...eyebrow, color: T.aqua }}>Pumpetid</div>
                    <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, letterSpacing: -1 }}>{hours}<span style={{ fontSize: 14, fontWeight: 600 }}> t</span></div>
                  </div>
                </div>
                {wErr && (
                  <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {[["normal", "Normalt"], ["hot", "Varmt >22°"], ["rain", "Regn"]].map(([v, l]) => (
                      <button key={v} className="pv-btn" onClick={() => setManualWx(v)}
                        style={{ ...miniPill, background: manualWx === v ? T.aqua : "rgba(255,255,255,.14)", color: manualWx === v ? T.ink : "#fff" }}>{l}</button>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ position: "absolute", bottom: -2, left: 0, right: 0, height: 46, zIndex: 1, opacity: 0.5 }}>
                <svg className="pv-wave" viewBox="0 0 1200 60" preserveAspectRatio="none" style={{ width: "200%", height: "100%" }}>
                  <path d="M0,30 C150,55 300,5 600,30 C900,55 1050,5 1200,30 L1200,60 L0,60 Z" fill={T.aqua} />
                </svg>
              </div>
            </section>

            {/* alerts */}
            {alerts.map((a, i) => (
              <Alert key={i} kind={a.kind} icon={a.icon} text={a.text} />
            ))}

            {/* today tasks */}
            <SectionTitle icon={Check} title="Skal gøres" />
            <section style={{ ...card, padding: 8 }}>
              {TASKS.map((task) => {
                const done = !!state.checks[`${today()}::${task.id}`];
                const due = isDue(state.checks, task);
                const last = lastDone(state.checks, task.id);
                let dose = null;
                if (task.id === "oxy") dose = `${d.oxy3} g OxyChock + ${d.akt3} ml Aktivator`;
                if (task.id === "klar") dose = `${d.klarWeekly} ml KlarPool`;
                return (
                  <TaskRow key={task.id} task={task} done={done} due={due} dose={dose} last={last}
                    stamp={done ? state.checks[`${today()}::${task.id}`] : null}
                    onToggle={() => toggleTask(task.id, task.label)} />
                );
              })}
            </section>

            {/* readings */}
            <SectionTitle icon={Beaker} title="Hurtige målinger" />
            <section style={{ ...card, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Reading label="pH" hint="7,0 – 7,4" placeholder="7,2" last={state.readings?.ph} onSave={(v) => saveReading("ph", v)} />
              <Reading label="Aktiv ilt" hint="3 – 5 mg/l" placeholder="4" last={state.readings?.oxy} onSave={(v) => saveReading("oxy", v)} />
            </section>

            {/* doses */}
            <SectionTitle icon={Gauge} title={`Dine doser · ${cfg.poolSize.toLocaleString("da-DK")} L`} />
            <section style={{ ...card, padding: 0, overflow: "hidden" }}>
              <DoseRow a="OxyChock + Aktivator" b="Hver 3. dag" c={`${d.oxy3} g + ${d.akt3} ml`} />
              <DoseRow a="OxyChock (alt. dagligt)" b="Dagligt" c={`${d.oxyDaily} g`} />
              <DoseRow a="KlarPool" b="Ugentligt" c={`${d.klarWeekly} ml`} />
              <DoseRow a="FlokPool (uklart vand)" b="Efter behov" c={`${d.flokMin}–${d.flokMax} ml`} />
              <DoseRow a="OxyChock chok (grønt vand)" b="Efter behov" c={`${d.oxyProblem} g`} />
              <DoseRow a="Sæsonstart" b="Opstart" c={`${d.oxyStart} g + ${d.aktStart} ml`} last />
            </section>
            <p style={{ fontSize: 11.5, color: T.sub, margin: "10px 4px 0", lineHeight: 1.5 }}>
              Opløs altid OxyChock i en spand vand først og hæld langs kanten. Justér pH før flokning. Brug dunkens låg som målebæger.
            </p>
          </>
        )}

        {tab === "plan" && (
          <PlanView state={state} planLoading={planLoading} planErr={planErr} onGenerate={generatePlan} />
        )}

        {tab === "log" && <LogView log={state.log || []} />}

        {tab === "settings" && (
          <SettingsView cfg={cfg} onSave={(c) => mutate((s) => ({ ...s, config: c }))} showToast={showToast}
            onReset={() => mutate(() => ({ config: DEFAULT_CONFIG, checks: {}, log: [], readings: {}, plan: null }))} />
        )}
      </div>

      {/* bottom nav */}
      <nav style={navBar}>
        {[
          ["home", Home, "I dag"],
          ["plan", Sparkles, "Plan"],
          ["log", History, "Log"],
          ["settings", Settings, "Indstil."],
        ].map(([id, Icon, label]) => (
          <button key={id} className="pv-btn" onClick={() => setTab(id)}
            style={{ ...navItem, color: tab === id ? T.teal : T.sub }}>
            <Icon size={20} strokeWidth={tab === id ? 2.6 : 2} />
            <span style={{ fontSize: 11, fontWeight: tab === id ? 700 : 500 }}>{label}</span>
          </button>
        ))}
      </nav>

      {toast && (
        <div style={{ position: "fixed", bottom: 78, left: "50%", transform: "translateX(-50%)", background: T.ink, color: "#fff", padding: "9px 16px", borderRadius: 999, fontSize: 13, fontWeight: 600, zIndex: 50, boxShadow: "0 8px 24px rgba(0,0,0,.2)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}

/* ===================== sub-components ===================== */

function InitialsEditor({ initial, onSave, onCancel }) {
  const [v, setV] = useState(initial || "");
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <input className="pv-in" autoFocus value={v} maxLength={4}
        onChange={(e) => setV(e.target.value.toUpperCase())}
        onKeyDown={(e) => { if (e.key === "Enter") onSave(v); if (e.key === "Escape") onCancel(); }}
        placeholder="fx DK"
        style={{ width: 64, padding: "7px 9px", border: `1.5px solid ${T.line}`, borderRadius: 9, fontSize: 14, fontWeight: 700, textAlign: "center", fontFamily: FONT }} />
      <button className="pv-btn" onClick={() => onSave(v)} style={{ ...chip, background: T.teal, color: "#fff", borderColor: T.teal, padding: "7px 11px" }}>OK</button>
    </div>
  );
}

function ProfilePicker({ profiles, me, onSelect, onAdd, onRemove }) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [ini, setIni] = useState("");
  const cur = profiles.find((p) => p.initials === me);
  return (
    <div style={{ position: "relative" }}>
      <button className="pv-btn" onClick={() => setOpen((o) => !o)}
        style={{ ...chip, background: me ? T.teal : T.surface, color: me ? "#fff" : T.sub, borderColor: me ? T.teal : T.line, display: "flex", alignItems: "center", gap: 6 }}>
        {me ? (cur ? cur.initials : me) : "Vælg profil"}
        <ChevronDown size={14} />
      </button>
      {open && (
        <>
          <div onClick={() => { setOpen(false); setAdding(false); }} style={{ position: "fixed", inset: 0, zIndex: 30 }} />
          <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: T.surface, border: `1px solid ${T.line}`, borderRadius: 12, boxShadow: "0 12px 32px rgba(10,46,51,.16)", padding: 6, minWidth: 200, zIndex: 31 }}>
            {profiles.length === 0 && !adding && (
              <div style={{ fontSize: 12.5, color: T.sub, padding: "8px 10px" }}>Ingen profiler endnu</div>
            )}
            {profiles.map((p) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 9, background: p.initials === me ? T.aquaSoft : "transparent" }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: T.teal, color: "#fff", display: "grid", placeItems: "center", fontSize: 11.5, fontWeight: 800, flexShrink: 0 }}>{p.initials}</div>
                <button className="pv-btn" onClick={() => { onSelect(p.initials); setOpen(false); }}
                  style={{ flex: 1, textAlign: "left", background: "none", border: "none", cursor: "pointer", fontFamily: FONT, fontSize: 13.5, fontWeight: 600, color: T.ink, minWidth: 0 }}>{p.name || p.initials}</button>
                <button className="pv-btn" onClick={() => onRemove(p.id)} title="Fjern"
                  style={{ background: "none", border: "none", cursor: "pointer", color: T.sub, fontSize: 18, lineHeight: 1, padding: "0 5px" }}>×</button>
              </div>
            ))}
            {adding ? (
              <div style={{ padding: "8px 6px 4px", borderTop: profiles.length ? `1px solid ${T.line}` : "none", marginTop: profiles.length ? 4 : 0 }}>
                <input className="pv-in" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Navn (fx Mor)"
                  style={{ width: "100%", boxSizing: "border-box", padding: "8px 9px", border: `1.5px solid ${T.line}`, borderRadius: 8, fontSize: 13.5, fontFamily: FONT, marginBottom: 6 }} />
                <div style={{ display: "flex", gap: 6 }}>
                  <input className="pv-in" value={ini} maxLength={4} onChange={(e) => setIni(e.target.value.toUpperCase())} placeholder="DK"
                    style={{ width: 58, boxSizing: "border-box", padding: "8px 9px", border: `1.5px solid ${T.line}`, borderRadius: 8, fontSize: 13.5, fontWeight: 700, textAlign: "center", fontFamily: FONT }} />
                  <button className="pv-btn" onClick={() => { if (ini.trim()) { onAdd(name, ini); setName(""); setIni(""); setAdding(false); setOpen(false); } }}
                    style={{ flex: 1, background: T.teal, color: "#fff", border: "none", borderRadius: 8, padding: "8px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: FONT }}>Tilføj</button>
                </div>
              </div>
            ) : (
              <button className="pv-btn" onClick={() => setAdding(true)}
                style={{ width: "100%", textAlign: "left", background: "none", border: "none", borderTop: profiles.length ? `1px solid ${T.line}` : "none", marginTop: profiles.length ? 4 : 0, padding: "9px 10px", cursor: "pointer", fontFamily: FONT, fontSize: 13, fontWeight: 700, color: T.teal }}>+ Tilføj profil</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function SectionTitle({ icon: Icon, title }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, margin: "20px 4px 9px" }}>
      <Icon size={15} color={T.teal} />
      <span style={{ ...eyebrow, color: T.teal }}>{title}</span>
    </div>
  );
}

function Alert({ kind, icon: Icon, text }) {
  const map = { warn: [T.warnBg, T.warn], info: [T.infoBg, T.info], danger: [T.dangerBg, T.danger] };
  const [bg, fg] = map[kind] || map.info;
  return (
    <div style={{ ...card, background: bg, display: "flex", gap: 10, padding: "12px 14px", marginTop: 10, border: "none" }}>
      <Icon size={18} color={fg} style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ fontSize: 13, color: fg, lineHeight: 1.45, fontWeight: 500 }}>{text}</div>
    </div>
  );
}

function TaskRow({ task, done, due, dose, last, stamp, onToggle }) {
  return (
    <button className="pv-btn" onClick={onToggle}
      style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 10px", background: "none", border: "none", borderRadius: 12, cursor: "pointer", textAlign: "left", fontFamily: FONT }}>
      <span style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, display: "grid", placeItems: "center",
        background: done ? T.ok : "transparent", border: done ? "none" : `2px solid ${due ? T.aqua : T.line}` }}>
        {done && <Check size={16} color="#fff" strokeWidth={3} />}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14.5, fontWeight: 600, color: done ? T.sub : T.ink, textDecoration: done ? "line-through" : "none" }}>{task.label}</span>
          {!done && due && <span style={badge}>Nu</span>}
        </span>
        <span style={{ fontSize: 12, color: T.sub, display: "block", marginTop: 2 }}>
          {dose ? dose + " · " : ""}{FREQ_LABEL[task.freq]}
          {stamp ? ` · ✓ ${stamp.initials}` : last && !done ? ` · sidst ${last}` : ""}
        </span>
      </span>
    </button>
  );
}

function Reading({ label, hint, placeholder, last, onSave }) {
  const [v, setV] = useState("");
  return (
    <div style={{ background: T.aquaSoft, borderRadius: 12, padding: "11px 12px" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.tealDeep }}>{label}</div>
      <div style={{ fontSize: 11, color: T.teal, marginBottom: 8 }}>{hint}</div>
      <div style={{ display: "flex", gap: 6 }}>
        <input className="pv-in" value={v} placeholder={placeholder} inputMode="decimal"
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { onSave(v); setV(""); } }}
          style={{ width: "100%", minWidth: 0, padding: "7px 9px", border: `1.5px solid #fff`, borderRadius: 8, fontSize: 14, fontFamily: FONT, background: "#fff" }} />
        <button className="pv-btn" onClick={() => { onSave(v); setV(""); }}
          style={{ background: T.teal, color: "#fff", border: "none", borderRadius: 8, padding: "0 12px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: FONT }}>Gem</button>
      </div>
      {last && (
        <div style={{ fontSize: 11, color: T.teal, marginTop: 7 }}>
          Sidst: <b>{last.value}</b> · {last.initials} · {timeAgo(last.ts)}
        </div>
      )}
    </div>
  );
}

function DoseRow({ a, b, c, last }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: last ? "none" : `1px solid ${T.line}` }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{a}</div>
        <div style={{ fontSize: 11.5, color: T.sub }}>{b}</div>
      </div>
      <div style={{ fontSize: 14, fontWeight: 800, color: T.teal }}>{c}</div>
    </div>
  );
}

function PlanView({ state, planLoading, planErr, onGenerate }) {
  const plan = state.plan;
  return (
    <>
      <SectionTitle icon={Sparkles} title="Plan for de næste dage" />
      <section style={{ ...card, textAlign: "center", padding: "16px 16px 18px" }}>
        <p style={{ fontSize: 13, color: T.sub, margin: "0 0 14px", lineHeight: 1.5 }}>
          Claude lægger en plan ud fra vejrudsigten, dine doser og hvornår du sidst gav OxyChock. Den opdaterer automatisk hver morgen — eller tryk her.
        </p>
        <button className="pv-btn" onClick={onGenerate} disabled={planLoading}
          style={{ background: T.teal, color: "#fff", border: "none", borderRadius: 11, padding: "11px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, fontFamily: FONT, opacity: planLoading ? 0.7 : 1 }}>
          {planLoading ? <RefreshCw size={16} className="pv-wave" /> : <Sparkles size={16} />}
          {planLoading ? "Lægger plan…" : plan ? "Opdatér plan" : "Generér plan"}
        </button>
        {plan && <div style={{ fontSize: 11, color: T.sub, marginTop: 10 }}>Senest opdateret {timeAgo(plan.generatedAt)}</div>}
        {planErr && <div style={{ fontSize: 12.5, color: T.danger, marginTop: 12 }}>{planErr}</div>}
      </section>

      {plan?.days?.map((day, i) => (
        <section key={i} style={{ ...card, padding: "14px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>{day.weekday}</div>
            <div style={{ fontSize: 12.5, color: T.sub }}>{day.weather}</div>
          </div>
          {day.headline && <div style={{ fontSize: 13.5, fontWeight: 600, color: T.teal, margin: "4px 0 8px" }}>{day.headline}</div>}
          {day.alert && (
            <div style={{ background: T.warnBg, color: T.warn, fontSize: 12.5, padding: "8px 10px", borderRadius: 9, marginBottom: 8, display: "flex", gap: 7 }}>
              <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} /> {day.alert}
            </div>
          )}
          <ul style={{ margin: "0 0 8px", paddingLeft: 18 }}>
            {(day.actions || []).map((a, j) => (
              <li key={j} style={{ fontSize: 13.5, lineHeight: 1.55, marginBottom: 3 }}>{a}</li>
            ))}
          </ul>
          {day.tip && <div style={{ fontSize: 12.5, color: T.sub, fontStyle: "italic" }}>💡 {day.tip}</div>}
        </section>
      ))}
    </>
  );
}

function LogView({ log }) {
  return (
    <>
      <SectionTitle icon={History} title="Hvem gjorde hvad" />
      {log.length === 0 ? (
        <section style={{ ...card, textAlign: "center", color: T.sub, fontSize: 13.5, padding: 28 }}>
          Ingen aktivitet endnu. Sæt flueben på "I dag", så dukker det op her — med initialer, så hele husstanden kan følge med.
        </section>
      ) : (
        <section style={{ ...card, padding: 4 }}>
          {log.map((e) => (
            <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", borderBottom: `1px solid ${T.line}` }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: T.aquaSoft, color: T.tealDeep, display: "grid", placeItems: "center", fontSize: 12.5, fontWeight: 800, flexShrink: 0 }}>{e.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{e.label}</div>
                <div style={{ fontSize: 11.5, color: T.sub }}>{fullTime(e.ts)}</div>
              </div>
            </div>
          ))}
        </section>
      )}
    </>
  );
}

function SettingsView({ cfg, onSave, onReset, showToast }) {
  const [f, setF] = useState(cfg);
  const [advanced, setAdvanced] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const setRate = (k, v) => setF((s) => ({ ...s, rates: { ...s.rates, [k]: parseFloat(v) || 0 } }));
  const save = () => { onSave(f); showToast("Gemt"); };

  return (
    <>
      <SectionTitle icon={Settings} title="Indstillinger" />
      <section style={{ ...card }}>
        <Field label="Poolstørrelse (liter)"><NumIn value={f.poolSize} onChange={(v) => set("poolSize", parseInt(v) || 0)} /></Field>
        <Field label="Pumpekapacitet (liter/time)"><NumIn value={f.pumpCap} onChange={(v) => set("pumpCap", parseInt(v) || 0)} /></Field>
        <Field label="Lokation (navn)"><TxtIn value={f.locationName} onChange={(v) => set("locationName", v)} /></Field>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Breddegrad"><NumIn value={f.lat} step="0.0001" onChange={(v) => set("lat", parseFloat(v) || 0)} /></Field>
          <Field label="Længdegrad"><NumIn value={f.lng} step="0.0001" onChange={(v) => set("lng", parseFloat(v) || 0)} /></Field>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 2px", cursor: "pointer" }}>
          <input type="checkbox" checked={f.useWaterfall} onChange={(e) => set("useWaterfall", e.target.checked)}
            style={{ width: 18, height: 18, accentColor: T.teal }} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Jeg bruger vandfald / dykpumpe</span>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 2px", cursor: "pointer", borderTop: `1px solid ${T.line}` }}>
          <input type="checkbox" checked={f.autoPlan !== false} onChange={(e) => set("autoPlan", e.target.checked)}
            style={{ width: 18, height: 18, accentColor: T.teal }} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Generér plan automatisk hver morgen</span>
        </label>
      </section>

      <button className="pv-btn" onClick={() => setAdvanced((a) => !a)}
        style={{ ...card, width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", fontFamily: FONT, fontSize: 13.5, fontWeight: 600, color: T.ink, marginTop: 12 }}>
        Avanceret: doseringssatser (pr. 10.000 L)
        <ChevronDown size={18} style={{ transform: advanced ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
      </button>
      {advanced && (
        <section style={{ ...card, marginTop: 8 }}>
          <Field label="OxyChock g / 3 dage"><NumIn value={f.rates.oxyPer10k} onChange={(v) => setRate("oxyPer10k", v)} /></Field>
          <Field label="OxyChock g / dag (alt.)"><NumIn value={f.rates.oxyDailyPer10k} onChange={(v) => setRate("oxyDailyPer10k", v)} /></Field>
          <Field label="Aktivator ml / 3 dage"><NumIn value={f.rates.aktPer10k} onChange={(v) => setRate("aktPer10k", v)} /></Field>
          <Field label="KlarPool ml / uge"><NumIn value={f.rates.klarWeeklyPer10k} onChange={(v) => setRate("klarWeeklyPer10k", v)} /></Field>
          <p style={{ fontSize: 11.5, color: T.sub, margin: "6px 2px 0", lineHeight: 1.5 }}>
            Standardtallene følger Swim & Funs vejledning. Justér kun hvis din etikette siger noget andet.
          </p>
        </section>
      )}

      <button className="pv-btn" onClick={save}
        style={{ width: "100%", background: T.teal, color: "#fff", border: "none", borderRadius: 12, padding: "13px", fontWeight: 800, fontSize: 15, cursor: "pointer", marginTop: 14, fontFamily: FONT }}>
        Gem indstillinger
      </button>
      <button className="pv-btn"
        onClick={() => { if (confirmReset) { onReset(); setConfirmReset(false); showToast("Nulstillet"); } else { setConfirmReset(true); setTimeout(() => setConfirmReset(false), 4000); } }}
        style={{ width: "100%", background: confirmReset ? T.danger : "none", color: confirmReset ? "#fff" : T.danger, border: `1.5px solid ${confirmReset ? T.danger : T.dangerBg}`, borderRadius: 12, padding: "11px", fontWeight: 600, fontSize: 13.5, cursor: "pointer", marginTop: 10, fontFamily: FONT }}>
        {confirmReset ? "Tryk igen for at nulstille alt" : "Nulstil app"}
      </button>
    </>
  );
}

/* small form atoms */
const Field = ({ label, children }) => (
  <div style={{ marginBottom: 12, flex: 1 }}>
    <div style={{ fontSize: 12, fontWeight: 600, color: T.sub, marginBottom: 5 }}>{label}</div>
    {children}
  </div>
);
const NumIn = ({ value, onChange, step }) => (
  <input className="pv-in" type="number" value={value} step={step} onChange={(e) => onChange(e.target.value)}
    style={inStyle} />
);
const TxtIn = ({ value, onChange }) => (
  <input className="pv-in" value={value} onChange={(e) => onChange(e.target.value)} style={inStyle} />
);

/* time format */
function timeAgo(ts) {
  if (!ts) return "";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "lige nu";
  if (s < 3600) return `${Math.floor(s / 60)} min siden`;
  if (s < 86400) return `${Math.floor(s / 3600)} t siden`;
  return `${Math.floor(s / 86400)} d siden`;
}
function fullTime(ts) {
  const d = new Date(ts);
  const sameDay = dateStr(d) === today();
  const t = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return sameDay ? `I dag ${t}` : `${WEEKDAYS[d.getDay()]} ${pad(d.getDate())}/${pad(d.getMonth() + 1)} · ${t}`;
}

/* shared styles */
const card = { background: T.surface, borderRadius: 16, padding: 14, marginTop: 12, border: `1px solid ${T.line}`, boxShadow: "0 1px 2px rgba(10,46,51,.04)" };
const eyebrow = { fontSize: 11, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase" };
const chip = { border: "1.5px solid", borderRadius: 999, padding: "8px 13px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT };
const miniPill = { border: "none", borderRadius: 999, padding: "5px 11px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT };
const badge = { background: T.aqua, color: T.ink, fontSize: 10.5, fontWeight: 800, padding: "2px 7px", borderRadius: 999, letterSpacing: 0.3 };
const inStyle = { width: "100%", boxSizing: "border-box", padding: "10px 11px", border: `1.5px solid ${T.line}`, borderRadius: 10, fontSize: 14.5, fontFamily: FONT, background: "#fff", color: T.ink };
const navBar = { position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(255,255,255,.92)", backdropFilter: "blur(10px)", borderTop: `1px solid ${T.line}`, display: "flex", justifyContent: "space-around", padding: "8px 0 10px", zIndex: 40 };
const navItem = { background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer", padding: "4px 16px", fontFamily: FONT };
