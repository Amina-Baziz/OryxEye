export default function JournalPage({ journal }) {
  return (
    <div className="journal-card">
      <h2>📓 My Discovery Journal</h2>
      <p className="subtitle">
        {journal.length > 0 ? `${journal.length} discoveries so far!` : "No discoveries yet — go explore! 📷"}
      </p>

      {journal.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#aaa" }}>
          <div style={{ fontSize: 64 }}>📷</div>
          <p style={{ marginTop: 12, fontWeight: 700 }}>
            Upload a photo or try the Daily Challenge to start your journal!
          </p>
        </div>
      ) : (
        <div className="journal-grid">
          {journal.map((item, i) => (
            <div key={i} className="journal-item">
              <div className="journal-emoji">{item.emoji}</div>
              <div className="journal-name">{item.name}</div>
              <div className="journal-cat">{item.category}</div>
              <div className="journal-date">{item.date}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}