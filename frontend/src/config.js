// API key removed - now handled by backend
export const GROQ_URL = "/api/chat";
export const GROQ_MODEL = "llama-3.3-70b-versatile";

export function groqError(data) {
  if (!data?.error) return null;
  return typeof data.error === "string" ? data.error : data.error.message || "AI request failed";
}

export const warm = {
  nextBtn: { background: "#ea580c", border: "none", borderRadius: 10, padding: "11px 24px", fontSize: 14, fontWeight: 600, color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "inherit", transition: "all 0.15s" },
  ghostBtn: { background: "#fff", border: "1px solid #ede8df", borderRadius: 10, padding: "9px 18px", fontSize: 13, color: "#78716c", cursor: "pointer", fontFamily: "inherit" },
  backBtn: { background: "transparent", border: "1px solid #ede8df", borderRadius: 10, padding: "10px 20px", fontSize: 13, color: "#a8a29e", cursor: "pointer", fontFamily: "inherit" },
  input: { width: "100%", border: "1.5px solid #ede8df", borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "#1c1917", fontFamily: "inherit", background: "#fafaf9", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" },
  label: { display: "block", fontSize: 12, fontWeight: 600, color: "#78716c", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" },
  secLabel: { fontSize: 10, color: "#a8a29e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 },
  cardLabel: { fontSize: 11, fontWeight: 700, color: "#78716c", textTransform: "uppercase", letterSpacing: "0.06em" },
  applyBtn: { display: "inline-flex", alignItems: "center", gap: 8, background: "#ea580c", borderRadius: 8, padding: "10px 18px", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none" },
};
