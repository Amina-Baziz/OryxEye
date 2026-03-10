const COLORS = ["#0a9d8a","#ffb300","#4caf50","#7c4dff","#f4511e","#e91e63"];

export default function DashboardPage({ dashData, dashLoading }) {
  return (
    <div className="dashboard-card">
      <h2>📊 My Progress</h2>
      <p className="subtitle">Keep exploring to grow your stats!</p>

      {dashLoading ? (
        <div className="center-loading">
          <span className="loading-dots"><span /><span /><span /></span>
          <p>Loading your progress...</p>
        </div>
      ) : !dashData || dashData.totalQuizzes === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#aaa" }}>
          <div style={{ fontSize: 64 }}>🌱</div>
          <p style={{ marginTop: 12, fontWeight: 700 }}>No progress yet! Complete a quiz to see your stats.</p>
        </div>
      ) : (
        <>
          {/* STAT TILES */}
          <div className="stats-grid">
            <div className="stat-tile teal">
              <div className="stat-num">{dashData.totalDiscoveries}</div>
              <div className="stat-label">Discoveries</div>
            </div>
            <div className="stat-tile yellow">
              <div className="stat-num">{dashData.totalQuizzes}</div>
              <div className="stat-label">Quizzes Done</div>
            </div>
            <div className="stat-tile purple">
              <div className="stat-num">{dashData.accuracy}%</div>
              <div className="stat-label">Accuracy</div>
            </div>
            <div className="stat-tile green">
              <div className="stat-num">{dashData.streak}🔥</div>
              <div className="stat-label">Day Streak</div>
            </div>
          </div>

          {/* CATEGORY BARS */}
          {dashData.categories?.length > 0 && (
            <div className="progress-section">
              <h4>📈 Score by Category</h4>
              {dashData.categories.map((c, i) => (
                <div key={i} className="progress-row">
                  <span className="progress-label">{c.label}</span>
                  <div className="progress-track">
                    <div className="progress-fill"
                      style={{ width: `${c.pct}%`, background: COLORS[i % COLORS.length] }} />
                  </div>
                  <span className="progress-pct">{c.pct}%</span>
                </div>
              ))}
            </div>
          )}

          {/* WEAKEST AREA */}
          {dashData.weakest && (
            <div className="weak-spot">
              <h4>⚠️ Needs Practice</h4>
              <p>You struggle most with <strong>{dashData.weakest.label}</strong> ({dashData.weakest.pct}% accuracy). Try the Daily Challenge to improve!</p>
            </div>
          )}

          {/* BADGES */}
          <div className="badges-section">
            <h4>🏅 Badges Earned</h4>
            <div className="badges-row">
              <div className={`badge ${dashData.totalDiscoveries >= 1  ? "earned" : "locked"}`}>🦎<span>First Find</span></div>
              <div className={`badge ${dashData.totalQuizzes >= 5      ? "earned" : "locked"}`}>🏆<span>Quiz Master</span></div>
              <div className={`badge ${dashData.streak >= 3            ? "earned" : "locked"}`}>🔥<span>3-Day Streak</span></div>
              <div className={`badge ${dashData.totalDiscoveries >= 10 ? "earned" : "locked"}`}>🌍<span>10 Species</span></div>
              <div className={`badge ${dashData.accuracy >= 80         ? "earned" : "locked"}`}>⭐<span>Star Learner</span></div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}