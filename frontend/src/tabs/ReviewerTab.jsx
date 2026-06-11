import { useState } from "react";
import { GROQ_URL, GROQ_MODEL, groqError, warm } from "../config";

const buildPrompt = (text, scholarship, degree) => `
You are an expert personal statement reviewer who has read thousands of successful scholarship applications.
Review this personal statement for the "${scholarship || "scholarship"}" application (${degree || "graduate program"}):
---
${text}
---
Return ONLY raw JSON, no markdown:
{"humanScore":number,"humanScoreReason":"string","overallScore":number,"overallVerdict":"string","strengths":["string"],"weaknesses":["string"],"lineByLine":[{"quote":"max 8 words from text","issue":"string","suggestion":"string","type":"strength"|"weakness"|"improve"}],"aiPhrases":["string"],"rewriteSuggestions":[{"original":"string","rewrite":"string","why":"string"}],"finalTips":["string"]}`;

const ScoreRing = ({ score, label, color }) => {
  const r = 36, circ = 2 * Math.PI * r, fill = (score / 100) * circ;
  return (
    <div style={{ textAlign: "center" }}>
      <svg width="90" height="90" viewBox="0 0 90 90">
        <circle cx="45" cy="45" r={r} fill="none" stroke="#ede8df" strokeWidth="6" />
        <circle cx="45" cy="45" r={r} fill="none" stroke={color} strokeWidth="6" strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" transform="rotate(-90 45 45)" />
        <text x="45" y="49" textAnchor="middle" fontSize="16" fontWeight="700" fill={color}>{score}</text>
      </svg>
      <div style={{ fontSize: 12, color: "#a8a29e", marginTop: 4, fontWeight: 500 }}>{label}</div>
    </div>
  );
};

