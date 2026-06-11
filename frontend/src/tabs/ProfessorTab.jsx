import { useState, useEffect } from "react";
import { GROQ_URL, GROQ_MODEL, groqError, warm } from "../config";

const buildPrompt = (university, field, degree) => `
You are an academic research expert. Find professors at "${university}" in "${field}" who supervise ${degree} students.
For each professor, provide estimated ratings (1-10) based on their known academic profile. Be realistic and vary the scores.
Return ONLY raw JSON, no markdown:
{
  "professors": [
    {
      "id": number,
      "name": "string",
      "title": "string",
      "department": "string",
      "researchFocus": "string (2-3 sentences)",
      "email": "string",
      "emailConfidence": "High"|"Medium"|"Low",
      "recentWork": "string",
      "whyContact": "string",
      "profileUrl": "string",
      "ratings": {
        "researchActivity": number,
        "supervisionHistory": number,
        "publicationCount": number,
        "behaviourCooperation": number,
        "accessibility": number,
        "fundingAvailability": number
      },
      "ratingsNote": "string (one sentence explaining the ratings)"
    }
  ],
  "emailTemplate": {
    "subject": "string",
    "body": "string (with [PLACEHOLDERS] for student to fill in)"
  },
  "universityEmailFormat": "string",
  "disclaimer": "string"
}`;

const confColor = (c) => ({
  "High":   { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  "Medium": { bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
  "Low":    { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
}[c] || {});

const RATING_FIELDS = [
  { key: "researchActivity",    label: "Research Activity",      color: "#ea580c" },
  { key: "supervisionHistory",  label: "Supervision History",    color: "#7e22ce" },
  { key: "publicationCount",    label: "Publication Count",      color: "#1d4ed8" },
  { key: "behaviourCooperation",label: "Behaviour & Cooperation",color: "#15803d" },
  { key: "accessibility",       label: "Accessibility",          color: "#b45309" },
  { key: "fundingAvailability", label: "Funding Availability",   color: "#0891b2" },
];

function RatingDots({ score, color }) {
  return (
    <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: "50%",
          background: i < score ? color : "#e7e5e4",
          transition: "background 0.2s",
          flexShrink: 0,
        }} />
      ))}
      <span style={{ fontSize: 11, color: "#a8a29e", marginLeft: 6 }}>{score}/10</span>
    </div>
  );
}

