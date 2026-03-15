import { useState, useEffect } from "react";

export default function GuessPage({ showToast }) {
  const [game,       setGame]       = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [clueIndex,  setClueIndex]  = useState(0);
  const [guess,      setGuess]      = useState("");
  const [gameResult, setGameResult] = useState(null);
  const [revealed,   setRevealed]   = useState(false);
  const [checking,   setChecking]   = useState(false);

  const loadGame = async () => {
    setLoading(true);
    setGame(null);
    setClueIndex(0);
    setGuess("");
    setGameResult(null);
    setRevealed(false);
    try {
      const res  = await fetch("http://localhost:4000/guess/new?t=" + Date.now());
      const data = await res.json();
      if (!data.clues || !Array.isArray(data.clues)) throw new Error("Invalid game data");
      setGame(data);
    } catch {
      showToast("Could not load game", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadGame(); }, []);

  const handleGuess = async () => {
    if (!guess.trim() || !game || checking) return;
    setChecking(true);
    try {
      const res  = await fetch("http://localhost:4000/check-guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guess: guess.trim(), answer: game.answer })
      });
      const data = await res.json();
      setGameResult(data.correct ? "correct" : "wrong");
      if (!data.correct) setGuess("");
    } catch {
      showToast("Could not check guess", "error");
    } finally {
      setChecking(false);
    }
  };

  const clues = game?.clues || [];

  return (
    <div className="guess-card">
      <h2 className="guess-title">Guess What I Am!</h2>
      {game && !loading && (
        <div style={{
          textAlign: "center",
          fontSize: "16px",
          fontWeight: "700",
          color: "#0a9d8a",
          marginBottom: "16px",
          padding: "10px 16px",
          background: "linear-gradient(135deg, #e0f7f4, #f0fff4)",
          borderRadius: "12px",
          border: "2px solid #b2dfdb"
        }}>
          {game.question || "Can you guess what I am?"}
        </div>
      )}

      {loading ? (
        <div className="center-loading">
          <span className="loading-dots"><span /><span /><span /></span>
          <p>Preparing clues...</p>
        </div>
      ) : game ? (
        <>
          <div className="clues-area">
            {clues.slice(0, clueIndex + 1).map((clue, i) => (
              <div key={i} className={`clue-card clue-${i}`}>
                <span className="clue-num">Clue {i + 1}</span>
                <p>{clue}</p>
              </div>
            ))}
          </div>

          {!gameResult && !revealed && (
            <>
              {clueIndex < clues.length - 1 && (
                <button className="btn-secondary" style={{ width: "100%", marginBottom: 12 }}
                  onClick={() => setClueIndex(c => c + 1)}>
                  Next Clue
                </button>
              )}
              <div className="guess-input-row">
                <input className="chat-input" placeholder="Type your guess..."
                  value={guess} onChange={e => setGuess(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleGuess()} />
                <button className="chat-send" onClick={handleGuess} disabled={checking}>
                  {checking ? "..." : "Submit"}
                </button>
              </div>
              <button className="btn-retry" style={{ width: "100%", marginTop: 10 }}
                onClick={() => setRevealed(true)}>
                Give up? Reveal answer
              </button>
            </>
          )}

          {gameResult === "wrong" && !revealed && (
            <div className="game-result wrong" style={{ marginBottom: 12 }}>
              <p>Not quite! Try again or get another clue.</p>
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                {clueIndex < clues.length - 1 && (
                  <button className="btn-secondary" style={{ flex: 1 }}
                    onClick={() => { setGameResult(null); setClueIndex(c => c + 1); }}>
                    Next Clue
                  </button>
                )}
                <div className="guess-input-row" style={{ flex: 2 }}>
                  <input className="chat-input" placeholder="Try again..."
                    value={guess} onChange={e => setGuess(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleGuess()} />
                  <button className="chat-send" onClick={handleGuess} disabled={checking}>
                    {checking ? "..." : "Submit"}
                  </button>
                </div>
              </div>
              <button className="btn-retry" style={{ width: "100%", marginTop: 10 }}
                onClick={() => setRevealed(true)}>
                Give up? Reveal answer
              </button>
            </div>
          )}

          {gameResult === "correct" && (
            <div className="game-result correct">
              <div style={{ fontSize: 48 }}>Correct!</div>
              <h3>It is the {game.answer} {game.emoji}</h3>
              <div className="fact-box" style={{ marginTop: 12 }}>
                <h4>Fun Fact</h4><p>{game.funFact}</p>
              </div>
              <button className="btn-primary" style={{ marginTop: 12 }} onClick={loadGame}>Play Again</button>
            </div>
          )}

          {revealed && (
            <div className="game-result correct">
              <div style={{ fontSize: 48 }}>{game.emoji}</div>
              <h3>It was the {game.answer}!</h3>
              <div className="fact-box" style={{ marginTop: 12 }}>
                <h4>Fun Fact</h4><p>{game.funFact}</p>
              </div>
              <button className="btn-primary" style={{ marginTop: 12 }} onClick={loadGame}>Play Again</button>
            </div>
          )}
        </>
      ) : (
        <button className="btn-primary" onClick={loadGame}>Start Game</button>
      )}
    </div>
  );
}
