import { useState } from "react";
import QuizSection from "../components/QuizSection";

export default function DiscoverPage({ loggedInUser, saveResult, showToast }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl,    setPreviewUrl]    = useState(null);
  const [result,        setResult]        = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [loadingMsg,    setLoadingMsg]    = useState("");
  const [showQuiz,      setShowQuiz]      = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setShowQuiz(false);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage) return;
    setLoading(true);
    try {
      // Step 1 — Classify image
      setLoadingMsg("🔍 Identifying plant...");
      const formData = new FormData();
      formData.append("image", selectedImage);
      const classifyRes  = await fetch("http://localhost:4000/classify", { method: "POST", body: formData });
      const classifyData = await classifyRes.json();
      if (!classifyData.results) throw new Error("Classification failed");

      const topResult = classifyData.results[0];

      // Step 2 — Ask GROQ for full info
      setLoadingMsg("🧠 Learning about it...");
      const quizRes  = await fetch("http://localhost:4000/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ speciesName: topResult.name, category: "plant" })
      });
      const quizData = await quizRes.json();

      setResult({ ...quizData, confidence: topResult.confidence });

    } catch (err) {
      console.log("Error:", err);
      showToast("Analysis failed — try again!", "error");
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  };

  const reset = () => {
    setResult(null);
    setPreviewUrl(null);
    setSelectedImage(null);
    setShowQuiz(false);
  };

  if (result) {
    return (
      <div className="result-card">
        {!showQuiz ? (
          <>
            <div className="species-header">
              <div className="species-badge">🌿 Plant</div>
              <div className="species-name">{result.speciesName}</div>
            </div>

            <div className="info-grid">
              <div className="info-tile">
                <span className="tile-icon">🏠</span>
                <div className="tile-label">Habitat</div>
                <div className="tile-value">{result.habitat || "—"}</div>
              </div>
              <div className="info-tile">
                <span className="tile-icon">🍽️</span>
                <div className="tile-label">Diet</div>
                <div className="tile-value">{result.diet || "—"}</div>
              </div>
              <div className="info-tile">
                <span className="tile-icon">📍</span>
                <div className="tile-label">Region</div>
                <div className="tile-value">{result.region || "—"}</div>
              </div>
              <div className="info-tile">
                <span className="tile-icon">🔬</span>
                <div className="tile-label">Type</div>
                <div className="tile-value">{result.type || "Plant"}</div>
              </div>
            </div>

            {result.lesson  && (
              <div className="lesson-box">
                <h4>📖 Fun Lesson</h4>
                <p>{result.lesson}</p>
              </div>
            )}

            {result.funFact && (
              <div className="fact-box">
                <h4>🌟 Did You Know?</h4>
                <p>{result.funFact}</p>
              </div>
            )}

            <div className="result-actions">
              {result.quiz && (
                <button className="btn-quiz" onClick={() => setShowQuiz(true)}>
                  🧩 Take the Quiz!
                </button>
              )}
              <button className="btn-retry" onClick={reset}>🔄 New Photo</button>
            </div>
          </>
        ) : (
          <>
            <h3 style={{ fontFamily: "'Fredoka One',cursive", marginBottom: 16, color: "#1a1a2e" }}>
              🧩 Quiz: {result.speciesName}
            </h3>
            <QuizSection
              quiz={result.quiz}
              onFinish={(score, total) => {
                saveResult(result.speciesName, "plant", "🌿", score, total);
                reset();
              }}
            />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="upload-card">
      <h2>🔍 Discover Nature!</h2>
      <p className="subtitle">Take a photo of any plant, animal, or insect to learn about it</p>
      {!previewUrl ? (
        <div className="upload-zone">
          <input type="file" accept="image/*" onChange={handleFileChange} />
          <span className="upload-icon">📷</span>
          <p>Tap to upload a photo</p>
          <small>JPG, PNG, WEBP supported</small>
        </div>
      ) : (
        <>
          <img src={previewUrl} alt="Preview" className="preview-img" />
          <button className="btn-analyze" onClick={handleAnalyze} disabled={loading}>
            {loading
              ? <><span className="loading-dots"><span /><span /><span /></span> {loadingMsg}</>
              : "🧠 Analyze Image!"}
          </button>
          {!loading && (
            <button className="btn-retry" style={{ marginTop: 12, width: "100%" }}
              onClick={() => { setPreviewUrl(null); setSelectedImage(null); }}>
              Choose Different Photo
            </button>
          )}
        </>
      )}
    </div>
  );
}