import { useState, useRef, useEffect } from "react";
import SearchTab from "./tabs/SearchTab";
import StoriesTab from "./tabs/StoriesTab";
import ReviewerTab from "./tabs/ReviewerTab";
import ProfessorTab from "./tabs/ProfessorTab";
import { GROQ_URL, GROQ_MODEL, groqError, warm } from "./config";

const NAV = [
  { id: "search", label: "Find Scholarships",
    systemPrompt: "You are a scholarship advisor helping a Pakistani student find international scholarships. Answer questions about scholarships, eligibility, application tips, deadlines, and funding types. Always be concise and direct. No filler sentences, no 'Great question!', no 'I hope this helps!', no restating what the user just said. Get straight to the answer. Use short paragraphs or bullet points. If a question can be answered in 2 sentences, answer in 2 sentences.",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg> },
  { id: "stories", label: "Success Stories",
    systemPrompt: "You are a scholarship research expert with deep knowledge of Reddit and Quora discussions about scholarships. Help the user understand what successful applicants did, community tips, and real experiences. Always be concise and direct. No filler sentences, no 'Great question!', no 'I hope this helps!', no restating what the user just said. Get straight to the answer. Use short paragraphs or bullet points. If a question can be answered in 2 sentences, answer in 2 sentences.",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
  { id: "reviewer", label: "Statement Reviewer",
    systemPrompt: "You are an expert personal statement coach for scholarship applications. Help the user write, improve, and humanize their personal statement or SOP. Give specific, actionable feedback. Always be concise and direct. No filler sentences, no 'Great question!', no 'I hope this helps!', no restating what the user just said. Get straight to the answer. Use short paragraphs or bullet points. If a question can be answered in 2 sentences, answer in 2 sentences.",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
  { id: "professors", label: "Professor Finder",
   systemPrompt: "You are an academic advisor helping students find PhD and Master's supervisors. Give advice on cold emailing strategies, how to find research fit, what to include in emails, and how to follow up professionally. IMPORTANT: Never answer questions about specific professors by name — do not describe their research interests, publications, background, or availability. If asked about a specific professor, say you don't have verified real-time information about individual professors and direct the user to check the professor's faculty page or Google Scholar instead. Only give general advice about the process.",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
]
;

const chatHistories = { search: [], stories: [], reviewer: [], professors: [] };

function getSuggestions(tabId) {
  return {
    search: ["What GPA do I need for DAAD?", "Which scholarships are easiest for Pakistanis?", "When should I start applying for Chevening?"],
    stories: ["What do successful Chevening applicants have in common?", "How important is work experience for Fulbright?", "What mistakes do most applicants make?"],
    reviewer: ["How do I make my SOP sound less AI-written?", "What's the ideal length for a personal statement?", "How do I start my statement strongly?"],
    professors: ["How do I cold email a professor?", "What should I include in my first email?", "How long should I wait before following up?"],
  }[tabId] || [];
}

function ChatPanel({ tabId, systemPrompt, onClose }) {
  const [msg, setMsg] = useState("");
  const [history, setHistory] = useState(chatHistories[tabId] || []);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const send = async () => {
    if (!msg.trim() || loading) return;
    const userMsg = msg.trim();
    setMsg("");
    const newHistory = [...history, { role: "user", content: userMsg }];
    setHistory(newHistory);
    chatHistories[tabId] = newHistory;
    setLoading(true);
    try {
      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [{ role: "system", content: systemPrompt }, ...newHistory],
          max_tokens: 1200,
        }),
      });
      const data = await res.json();
      const apiErr = groqError(data);
      if (apiErr) throw new Error(apiErr);
      const reply = data.choices[0].message.content;
      const updated = [...newHistory, { role: "assistant", content: reply }];
      setHistory(updated);
      chatHistories[tabId] = updated;
    } catch (err) {
      const updated = [...newHistory, { role: "assistant", content: err.message || "Something went wrong. Try again." }];
      setHistory(updated);
      chatHistories[tabId] = updated;
    }
    setLoading(false);
  };

  return (
    <div style={{
      width: 450,
      background: "#ffffff",
      borderLeft: "1px solid #ede8df",
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      position: "sticky",
      top: 0,
      flexShrink: 0,
      animation: "panelSlide 0.28s cubic-bezier(0.16,1,0.3,1)",
      zIndex: 20,
    }}>
      <style>{`
        @keyframes panelSlide { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
        .chat-input:focus { border-color: #ea580c !important; outline: none; }
        .send-btn:hover { background: #c2410c !important; }
        .msg-user { background: #ea580c; color: #fff; border-bottom-right-radius: 4px !important; }
        .msg-ai { background: #fafaf9; color: #1c1917; border: 1px solid #ede8df; border-bottom-left-radius: 4px !important; }
        .chip-btn:hover { background: #fff7ed !important; border-color: #ea580c !important; color: #c2410c !important; }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{
        padding: "14px 18px",
        borderBottom: "1.5px solid #ede8df",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
        background: "#ffffff",
        minHeight: 58,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "#fff7ed", border: "1px solid #fed7aa", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1c1917", lineHeight: 1.2 }}>AI Advisor</div>
            <div style={{ fontSize: 11, color: "#a8a29e", marginTop: 2 }}>{NAV.find(n => n.id === tabId)?.label}</div>
          </div>
        </div>

        {/* X button — inline in header, not absolute */}
        <button onClick={onClose} style={{
          width: 30, height: 30, borderRadius: 8,
          border: "1px solid #ede8df", background: "#ffffff",
          cursor: "pointer", display: "flex", alignItems: "center",
          justifyContent: "center", color: "#a8a29e",
          transition: "all 0.15s", flexShrink: 0,
        }}
          onMouseEnter={e => { e.currentTarget.style.background = "#fef2f2"; e.currentTarget.style.borderColor = "#fecaca"; e.currentTarget.style.color = "#dc2626"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "#ffffff"; e.currentTarget.style.borderColor = "#ede8df"; e.currentTarget.style.color = "#a8a29e"; }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* ── MESSAGES ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
        {history.length === 0 && (
          <div style={{ textAlign: "center", padding: "24px 12px" }}>
            <div style={{ fontSize: 32, marginBottom: 14 }}>👋</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1c1917", marginBottom: 6 }}>Ask me anything</div>
            <div style={{ fontSize: 13, color: "#a8a29e", lineHeight: 1.65, marginBottom: 24 }}>
              I'm context-aware — I know which tab you're on and can help with specific questions.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {getSuggestions(tabId).map((s, i) => (
                <button key={i} className="chip-btn" onClick={() => { setMsg(s); inputRef.current?.focus(); }}
                  style={{ background: "#fafaf9", border: "1px solid #ede8df", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#57534e", cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "all 0.15s" }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {history.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div className={m.role === "user" ? "msg-user" : "msg-ai"}
              style={{ maxWidth: "88%", padding: "11px 14px", borderRadius: 16, fontSize: 13, lineHeight: 1.7 }}>
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", gap: 5, padding: "11px 14px", background: "#fafaf9", border: "1px solid #ede8df", borderRadius: 16, borderBottomLeftRadius: 4, width: "fit-content" }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#d6d3d1", animation: `bounce 1s ${i * 0.18}s infinite` }} />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── CLEAR ── */}
      {history.length > 0 && (
        <div style={{ padding: "6px 18px", borderTop: "1px solid #ede8df", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={() => { setHistory([]); chatHistories[tabId] = []; }}
            style={{ fontSize: 11, color: "#a8a29e", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
            Clear chat
          </button>
        </div>
      )}

      {/* ── INPUT ── */}
      <div style={{ padding: "14px 16px", borderTop: "1px solid #ede8df", display: "flex", gap: 10, flexShrink: 0, background: "#ffffff" }}>
        <input ref={inputRef} className="chat-input" value={msg}
          onChange={e => setMsg(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Type a question..."
          style={{ flex: 1, border: "1.5px solid #ede8df", borderRadius: 12, padding: "11px 14px", fontSize: 13, fontFamily: "inherit", background: "#fafaf9", color: "#1c1917", transition: "border-color 0.2s" }} />
        <button className="send-btn" onClick={send} disabled={loading || !msg.trim()}
          style={{ width: 42, height: 42, borderRadius: 12, background: "#ea580c", border: "none", cursor: loading || !msg.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: loading || !msg.trim() ? 0.4 : 1, transition: "all 0.15s", flexShrink: 0 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function ScholarshipFinder() {
  const [active, setActive] = useState("search");
  const [collapsed, setCollapsed] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [professorContext, setProfessorContext] = useState(null);

  const tabs = {
    search: <SearchTab />,
    stories: <StoriesTab />,
    reviewer: <ReviewerTab />,
    professors: <ProfessorTab onContextChange={setProfessorContext} />,
  };

  const activeNav = NAV.find(n => n.id === active);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#faf7f2", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; }
        input:focus, select:focus, textarea:focus { border-color: #ea580c !important; outline: none; }
        .nav-btn:hover { background: #fff7ed !important; color: #1c1917 !important; }
        .collapse-btn:hover { background: #fff7ed !important; }
        .ask-ai-btn:hover { background: #c2410c !important; transform: translateY(-2px); box-shadow: 0 6px 24px rgba(234,88,12,0.35) !important; }
        @keyframes fadeSlide { from { opacity:0; transform:translateX(24px); } to { opacity:1; transform:translateX(0); } }
        .tab-content { animation: fadeSlide 0.3s cubic-bezier(0.16,1,0.3,1); }
      `}</style>

      {/* ── SIDEBAR ── */}
      <div style={{ width: collapsed ? 60 : 220, background: "#ffffff", borderRight: "1px solid #ede8df", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", flexShrink: 0, transition: "width 0.25s cubic-bezier(0.16,1,0.3,1)", overflow: "hidden", zIndex: 10 }}>

        <div style={{ padding: collapsed ? "18px 0" : "22px 16px 18px", display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between", borderBottom: "1px solid #ede8df" }}>
          {!collapsed && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#1c1917", letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>ScholarPath</div>
              <div style={{ fontSize: 11, color: "#a8a29e", marginTop: 1 }}>Scholarship companion</div>
            </div>
          )}
          <button className="collapse-btn" onClick={() => setCollapsed(c => !c)}
            style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid #ede8df", background: "#ffffff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.15s" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a8a29e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>

        <nav style={{ padding: "10px 8px", display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
          {NAV.map(n => {
            const isActive = active === n.id;
            return (
              <button key={n.id} className="nav-btn" onClick={() => setActive(n.id)} title={collapsed ? n.label : ""}
                style={{ display: "flex", alignItems: "center", gap: collapsed ? 0 : 10, justifyContent: collapsed ? "center" : "flex-start", padding: collapsed ? "11px 0" : "10px 12px", borderRadius: 10, border: "none", background: isActive ? "#fff7ed" : "transparent", color: isActive ? "#ea580c" : "#a8a29e", fontSize: 13, fontWeight: isActive ? 600 : 400, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", width: "100%", whiteSpace: "nowrap" }}>
                <span style={{ color: isActive ? "#ea580c" : "#a8a29e", flexShrink: 0, display: "flex" }}>{n.icon}</span>
                {!collapsed && n.label}
              </button>
            );
          })}
        </nav>

        {!collapsed && (
          <div style={{ padding: "14px 18px", borderTop: "1px solid #ede8df" }}>
            <div style={{ fontSize: 10, color: "#a8a29e" }}>Groq · Llama 3.3 · 70B</div>
          </div>
        )}
      </div>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* topbar */}
        <div style={{ background: "#ffffff", borderBottom: "1px solid #ede8df", padding: "0 32px", height: 54, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 9, flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#1c1917" }}>{activeNav?.label}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e" }} />
            <span style={{ fontSize: 12, color: "#a8a29e" }}>Groq connected</span>
          </div>
        </div>

        {/* content + chat panel */}
        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "36px 40px 80px", minWidth: 0 }}>
            <div key={active} className="tab-content">
              {tabs[active]}
            </div>
          </div>

          {chatOpen && (
           <ChatPanel
             key={active}
             tabId={active}
             systemPrompt={active === "professors" ? getProfessorSystemPrompt() : activeNav?.systemPrompt}
             onClose={() => setChatOpen(false)}
            />
          )}
        </div>
      </div>

      {/* floating Ask AI button */}
        {/* floating Ask AI button — only show when chat is closed */}
{!chatOpen && (
  <button className="ask-ai-btn" onClick={() => setChatOpen(true)}
    style={{
      position: "fixed", bottom: 28, right: 28, zIndex: 100,
      display: "flex", alignItems: "center", gap: 8,
      background: "#ea580c",
      border: "none", borderRadius: 50,
      padding: "13px 22px", color: "#fff",
      fontSize: 14, fontWeight: 700,
      cursor: "pointer", fontFamily: "inherit",
      transition: "all 0.2s",
      boxShadow: "0 4px 20px rgba(234,88,12,0.35)",
    }}>
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
    Ask AI
    {chatHistories[active]?.length > 0 && (
      <span style={{ background: "rgba(255,255,255,0.3)", borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>
        {chatHistories[active].filter(m => m.role === "user").length}
      </span>
    )}
  </button>
)}
    </div>
  );
}
const getProfessorSystemPrompt = () => {
  if (!professorContext) return "You are an academic advisor helping students find PhD and Master's supervisors. Give advice on cold emailing strategies, how to find research fit, what to include in emails, and how to follow up professionally. Always be concise and direct — no filler, no pleasantries, straight to the point. IMPORTANT: Never answer questions about specific professors by name unless they are provided to you in this system prompt. If asked about a professor not listed here, direct the user to their faculty page or Google Scholar.";

  const { university, field, degree, professors, selectedProfessor } = professorContext;

  let prompt = `You are an academic advisor. The student is looking for ${degree} supervisors at ${university} in ${field}.`;

  if (professors?.length > 0) {
    prompt += `\n\nProfessors found:\n${professors.map(p =>
      `- ${p.name} (${p.title}, ${p.department}): ${p.researchFocus}. Email: ${p.email}. Recent work: ${p.recentWork}. Ratings — Research Activity: ${p.ratings?.researchActivity}/10, Supervision: ${p.ratings?.supervisionHistory}/10, Publications: ${p.ratings?.publicationCount}/10, Behaviour: ${p.ratings?.behaviourCooperation}/10, Accessibility: ${p.ratings?.accessibility}/10, Funding: ${p.ratings?.fundingAvailability}/10.`
    ).join("\n")}`;
  }

  if (selectedProfessor) {
    prompt += `\n\nThe student has selected ${selectedProfessor.name} as their focus. Answer questions specifically about contacting and working with this professor based on the data above. Do not invent information beyond what is provided.`;
  }

  prompt += `\n\nIMPORTANT: Only discuss professors listed above. For any professor not in this list, say you don't have verified data and direct the user to their faculty page. Always be concise and direct — no filler sentences, no restating the question, no "Great question!" or "I hope this helps!". Get straight to the answer in as few words as possible.`;

  return prompt;
};