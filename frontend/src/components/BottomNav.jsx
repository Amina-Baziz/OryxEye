export default function BottomNav({ active, setView }) {
  const tabs = [
    { id: "upload",    icon: "📷", label: "Discover" },
    { id: "chatbot",   icon: "🤖", label: "Ask Oryx" },
    { id: "daily",     icon: "🌟", label: "Daily" },
    { id: "guess",     icon: "🕵️", label: "Guess" },
    { id: "journal",   icon: "📓", label: "Journal" },
    { id: "dashboard", icon: "📊", label: "Progress" },
  ];
  return (
    <nav className="bottom-nav">
      {tabs.map(t => (
        <button
          key={t.id}
          className={`nav-tab ${active === t.id ? "active" : ""}`}
          onClick={() => setView(t.id)}
        >
          <span className="nav-icon">{t.icon}</span>
          <span className="nav-label">{t.label}</span>
        </button>
      ))}
    </nav>
  );
}