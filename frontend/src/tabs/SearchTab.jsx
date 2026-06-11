import { useState, useEffect } from "react";
import { GROQ_URL, GROQ_MODEL, groqError, warm } from "../config";

const Arrow = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

const STEPS = [
  { id: "qualification", num: "01", q: "Where are you at right now?", hint: "Your current highest qualification", type: "opts",
    opts: ["Matric (Grade 10)", "Intermediate / A-Levels", "Bachelor's Degree", "Master's Degree", "MPhil / MS Research", "PhD"] },
  { id: "degree", num: "02", q: "What are you trying to get into?", hint: "The degree you want to pursue", type: "opts",
    opts: ["Bachelor's (BS/BA)", "Master's (MS/MBA)", "PhD / Doctorate", "Postdoc", "Short course / Certificate", "Not decided yet"] },
  { id: "field", num: "03", q: "What do you want to study?", hint: "Be specific — better results that way", type: "text",
    placeholder: "e.g. AI, Public Health, Architecture..." },
  { id: "country", num: "04", q: "Any country in mind?", hint: "Or keep it open", type: "opts",
    opts: ["Open to anywhere", "Germany", "United Kingdom", "USA", "Canada", "Australia", "China", "Turkey", "Netherlands", "South Korea", "Japan", "Other"] },
  { id: "funding", num: "05", q: "What kind of funding?", hint: "Be honest — better matches this way", type: "opts",
    opts: ["Fully funded — cover everything", "Partial is fine", "Tuition waiver only", "Monthly stipend only", "Anything helps"] },
];

const buildPrompt = (ans) => `
You are an expert international scholarship advisor specializing in helping Pakistani students find scholarships abroad.

Student profile:
- Current qualification: ${ans.qualification}
- Degree to pursue: ${ans.degree}
- Field of study: ${ans.field}
- Preferred country: ${ans.country === "Other" ? ans.countryOther : ans.country}
- Funding preference: ${ans.funding}

Your task: Find 10 REAL scholarships that are DIRECTLY relevant to "${ans.field}".

STRICT RULES:
1. Every scholarship must be relevant to the field "${ans.field}" — either field-specific or STEM/technology if field is technical
2. Do NOT return generic scholarships unrelated to the field (e.g. do not return arts scholarships for a CS student)
3. Scholarships MUST be available for studying in ${ans.country === "Other" ? ans.countryOther : ans.country} — do not return country-specific scholarships from other countries (e.g. do not return DAAD for Netherlands)
4. All scholarships must be REAL and currently active — no made-up names
5. Acceptance chance must be realistic for a Pakistani student (most will be 15-50% range)
6. If the field is niche (like "${ans.field}"), include broader related fields (e.g. Computer Science, Software Engineering, AI) but flag them

Return ONLY raw JSON, no markdown, no explanation:
{"topPickId":number,"topPickReason":"string","scholarships":[{"id":number,"name":"string","hostCountry":"string","fundingType":"Full Funded"|"Partial"|"Tuition Only"|"Stipend","deadline":"string","eligibility":"string","requiredDocuments":["string"],"officialLink":"string","whyGoodFit":"string","mainChallenge":"string","acceptanceChance":number}]}`;

