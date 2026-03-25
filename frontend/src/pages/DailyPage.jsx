import { useState, useEffect } from "react";
import QuizSection from "../components/QuizSection";

export default function DailyPage({ loggedInUser, saveResult, showToast }) {
  const [daily,      setDaily]      = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [showQuiz,   setShowQuiz]   = useState(false);
  const [image,      setImage]      = useState(null);
  const [imgLoading, setImgLoading] = useState(false);

  const fetchWikiImage = async (creatureName) => {
    setImgLoading(true);
    try {
      // Try iNaturalist first
      const inatRes = await fetch(
        `https://api.inaturalist.org/v1/taxa/autocomplete?q=${encodeURIComponent(creatureName)}&per_page=1`
      );
      const inatData = await inatRes.json();
      const taxon = inatData.results?.[0];
      if (taxon?.default_photo?.medium_url) {
        setImage(taxon.default_photo.medium_url);
        setImgLoading(false);
        return;
      }

      // Try Wikipedia second
      const wikiRes = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(creatureName)}`
      );
      const wikiData = await wikiRes.json();
      if (wikiData.thumbnail?.source) {
        setImage(wikiData.thumbnail.source);
        setImgLoading(false);
        return;
      }

      // Try Wikimedia search as last resort
      const searchRes = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(creatureName)}&prop=pageimages&format=json&pithumbsize=300&origin=*`
      );
      const searchData = await searchRes.json();
      const pages = searchData.query?.pages;
      const page = pages ? Object.values(pages)[0] : null;
      if (page?.thumbnail?.source) {
        setImage(page.thumbnail.source);
      } else {
        setImage(null);
      }
    } catch {
      setImage(null);
    } finally {
      setImgLoading(false);
    }
  };

  const loadDaily = async () => {
    setLoading(true);
    setImgLoading(true);
    setShowQuiz(false);
    setImage(null);
    try {
      const res  = await fetch(`http://localhost:4000/daily?username=${loggedInUser}`);
      const data = await res.json();
      setDaily(data);
      fetchWikiImage(data.creature);
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
            <div className="daily-creature" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>

              {/* Image or emoji — no flicker */}
              {imgLoading ? (
                <div style={{
                  width: 160, height: 160, borderRadius: "50%",
                  background: "#e8f5e9", display: "flex",
                  alignItems: "center", justifyContent: "center",
                  fontSize: 48, border: "4px solid #a8e6cf"
                }}>
                  🌿
                </div>
              ) : image ? (
                <img
                  src={image}
                  alt={daily.creature}
                  style={{
                    width: 160, height: 160, objectFit: "cover",
                    borderRadius: "50%", border: "4px solid #a8e6cf",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.12)"
                  }}
                />
              ) : (
                <div className="daily-emoji">{daily.emoji}</div>
              )}

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