import { useState } from "react";
import { GROQ_URL, GROQ_MODEL, groqError, warm } from "../config";

const buildPrompt = (scholarship, degree, field) => `
You are a scholarship research expert with deep knowledge of Reddit (r/gradadmissions, r/scholarships, r/internationalstudents) and Quora discussions.
Find real community experiences about the "${scholarship}" scholarship for someone pursuing ${degree || "a degree"} in ${field || "their field"}.
Return ONLY raw JSON, no markdown:
{
  "overview": "2-3 sentence summary of what applicants say",
  "successPatterns": [{"pattern":"string","frequency":"Common"|"Occasional"|"Rare"}],
  "tipsByStage": {"application":["tip1","tip2","tip3"],"sop":["tip1","tip2","tip3"],"interview":["tip1","tip2","tip3"]},
  "mistakesToAvoid": ["mistake1","mistake2","mistake3"],
  "typicalProfile": {"gpa":"string","experience":"string","extras":"string"},
  "timeline": "string",
  "redditVerdict": "string"
}`;

const buildChatPrompt = (scholarship, degree, field) =>
  `You are a scholarship advisor. The user is researching the "${scholarship}" scholarship for ${degree || "a degree"} in ${field || "their field"}. Answer questions about this scholarship, application tips, eligibility, and success strategies. Be concise and direct.`;

const freqColor = (f) => ({ "Common": { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" }, "Occasional": { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" }, "Rare": { bg: "#fafaf9", color: "#57534e", border: "#ede8df" } }[f] || {});

export default function StoriesTab() {
  const [scholarship, setScholarship] = useState("");
  const [degree, setDegree] = useState("");
  const [field, setField] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const search = async () => {
    if (!scholarship.trim()) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: GROQ_MODEL, messages: [{ role: "user", content: buildPrompt(scholarship, degree, field) }], temperature: 0.4, max_tokens: 3000 }),
      });
      const data = await res.json();
      const apiErr = groqError(data);
      if (apiErr) throw new Error(apiErr);
      const parsed = JSON.parse(data.choices[0].message.content.replace(/```json|```/g, "").trim());
      setResult(parsed);
      setSubmitted(true);
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  return (
    <div>
      <style>{`@keyframes slideIn{from{opacity:0;transform:translateX(32px)}to{opacity:1;transform:translateX(0)}}.slide-in{animation:slideIn 0.35s cubic-bezier(0.16,1,0.3,1) both}`}</style>

      {/* header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 32, fontWeight: 800, color: "#1c1917", letterSpacing: "-0.03em", lineHeight: 1 }}>Success Stories</div>
        <div style={{ fontSize: 15, color: "#a8a29e", marginTop: 8 }}>What Reddit & Quora say about getting in</div>
      </div>

      {/* input row — full width, not a card */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 12, alignItems: "end", marginBottom: 32 }}>
        <div>
          <label style={warm.label}>Scholarship name</label>
          <input value={scholarship} onChange={e => setScholarship(e.target.value)} placeholder="e.g. DAAD, Chevening, Fulbright..." style={warm.input} onKeyDown={e => e.key === "Enter" && search()} />
        </div>
        <div>
          <label style={warm.label}>Your degree</label>
          <input value={degree} onChange={e => setDegree(e.target.value)} placeholder="e.g. Master's..." style={warm.input} />
        </div>
        <div>
          <label style={warm.label}>Your field</label>
          <input value={field} onChange={e => setField(e.target.value)} placeholder="e.g. CS, Medicine..." style={warm.input} />
        </div>
        <button onClick={search} disabled={loading || !scholarship.trim()}
          style={{ ...warm.nextBtn, opacity: loading || !scholarship.trim() ? 0.4 : 1, cursor: loading || !scholarship.trim() ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "14px 18px", color: "#dc2626", fontSize: 14, marginBottom: 20 }}>{error}</div>}

      {result && (
        <div className="slide-in">
          {/* overview — full width */}
          <div style={{ background: "linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)", border: "1.5px solid #fbbf24", borderRadius: 20, padding: "24px 28px", marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#b45309", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Community overview</div>
            <div style={{ fontSize: 15, color: "#a8a29e", lineHeight: 1.8 }}>{result.overview}</div>
          </div>

          {/* 2 col grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>

            {/* success patterns */}
            <div style={{ background: "#fff", border: "1px solid #ede8df", borderRadius: 18, padding: "24px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1c1917", marginBottom: 16 }}>Success patterns</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {result.successPatterns?.map((p, i) => {
                  const fc = freqColor(p.frequency);
                  return (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <span style={{ fontSize: 14, color: "#57534e", lineHeight: 1.5, flex: 1 }}>{p.pattern}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 12, background: fc.bg, color: fc.color, border: `1px solid ${fc.border}`, flexShrink: 0 }}>{p.frequency}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* typical profile */}
            <div style={{ background: "#fff", border: "1px solid #ede8df", borderRadius: 18, padding: "24px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1c1917", marginBottom: 16 }}>Typical successful applicant</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[["GPA / Grades", result.typicalProfile?.gpa], ["Experience", result.typicalProfile?.experience], ["Extras", result.typicalProfile?.extras]].map(([l, v]) => (
                  <div key={l}>
                    <div style={{ fontSize: 11, color: "#a8a29e", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{l}</div>
                    <div style={{ fontSize: 14, color: "#1c1917", fontWeight: 500, lineHeight: 1.5 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* tips 3 col */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 14 }}>
            {[
              ["Application tips", result.tipsByStage?.application, "#eff6ff", "#1d4ed8", "#bfdbfe"],
              ["SOP / Essay tips", result.tipsByStage?.sop, "#f0fdf4", "#15803d", "#bbf7d0"],
              ["Interview tips", result.tipsByStage?.interview, "#fdf4ff", "#7e22ce", "#e9d5ff"]
            ].map(([title, tips, bg, color, border]) => (
              <div key={title} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 18, padding: "22px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>{title}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {tips?.map((t, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: color, marginTop: 6, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color, lineHeight: 1.6, opacity: 0.9 }}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* bottom 2 col */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
            <div style={{ background: "#fff", border: "1px solid #ede8df", borderRadius: 18, padding: "24px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#dc2626", marginBottom: 14 }}>Mistakes to avoid</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {result.mistakesToAvoid?.map((m, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#dc2626", marginTop: 6, flexShrink: 0 }} />
                    <span style={{ fontSize: 14, color: "#57534e", lineHeight: 1.55 }}>{m}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: "#fff", border: "1px solid #ede8df", borderRadius: 18, padding: "24px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1c1917", marginBottom: 14 }}>Community verdict</div>
              <div style={{ fontSize: 14, color: "#57534e", lineHeight: 1.75, marginBottom: 16 }}>{result.redditVerdict}</div>
              <div style={{ fontSize: 12, color: "#a8a29e", background: "#fff", border: "1px solid #ede8df", borderRadius: 10, padding: "10px 14px" }}>⏰ {result.timeline}</div>
            </div>
          </div>
            </div>
      )}
    </div>
  );
}