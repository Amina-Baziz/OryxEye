import { useState, useEffect } from "react";
import QuizSection from "../components/QuizSection";

export default function DailyPage({ saveResult, showToast }) {
  const [daily,   setDaily]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);

  const loadDaily = async () => {
    setLoading(true);
    setShowQuiz(false);
    try {
      const res  = await fetch("http://localhost:4000/daily");
      const data = await res.json();
      setDaily(data);
    } catch {
      showToast("Could not load daily challenge", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDaily(); }, []);

  return (
    <div className="daily-card">
      <div className="daily-header">
        <div className="daily-date">⭐ {new Date().toDateString()}</div>
        <h2>Daily Nature Challenge</h2>
      </div>

      {loading ? (
        <div className="center-loading">
          <span className="loading-dots"><span /><span /><span /></span>
          <p>Loading today's creature...</p>
        </div>
      ) : daily ? (
        !showQuiz ? (
          <>
            <div className="daily-creature">
              <div className="daily-emoji">{daily.emoji}</div>
              <div className="species-badge">{daily.category}</div>
              <div className="species-name">{daily.creature}</div>
              <div className="daily-habitat">📍 {daily.habitat}</div>
            </div>
            <div className="lesson-box"><h4>📖 Today's Lesson</h4><p>{daily.lesson}</p></div>
            <div className="fact-box"><h4>🌟 Fun Fact</h4><p>{daily.funFact}</p></div>
            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn-quiz" style={{ flex: 1 }} onClick={() => setShowQuiz(true)}>
                🧩 Take the Quiz!
              </button>
              <button className="btn-retry" onClick={loadDaily}>🔄 New</button>
            </div>
          </>
        ) : (
          <>
            <h3 style={{ fontFamily: "'Fredoka One',cursive", marginBottom: 16, color: "#1a1a2e" }}>
              🧩 Quiz: {daily.creature}
            </h3>
            <QuizSection
              quiz={daily.quiz}
              onFinish={(score, total) => {
                saveResult(daily.creature, daily.category, daily.emoji, score, total);
                setShowQuiz(false);
                setDaily(null);
                loadDaily();
              }}
            />
          </>
        )
      ) : (
        <button className="btn-primary" onClick={loadDaily}>Load Today's Challenge 🌿</button>
      )}
    </div>
  );
}