function ProfessorCard({ prof, isSelected, onSelect }) {
  const [expanded, setExpanded] = useState(false);
  const cc = confColor(prof.emailConfidence);
  const avgRating = prof.ratings
    ? Math.round(Object.values(prof.ratings).reduce((a, b) => a + b, 0) / 6 * 10) / 10
    : null;

  return (
    <div
      onClick={() => onSelect(prof)}
      style={{
        background: "#fff",
        border: `1.5px solid ${isSelected ? "#ea580c" : "#ede8df"}`,
        borderRadius: 16,
        overflow: "hidden",
        cursor: "pointer",
        transition: "all 0.2s",
        boxShadow: isSelected ? "0 0 0 3px rgba(234,88,12,0.1)" : "none",
      }}>

      {/* top row */}
      <div style={{ padding: "18px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div style={{ flex: 1, marginRight: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              {isSelected && (
                <span style={{ fontSize: 10, fontWeight: 700, background: "#fff7ed", color: "#ea580c", border: "1px solid #fed7aa", padding: "2px 8px", borderRadius: 20 }}>selected</span>
              )}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1c1917", marginBottom: 3 }}>{prof.name}</div>
            <div style={{ fontSize: 12, color: "#a8a29e" }}>{prof.title} · {prof.department}</div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            {avgRating && (
              <div style={{ fontSize: 22, fontWeight: 800, color: "#ea580c", letterSpacing: "-0.03em", lineHeight: 1 }}>{avgRating}</div>
            )}
            <div style={{ fontSize: 10, color: "#a8a29e", marginTop: 2 }}>avg score</div>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: cc.bg, color: cc.color, border: `1px solid ${cc.border}`, display: "inline-block", marginTop: 6 }}>
              Email {prof.emailConfidence}
            </span>
          </div>
        </div>

        <div style={{ fontSize: 13, color: "#57534e", lineHeight: 1.6, marginBottom: 10 }}>{prof.researchFocus}</div>
        <div style={{ fontSize: 12, color: "#ea580c", fontWeight: 500, marginBottom: 4 }}>{prof.email}</div>
        <div style={{ fontSize: 12, color: "#a8a29e", fontStyle: "italic" }}>{prof.recentWork}</div>
      </div>

      {/* ratings */}
      {prof.ratings && (
        <div style={{ padding: "14px 20px", borderTop: "1px solid #ede8df", background: "#fafaf9" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px" }}>
            {RATING_FIELDS.map(({ key, label, color }) => (
              <div key={key}>
                <div style={{ fontSize: 11, color: "#78716c", marginBottom: 5 }}>{label}</div>
                <RatingDots score={prof.ratings[key]} color={color} />
              </div>
            ))}
          </div>
          {prof.ratingsNote && (
            <div style={{ fontSize: 11, color: "#a8a29e", marginTop: 10, fontStyle: "italic" }}>{prof.ratingsNote}</div>
          )}
        </div>
      )}

      {/* expand toggle */}
      <div onClick={e => { e.stopPropagation(); setExpanded(x => !x); }}
        style={{ padding: "10px 20px", borderTop: "1px solid #ede8df", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
        <span style={{ fontSize: 12, color: "#a8a29e" }}>{expanded ? "Show less" : "Why contact · Faculty page"}</span>
        <span style={{ fontSize: 10, color: "#d6d3d1" }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <div style={{ padding: "0 20px 18px" }}>
          <div style={{ fontSize: 12, color: "#57534e", background: "#fff7ed", borderRadius: 10, padding: "10px 14px", marginBottom: 10, lineHeight: 1.6 }}>{prof.whyContact}</div>
          {prof.profileUrl && (
            <a href={prof.profileUrl} target="_blank" rel="noreferrer"
              onClick={e => e.stopPropagation()}
              style={{ fontSize: 12, color: "#1d4ed8" }}>Faculty page →</a>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProfessorTab({ onContextChange }) {
  const [university, setUniversity] = useState("");
  const [field, setField] = useState("");
  const [degree, setDegree] = useState("PhD");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [selectedProf, setSelectedProf] = useState(null);

  // notify parent of context whenever selection or results change
  useEffect(() => {
    if (onContextChange) {
      onContextChange({
        university,
        field,
        degree,
        professors: result?.professors || [],
        selectedProfessor: selectedProf,
      });
    }
  }, [selectedProf, result, university, field, degree]);

  const handleSelect = (prof) => {
    setSelectedProf(prev => prev?.id === prof.id ? null : prof);
  };

  const search = async () => {
    if (!university.trim() || !field.trim()) return;
    setLoading(true); setError(""); setResult(null); setSelectedProf(null);
    try {
      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: GROQ_MODEL, messages: [{ role: "user", content: buildPrompt(university, field, degree) }], temperature: 0.4, max_tokens: 5000 }),
      });
      const data = await res.json();
      const apiErr = groqError(data);
      if (apiErr) throw new Error(apiErr);
      const parsed = JSON.parse(data.choices[0].message.content.replace(/```json|```/g, "").trim());
      setResult(parsed);
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  const copyEmail = () => {
    navigator.clipboard.writeText(`Subject: ${result.emailTemplate.subject}\n\n${result.emailTemplate.body}`);
    setCopiedEmail(true); setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
    <div>
      <style>{`@keyframes slideIn{from{opacity:0;transform:translateX(32px)}to{opacity:1;transform:translateX(0)}}.slide-in{animation:slideIn 0.35s cubic-bezier(0.16,1,0.3,1) both}.prof-card:hover{box-shadow:0 4px 20px rgba(0,0,0,0.07)!important}`}</style>

      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 32, fontWeight: 800, color: "#1c1917", letterSpacing: "-0.03em", lineHeight: 1 }}>Professor Finder</div>
        <div style={{ fontSize: 15, color: "#a8a29e", marginTop: 8 }}>Find supervisors, see ratings, get a cold email template</div>
      </div>

      {/* input row */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr auto auto", gap: 12, alignItems: "end", marginBottom: 32 }}>
        <div>
          <label style={warm.label}>University</label>
          <input value={university} onChange={e => setUniversity(e.target.value)} placeholder="e.g. TU Berlin, University of Toronto..." style={warm.input} />
        </div>
        <div>
          <label style={warm.label}>Research area</label>
          <input value={field} onChange={e => setField(e.target.value)} placeholder="e.g. Machine Learning, NLP..." style={warm.input} />
        </div>
        <div>
          <label style={warm.label}>Degree</label>
          <select value={degree} onChange={e => setDegree(e.target.value)} style={{ ...warm.input, appearance: "none" }}>
            <option>PhD</option><option>Master's</option><option>Postdoc</option>
          </select>
        </div>
        <button onClick={search} disabled={loading || !university.trim() || !field.trim()}
          style={{ ...warm.nextBtn, opacity: loading || !university.trim() || !field.trim() ? 0.4 : 1, cursor: loading || !university.trim() || !field.trim() ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
          {loading ? "Searching..." : "Find professors"}
        </button>
      </div>

      {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "14px 18px", color: "#dc2626", fontSize: 14, marginBottom: 20 }}>{error}</div>}

      {result && (
        <div className="slide-in">
          {/* disclaimer */}
          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: "12px 18px", marginBottom: 20, fontSize: 13, color: "#92400e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{result.disclaimer}</span>
            <span style={{ fontWeight: 600, flexShrink: 0, marginLeft: 16 }}>Format: {result.universityEmailFormat}</span>
          </div>

          {selectedProf && (
            <div style={{ background: "#fff7ed", border: "1.5px solid #fed7aa", borderRadius: 14, padding: "12px 18px", marginBottom: 16, fontSize: 13, color: "#57534e", display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="#ea580c"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span>AI advisor is now aware of <strong>{selectedProf.name}</strong> — ask anything about contacting them.</span>
              <button onClick={() => setSelectedProf(null)} style={{ marginLeft: "auto", background: "none", border: "none", fontSize: 11, color: "#a8a29e", cursor: "pointer", fontFamily: "inherit" }}>Clear</button>
            </div>
          )}

          {/* 2 col layout */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>

            {/* professors list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1c1917", marginBottom: 4 }}>
                {result.professors?.length} professors found
                <span style={{ fontSize: 11, color: "#a8a29e", fontWeight: 400, marginLeft: 8 }}>click to select for AI context</span>
              </div>
              {result.professors?.map(prof => (
                <ProfessorCard
                  key={prof.id}
                  prof={prof}
                  isSelected={selectedProf?.id === prof.id}
                  onSelect={handleSelect}
                />
              ))}
            </div>

            {/* email template sticky */}
            {result.emailTemplate && (
              <div style={{ position: "sticky", top: 20, alignSelf: "start" }}>
                <div style={{ background: "#fff", border: "1px solid #ede8df", borderRadius: 18, overflow: "hidden" }}>
                  <div style={{ padding: "18px 22px", borderBottom: "1px solid #ede8df", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1c1917" }}>Cold email template</div>
                    <button onClick={copyEmail} style={{ ...warm.ghostBtn, fontSize: 12 }}>{copiedEmail ? "Copied! ✓" : "Copy"}</button>
                  </div>
                  <div style={{ padding: "18px 22px" }}>
                    <div style={{ background: "#fafaf9", border: "1px solid #ede8df", borderRadius: 10, padding: "12px 16px", marginBottom: 12 }}>
                      <div style={{ fontSize: 11, color: "#a8a29e", marginBottom: 6 }}>SUBJECT</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#1c1917" }}>{result.emailTemplate.subject}</div>
                    </div>
                    <div style={{ background: "#fafaf9", border: "1px solid #ede8df", borderRadius: 10, padding: "14px 16px" }}>
                      <div style={{ fontSize: 11, color: "#a8a29e", marginBottom: 8 }}>BODY</div>
                      <pre style={{ fontSize: 13, color: "#57534e", lineHeight: 1.8, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{result.emailTemplate.body}</pre>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}