const cc = (n) => n >= 75 ? "#16a34a" : n >= 50 ? "#b45309" : "#dc2626";
const cl = (n) => n >= 75 ? "High chance" : n >= 50 ? "Moderate" : "Competitive";
const ccBg = (n) => n >= 75 ? "#f0fdf4" : n >= 50 ? "#fffbeb" : "#fef2f2";
const fundStyle = (t) => ({
  "Full Funded":  { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  "Partial":      { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
  "Tuition Only": { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  "Stipend":      { bg: "#fdf4ff", color: "#7e22ce", border: "#e9d5ff" },
}[t] || { bg: "#f5f5f4", color: "#57534e", border: "#e7e5e4" });

export default function SearchTab() {
  const [cur, setCur] = useState(0);
  const [ans, setAns] = useState({});
  const [screen, setScreen] = useState("wizard");
  const [scholarships, setScholarships] = useState([]);
  const [topPick, setTopPick] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [error, setError] = useState("");

  // load saved answers
  useEffect(() => {
    const saved = localStorage.getItem("scholarpath_answers");
    const savedResults = localStorage.getItem("scholarpath_results");
    if (saved) setAns(JSON.parse(saved));
    if (savedResults) {
      const { scholarships: sc, topPick: tp } = JSON.parse(savedResults);
      setScholarships(sc); setTopPick(tp); setScreen("results");
    }
  }, []);

  // save answers whenever they change
  useEffect(() => {
    if (Object.keys(ans).length > 0)
      localStorage.setItem("scholarpath_answers", JSON.stringify(ans));
  }, [ans]);

  const s = STEPS[cur];
  const isSummary = cur === STEPS.length;
  const canGo = isSummary ? true : s?.type === "opts"
    ? (!!ans[s?.id] && !(s?.id === "country" && ans.country === "Other" && !(ans.countryOther || "").trim()))
    : (ans[s?.id] || "").trim().length > 0;

  const submit = async () => {
    setScreen("loading");
    try {
      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: GROQ_MODEL, messages: [{ role: "user", content: buildPrompt(ans) }], temperature: 0.3, max_tokens: 5000 }),
      });
      const data = await res.json();
      const apiErr = groqError(data);
      if (apiErr) throw new Error(apiErr);
      const parsed = JSON.parse(data.choices[0].message.content.replace(/```json|```/g, "").trim());
      setScholarships(parsed.scholarships);
      setTopPick({ id: parsed.topPickId, reason: parsed.topPickReason });
      localStorage.setItem("scholarpath_results", JSON.stringify({ scholarships: parsed.scholarships, topPick: { id: parsed.topPickId, reason: parsed.topPickReason } }));
      setScreen("results");
    } catch (err) { setError(err.message); setScreen("wizard"); }
  };

  const resetAll = () => {
    localStorage.removeItem("scholarpath_answers");
    localStorage.removeItem("scholarpath_results");
    setAns({}); setScholarships([]); setTopPick(null);
    setCur(0); setScreen("wizard");
  };

  /* ── LOADING ── */
  if (screen === "loading") return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 20 }}>
      <style>{`.spin{animation:spin 0.9s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div className="spin" style={{ width: 40, height: 40, border: "3px solid #fde8d8", borderTop: "3px solid #ea580c", borderRadius: "50%" }} />
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#1c1917", marginBottom: 6 }}>Finding your scholarships...</div>
        <div style={{ fontSize: 14, color: "#a8a29e" }}>Ranking by your acceptance chances</div>
      </div>
    </div>
  );

  /* ── RESULTS ── */
  if (screen === "results") return (
    <div>
      <style>{`@keyframes slideIn{from{opacity:0;transform:translateX(32px)}to{opacity:1;transform:translateX(0)}}.slide-in{animation:slideIn 0.35s cubic-bezier(0.16,1,0.3,1) both}.sc-card{transition:box-shadow 0.2s,border-color 0.2s}.sc-card:hover{box-shadow:0 8px 32px rgba(0,0,0,0.08);border-color:#fbbf24!important}`}</style>

      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#1c1917", letterSpacing: "-0.03em", lineHeight: 1 }}>{scholarships.length} scholarships</div>
          <div style={{ fontSize: 13, color: "#a8a29e", marginTop: 6 }}>{ans.field} · {ans.degree} · {ans.country}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { setScreen("wizard"); setCur(STEPS.length); }} style={{ ...warm.ghostBtn, fontSize: 12 }}>Edit profile</button>
          <button onClick={resetAll} style={{ ...warm.ghostBtn, fontSize: 12, color: "#dc2626", borderColor: "#fecaca" }}>Reset</button>
        </div>
      </div>

      {/* profile chips */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
        {Object.entries(ans).map(([k, v]) => (
          <span key={k} style={{ fontSize: 12, background: "#fafaf9", border: "1px solid #ede8df", borderRadius: 20, padding: "4px 12px", color: "#57534e" }}>{v}</span>
        ))}
      </div>

      {/* top pick */}
      {topPick && (
        <div className="slide-in" style={{ background: "linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)", border: "1.5px solid #fbbf24", borderRadius: 20, padding: "24px 28px", marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#b45309", textTransform: "uppercase", letterSpacing: "0.08em" }}>Best match for you</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#1c1917", marginBottom: 8, letterSpacing: "-0.02em" }}>
            {scholarships.find(sc => sc.id === topPick.id)?.name}
          </div>
          <div style={{ fontSize: 14, color: "#a8a29e", lineHeight: 1.7 }}>{topPick.reason}</div>
        </div>
      )}

      {/* cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
        {[...scholarships].sort((a, b) => b.acceptanceChance - a.acceptanceChance).map((sc, idx) => {
          const isTop = sc.id === topPick?.id;
          const isExp = expanded === sc.id;
          const fs = fundStyle(sc.fundingType);
          return (
            <div key={sc.id} className="sc-card" style={{ background: "#fff", border: `1.5px solid ${isTop ? "#fbbf24" : "#ede8df"}`, borderRadius: 18, overflow: "hidden" }}>
              <div onClick={() => setExpanded(isExp ? null : sc.id)} style={{ padding: "20px 24px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ flex: 1, marginRight: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    {isTop && <span style={{ fontSize: 10, fontWeight: 700, background: "#fef3c7", color: "#b45309", border: "1px solid #fbbf24", padding: "2px 10px", borderRadius: 20 }}>best match</span>}
                    <span style={{ fontSize: 11, color: "#d6d3d1" }}>#{idx + 1}</span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#1c1917", marginBottom: 10, letterSpacing: "-0.01em" }}>{sc.name}</div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "#a8a29e" }}>{sc.hostCountry}</span>
                    <span style={{ color: "#d6d3d1" }}>·</span>
                    <span style={{ fontSize: 12, color: "#a8a29e" }}>{sc.deadline}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 12px", borderRadius: 20, background: fs.bg, color: fs.color, border: `1px solid ${fs.border}` }}>{sc.fundingType}</span>
                  </div>
                </div>
                <div style={{ textAlign: "center", flexShrink: 0, minWidth: 80 }}>
                  <div style={{ fontSize: 30, fontWeight: 800, color: cc(sc.acceptanceChance), letterSpacing: "-0.04em", lineHeight: 1 }}>{sc.acceptanceChance}%</div>
                  <div style={{ fontSize: 11, fontWeight: 600, background: ccBg(sc.acceptanceChance), color: cc(sc.acceptanceChance), padding: "3px 10px", borderRadius: 12, marginTop: 6, display: "inline-block" }}>{cl(sc.acceptanceChance)}</div>
                  <div style={{ fontSize: 9, color: "#d6d3d1", marginTop: 10 }}>{isExp ? "▲" : "▼"}</div>
                </div>
              </div>

              {isExp && (
                <div style={{ padding: "0 24px 24px", borderTop: "1px solid #ede8df" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "18px 0" }}>
                    <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 14, padding: "16px 18px" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#15803d", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Why it fits</div>
                      <div style={{ fontSize: 13, color: "#166534", lineHeight: 1.65 }}>{sc.whyGoodFit}</div>
                    </div>
                    <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 14, padding: "16px 18px" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#b45309", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Main challenge</div>
                      <div style={{ fontSize: 13, color: "#92400e", lineHeight: 1.65 }}>{sc.mainChallenge}</div>
                    </div>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <div style={warm.secLabel}>Eligibility</div>
                    <div style={{ fontSize: 14, color: "#57534e", lineHeight: 1.7, marginTop: 6 }}>{sc.eligibility}</div>
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <div style={warm.secLabel}>Required documents</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                      {sc.requiredDocuments.map((d, i) => (
                        <span key={i} style={{ background: "#fafaf9", border: "1px solid #ede8df", borderRadius: 8, padding: "5px 14px", fontSize: 13, color: "#57534e" }}>{d}</span>
                      ))}
                    </div>
                  </div>
                  <a href={sc.officialLink} target="_blank" rel="noreferrer" style={warm.applyBtn}>
                    Official website <Arrow />
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );

  /* ── WIZARD ── */
  return (
    <div>
      <style>{`.opt-btn:hover{background:#fff7ed!important;border-color:#ea580c!important;color:#c2410c!important} input::placeholder{color:#a8a29e} @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}} .fade-in{animation:fadeUp 0.25s ease both}`}</style>

      {/* saved profile banner */}
      {Object.keys(ans).length > 0 && screen === "wizard" && (
        <div style={{ background: "#fff8f0", border: "1px solid #fed7aa", borderRadius: 14, padding: "14px 20px", marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#ea580c" }}>Saved profile found</span>
            <span style={{ fontSize: 13, color: "#a8a29e", marginLeft: 8 }}>Continue from where you left off</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setCur(STEPS.length)} style={{ ...warm.nextBtn, padding: "8px 16px", fontSize: 12 }}>Continue <Arrow /></button>
            <button onClick={resetAll} style={{ ...warm.ghostBtn, fontSize: 12 }}>Start fresh</button>
          </div>
        </div>
      )}

      {/* progress bar */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 48 }}>
        {STEPS.map((_, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : 0 }}>
            <div onClick={() => ans[STEPS[i].id] && setCur(i)} style={{
              width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, flexShrink: 0, transition: "all 0.25s",
              background: i < cur ? "#fff7ed" : i === cur ? "#ea580c" : "#fff",
              border: `2px solid ${i < cur ? "#ea580c" : i === cur ? "#ea580c" : "#ede8df"}`,
              color: i < cur ? "#ea580c" : i === cur ? "#fff" : "#a8a29e",
              boxShadow: i === cur ? "0 0 0 5px rgba(234,88,12,0.12)" : "none",
              cursor: ans[STEPS[i].id] ? "pointer" : "default",
            }}>
              {i < cur
                ? <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="1.5,5 4,7.5 8.5,2.5"/></svg>
                : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: i < cur ? "#ea580c" : "#ede8df", margin: "0 8px", borderRadius: 2, transition: "background 0.3s" }} />
            )}
          </div>
        ))}
      </div>

      {/* ghost number */}
      <div style={{ fontSize: 140, fontWeight: 900, color: "rgba(0,0,0,0.035)", lineHeight: 1, marginBottom: -20, letterSpacing: "-0.05em", userSelect: "none" }}>
        {isSummary ? "✓" : s.num}
      </div>

      {/* card — full width */}
      <div className="fade-in" style={{ background: "#fff", border: "1px solid #ede8df", borderRadius: 24, padding: "40px 40px 32px", boxShadow: "0 4px 40px rgba(0,0,0,0.06)" }}>
        {!isSummary ? (
          <>
            <div style={{ fontSize: 30, fontWeight: 800, color: "#1c1917", marginBottom: 8, letterSpacing: "-0.03em", lineHeight: 1.2 }}>{s.q}</div>
            <div style={{ fontSize: 15, color: "#a8a29e", marginBottom: 32 }}>{s.hint}</div>

            {s.type === "opts" ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 36 }}>
                  {s.opts.map(o => {
                    const sel = ans[s.id] === o;
                    return (
                      <button key={o} className="opt-btn" onClick={() => setAns(a => ({ ...a, [s.id]: o }))}
                        style={{
                          background: sel ? "#fff7ed" : "#fafaf9",
                          border: `2px solid ${sel ? "#ea580c" : "#ede8df"}`,
                          borderRadius: 14, padding: "16px 18px",
                          fontSize: 14, color: sel ? "#c2410c" : "#57534e",
                          cursor: "pointer", textAlign: "left",
                          fontFamily: "inherit", fontWeight: sel ? 700 : 400,
                          transition: "all 0.15s", lineHeight: 1.4,
                        }}>
                        {sel && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ea580c", marginBottom: 8 }} />}
                        {o}
                      </button>
                    );
                  })}
                </div>
                {s.id === "country" && ans.country === "Other" && (
                  <input
                    autoFocus
                    type="text"
                    placeholder="Which country?"
                    value={ans.countryOther || ""}
                    onChange={e => setAns(a => ({ ...a, countryOther: e.target.value }))}
                    onKeyDown={e => e.key === "Enter" && canGo && setCur(c => c + 1)}
                    style={{ width: "100%", background: "transparent", border: "none", borderBottom: "2.5px solid #ede8df", padding: "12px 0", fontSize: 22, color: "#1c1917", fontFamily: "inherit", outline: "none", caretColor: "#ea580c", marginTop: 8 }}
                  />
                )}
              </>
            ) : (
              <div style={{ marginBottom: 36 }}>
                <input autoFocus type="text" placeholder={s.placeholder} value={ans[s.id] || ""}
                  onChange={e => setAns(a => ({ ...a, [s.id]: e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && canGo && setCur(c => c + 1)}
                  style={{ width: "100%", background: "transparent", border: "none", borderBottom: "2.5px solid #ede8df", padding: "12px 0", fontSize: 26, color: "#1c1917", fontFamily: "inherit", outline: "none", caretColor: "#ea580c" }} />
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ fontSize: 30, fontWeight: 800, color: "#1c1917", marginBottom: 8, letterSpacing: "-0.03em" }}>Looks good?</div>
            <div style={{ fontSize: 15, color: "#a8a29e", marginBottom: 28 }}>Review before we search</div>
            <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid #ede8df", marginBottom: 32 }}>
              {STEPS.map((st, i) => (
                <div key={st.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", background: i % 2 === 0 ? "#fafaf9" : "#fff", borderBottom: i < STEPS.length - 1 ? "1px solid #f5f0e8" : "none" }}>
                  <span style={{ fontSize: 13, color: "#a8a29e" }}>{st.hint}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 14, color: "#1c1917", fontWeight: 600 }}>
                      {st.id === "country" && ans.country === "Other" ? ans.countryOther : ans[st.id]}
                    </span>
                    <button onClick={() => setCur(i)} style={{ background: "none", border: "none", fontSize: 12, color: "#ea580c", cursor: "pointer", fontFamily: "inherit", padding: "2px 8px" }}>Edit</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "14px 18px", color: "#dc2626", fontSize: 14, marginBottom: 20 }}>{error}</div>}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {cur > 0
            ? <button onClick={() => setCur(c => c - 1)} style={warm.backBtn}>Back</button>
            : <span />}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 12, color: "#d6d3d1" }}>{Math.min(cur + 1, STEPS.length)} / {STEPS.length}</span>
            <button onClick={() => canGo && (isSummary ? submit() : setCur(c => c + 1))} disabled={!canGo}
              style={{ ...warm.nextBtn, opacity: canGo ? 1 : 0.35, cursor: canGo ? "pointer" : "not-allowed", padding: "13px 28px", fontSize: 15 }}>
              {isSummary ? "Find scholarships" : cur === STEPS.length - 1 ? "Review" : "Next"} <Arrow />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}