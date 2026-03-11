import { useState, useEffect } from "react";

export default function GuessPage({ showToast }) {
  const [game,       setGame]       = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [clueIndex,  setClueIndex]  = useState(0);
  const [guess,      setGuess]      = useState("");
  const [gameResult, setGameResult] = useState(null);
  const [revealed,   setRevealed]   = useState(false);

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
      setGame(data);
    } catch {
      showToast("Could not load game", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadGame(); }, []);

  const handleGuess = () => {
    if (!guess.trim() || !game) return;
    const correct = guess.trim().toLowerCase() === game.answer.toLowerCase();
    setGameResult(correct ? "correct" : "wrong");
    if (!correct) setGuess("");
  };

  return (
    <div className="guess-card">
      <h2 className="guess-title">🕵️ Guess What I Am!</h2>

      {loading ? (
        <div className="center-loading">
          <span className="loading-dots"><span /><span /><span /></span>
          <p>Preparing clues...</p>
        </div>
      ) : game ? (
        <>
          <div className="clues-area">
            {(game.clues || []).slice(0, clueIndex + 1).map((clue, i) => (
              <div key={i} className={`clue-card clue-${i}`}>
                <span className="clue-num">Clue {i + 1}</span>
                <p>{clue}</p>
              </div>
            ))}
          </div>

          {/* No result yet */}
          {!gameResult && !revealed && (
            <>
              {clueIndex < game.clues.length - 1 && (
                <button className="btn-secondary" style={{ width: "100%", marginBottom: 12 }}
                  onClick={() => setClueIndex(c => c + 1)}>
                  Next Clue 👀
                </button>
              )}
              <div className="guess-input-row">
                <input className="chat-input" placeholder="Type your guess..."
                  value={guess} onChange={e => setGuess(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleGuess()} />
                <button className="chat-send" onClick={handleGuess}>➤</button>
              </div>
              <button className="btn-retry" style={{ width: "100%", marginTop: 10 }}
                onClick={() => setRevealed(true)}>
                Give up? Reveal answer 🙈
              </button>
            </>
          )}

          {/* Wrong guess */}
          {gameResult === "wrong" && !revealed && (
            <div className="game-result wrong" style={{ marginBottom: 12 }}>
              <p>❌ Not quite! Try again or get another clue.</p>
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                {clueIndex < game.clues.length - 1 && (
                  <button className="btn-secondary" style={{ flex: 1 }}
                    onClick={() => { setGameResult(null); setClueIndex(c => c + 1); }}>
                    Next Clue 👀
                  </button>
                )}
                <div className="guess-input-row" style={{ flex: 2 }}>
                  <input className="chat-input" placeholder="Try again..."
                    value={guess} onChange={e => setGuess(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleGuess()} />
                  <button className="chat-send" onClick={() => { setGameResult(null); handleGuess(); }}>➤</button>
                </div>
              </div>
              <button className="btn-retry" style={{ width: "100%", marginTop: 10 }}
                onClick={() => setRevealed(true)}>
                Give up? Reveal answer 🙈
              </button>
            </div>
          )}

          {/* Correct */}
          {gameResult === "correct" && (
            <div className="game-result correct">
              <div style={{ fontSize: 48 }}>🎉</div>
              <h3>Correct! It's the {game.answer} {game.emoji}</h3>
              <div className="fact-box" style={{ marginTop: 12 }}>
                <h4>🌟 Fun Fact</h4><p>{game.funFact}</p>
              </div>
              <button className="btn-primary" style={{ marginTop: 12 }} onClick={loadGame}>Play Again 🔄</button>
            </div>
          )}

          {/* Revealed */}
          {revealed && (
            <div className="game-result correct">
              <div style={{ fontSize: 48 }}>{game.emoji}</div>
              <h3>It was the {game.answer}!</h3>
              <div className="fact-box" style={{ marginTop: 12 }}>
                <h4>🌟 Fun Fact</h4><p>{game.funFact}</p>
              </div>
              <button className="btn-primary" style={{ marginTop: 12 }} onClick={loadGame}>Play Again 🔄</button>
            </div>
          )}
        </>
      ) : (
        <button className="btn-primary" onClick={loadGame}>Start Game 🕵️</button>
      )}
    </div>
  );
}