const typeStyle = (t) => ({ "strength": { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0", label: "Strong" }, "weakness": { bg: "#fef2f2", color: "#dc2626", border: "#fecaca", label: "Weak" }, "improve": { bg: "#fffbeb", color: "#b45309", border: "#fde68a", label: "Improve" } }[t] || {});
const humanColor = (s) => s >= 70 ? "#16a34a" : s >= 40 ? "#b45309" : "#dc2626";

export default function ReviewerTab() {
  const [text, setText] = useState("");
  const [scholarship, setScholarship] = useState("");
  const [degree, setDegree] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("overview");

  const review = async () => {
    if (text.trim().length < 100) return setError("Paste at least 100 characters of your statement.");
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: GROQ_MODEL, messages: [{ role: "user", content: buildPrompt(text, scholarship, degree) }], temperature: 0.3, max_tokens: 4000 }),
      });
      const data = await res.json();
      const apiErr = groqError(data);
      if (apiErr) throw new Error(apiErr);
      const parsed = JSON.parse(data.choices[0].message.content.replace(/```json|```/g, "").trim());
      setResult(parsed); setActiveSection("overview");
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  const chatPrompt = `You are a personal statement coach. The user is writing a statement for "${scholarship || "a scholarship"}" for ${degree || "a graduate program"}. ${result ? `Their statement scored ${result.humanScore}/100 for authenticity and ${result.overallScore}/100 overall. Key weaknesses: ${result.weaknesses?.join(", ")}.` : ""} Help them improve their personal statement.`;

  return (
    <div>
      <style>{`@keyframes slideIn{from{opacity:0;transform:translateX(32px)}to{opacity:1;transform:translateX(0)}}.slide-in{animation:slideIn 0.35s cubic-bezier(0.16,1,0.3,1) both} textarea:focus{border-color:#ea580c!important;outline:none}`}</style>

      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 32, fontWeight: 800, color: "#1c1917", letterSpacing: "-0.03em", lineHeight: 1 }}>Statement Reviewer</div>
        <div style={{ fontSize: 15, color: "#a8a29e", marginTop: 8 }}>Honest feedback + human authenticity score</div>
      </div>

      {/* input — two column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginBottom: 32, alignItems: "start" }}>

        {/* left — textarea */}
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={warm.label}>Scholarship</label>
              <input value={scholarship} onChange={e => setScholarship(e.target.value)} placeholder="e.g. Chevening..." style={warm.input} />
            </div>
            <div>
              <label style={warm.label}>Degree</label>
              <input value={degree} onChange={e => setDegree(e.target.value)} placeholder="e.g. MSc CS..." style={warm.input} />
            </div>
          </div>
          <label style={warm.label}>Your personal statement</label>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Paste your full personal statement or SOP here..." rows={14}
            style={{ width: "100%", border: "1.5px solid #ede8df", borderRadius: 14, padding: "16px", fontSize: 14, color: "#1c1917", fontFamily: "inherit", resize: "vertical", background: "#fafaf9", lineHeight: 1.75, boxSizing: "border-box", transition: "border-color 0.2s" }} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <span style={{ fontSize: 12, color: "#a8a29e" }}>{text.trim().split(/\s+/).filter(Boolean).length} words · {text.length} characters</span>
            {error && <span style={{ fontSize: 12, color: "#dc2626" }}>{error}</span>}
          </div>
        </div>

        {/* right — what we check + button */}
        <div>
          <div style={{ background: "#fff", border: "1px solid #ede8df", borderRadius: 18, padding: "24px", marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1c1917", marginBottom: 16 }}>What we check</div>
            {[
              ["Human score", "How authentic vs AI-generated it sounds", "#ea580c"],
              ["Overall quality", "Structure, clarity, persuasiveness", "#1d4ed8"],
              ["Line-by-line feedback", "Specific suggestions per section", "#15803d"],
              ["AI phrases", "Generic phrases that hurt your chances", "#dc2626"],
              ["Rewrite suggestions", "Before vs after examples", "#7e22ce"],
            ].map(([title, desc, color]) => (
              <div key={title} style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "flex-start" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, marginTop: 5, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1c1917" }}>{title}</div>
                  <div style={{ fontSize: 12, color: "#a8a29e", marginTop: 2 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={review} disabled={loading || text.trim().length < 100}
            style={{ ...warm.nextBtn, width: "100%", justifyContent: "center", padding: "14px", fontSize: 15, opacity: loading || text.trim().length < 100 ? 0.4 : 1, cursor: loading || text.trim().length < 100 ? "not-allowed" : "pointer" }}>
            {loading ? "Reviewing..." : "Review my statement"}
          </button>
        </div>
      </div>

      {result && (
        <div className="slide-in">
          {/* score row */}
          <div style={{ background: "#fff", border: "1px solid #ede8df", borderRadius: 20, padding: "28px 32px", marginBottom: 16, display: "flex", alignItems: "center", gap: 40 }}>
            <ScoreRing score={result.humanScore} label="Human score" color={humanColor(result.humanScore)} />
            <ScoreRing score={result.overallScore} label="Overall quality" color="#ea580c" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1c1917", marginBottom: 8 }}>
                {result.humanScore >= 70 ? "Sounds authentically human ✓" : result.humanScore >= 40 ? "Somewhat generic — needs more of you" : "Reads AI-generated — needs a full rewrite"}
              </div>
              <div style={{ fontSize: 14, color: "#a8a29e", lineHeight: 1.7 }}>{result.humanScoreReason}</div>
            </div>
          </div>

          {/* section tabs */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16, background: "#fff", border: "1px solid #ede8df", borderRadius: 14, padding: 6 }}>
            {["overview", "feedback", "rewrites", "tips"].map(t => (
              <button key={t} onClick={() => setActiveSection(t)} style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "none", fontSize: 13, fontWeight: activeSection === t ? 600 : 400, background: activeSection === t ? "#ea580c" : "transparent", color: activeSection === t ? "#fff" : "#a8a29e", cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize", transition: "all 0.15s" }}>{t}</button>
            ))}
          </div>

          {activeSection === "overview" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 18, padding: "22px 24px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#15803d", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>Strengths</div>
                {result.strengths?.map((s, i) => <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}><div style={{ width: 5, height: 5, borderRadius: "50%", background: "#15803d", marginTop: 6, flexShrink: 0 }} /><span style={{ fontSize: 14, color: "#166534", lineHeight: 1.55 }}>{s}</span></div>)}
              </div>
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 18, padding: "22px 24px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#dc2626", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>Weaknesses</div>
                {result.weaknesses?.map((w, i) => <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}><div style={{ width: 5, height: 5, borderRadius: "50%", background: "#dc2626", marginTop: 6, flexShrink: 0 }} /><span style={{ fontSize: 14, color: "#991b1b", lineHeight: 1.55 }}>{w}</span></div>)}
              </div>
              <div style={{ gridColumn: "1/-1", background: "linear-gradient(135deg,#fff7ed,#fef3c7)", border: "1.5px solid #fbbf24", borderRadius: 18, padding: "22px 24px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#b45309", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Overall verdict</div>
                <div style={{ fontSize: 15, color: "#a8a29e", lineHeight: 1.8 }}>{result.overallVerdict}</div>
              </div>
              {result.aiPhrases?.length > 0 && (
                <div style={{ gridColumn: "1/-1", background: "#fff", border: "1px solid #ede8df", borderRadius: 18, padding: "22px 24px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#a8a29e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>AI-sounding phrases to replace</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {result.aiPhrases.map((p, i) => <span key={i} style={{ background: "#fff", border: "1px solid #fecaca", borderRadius: 8, padding: "5px 14px", fontSize: 13, color: "#dc2626" }}>"{p}"</span>)}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSection === "feedback" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {result.lineByLine?.map((item, i) => {
                const ts = typeStyle(item.type);
                return (
                  <div key={i} style={{ background: "#fff", border: "1px solid #ede8df", borderRadius: 14, padding: "18px 22px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <span style={{ fontSize: 13, fontStyle: "italic", color: "#a8a29e" }}>"{item.quote}"</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 10, background: ts.bg, color: ts.color, border: `1px solid ${ts.border}`, flexShrink: 0, marginLeft: 14 }}>{ts.label}</span>
                    </div>
                    <div style={{ fontSize: 14, color: "#1c1917", marginBottom: 6, fontWeight: 600 }}>{item.issue}</div>
                    <div style={{ fontSize: 14, color: "#a8a29e" }}>→ {item.suggestion}</div>
                  </div>
                );
              })}
            </div>
          )}

          {activeSection === "rewrites" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {result.rewriteSuggestions?.map((r, i) => (
                <div key={i} style={{ background: "#fff", border: "1px solid #ede8df", borderRadius: 16, padding: "22px 24px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Original</div>
                      <div style={{ fontSize: 13, color: "#57534e", lineHeight: 1.65, background: "#fef2f2", borderRadius: 10, padding: "12px 14px" }}>{r.original}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#15803d", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Suggested rewrite</div>
                      <div style={{ fontSize: 13, color: "#166534", lineHeight: 1.65, background: "#f0fdf4", borderRadius: 10, padding: "12px 14px" }}>{r.rewrite}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "#a8a29e" }}>Why: {r.why}</div>
                </div>
              ))}
            </div>
          )}

          {activeSection === "tips" && (
            <div style={{ background: "#fff", border: "1px solid #ede8df", borderRadius: 18, padding: "26px 28px" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1c1917", marginBottom: 20 }}>Final tips before you submit</div>
              {result.finalTips?.map((t, i) => (
                <div key={i} style={{ display: "flex", gap: 16, marginBottom: 18, alignItems: "flex-start" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#fff7ed", border: "1.5px solid #fed7aa", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#ea580c", flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ fontSize: 14, color: "#57534e", lineHeight: 1.7, paddingTop: 3 }}>{t}</div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

    </div>
  );
}