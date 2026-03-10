import { useState } from "react";

export default function QuizSection({ quiz, onFinish }) {
  const [current, setCurrent]   = useState(0);
  const [selected, setSelected] = useState(null);
  const [scores, setScores]     = useState([]);
  const [done, setDone]         = useState(false);

  if (!quiz || quiz.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "20px" }}>
        <p style={{ color: "#888", fontWeight: 600 }}>Quiz not available yet. Try again! 🌿</p>
        <button className="btn-primary" style={{ marginTop: 12 }} onClick={onFinish}>Go Back</button>
      </div>
    );
  }

  const handleAnswer = (option) => {
    if (selected !== null) return;
    setSelected(option);
    setScores(prev => [...prev, option === quiz[current].answer]);
  };

  const handleNext = () => {
    if (current + 1 >= quiz.length) {
      setDone(true);
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
    }
  };

  if (done) {
    const total = scores.filter(Boolean).length;
    const pct   = Math.round((total / quiz.length) * 100);
    return (
      <div className="quiz-done">
        <div className="quiz-done-emoji">{pct >= 80 ? "🏆" : pct >= 50 ? "⭐" : "💪"}</div>
        <h3>{pct >= 80 ? "Amazing!" : pct >= 50 ? "Good job!" : "Keep practicing!"}</h3>
        <p>You got <strong>{total}/{quiz.length}</strong> correct ({pct}%)</p>
        <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => onFinish(total, quiz.length)}>
          Continue Exploring 🌿
        </button>
      </div>
    );
  }

  const q = quiz[current];
  return (
    <div className="quiz-section">
      <div className="quiz-progress">
        Question {current + 1} of {quiz.length}
        <div className="quiz-bar">
          <div className="quiz-bar-fill" style={{ width: `${(current / quiz.length) * 100}%` }} />
        </div>
      </div>
      <p className="quiz-question">{q.question}</p>
      <div className="quiz-options">
        {q.options.map((opt, i) => {
          let cls = "quiz-option";
          if (selected !== null) {
            if (opt === q.answer)      cls += " correct";
            else if (opt === selected) cls += " wrong";
          }
          return (
            <button key={i} className={cls} onClick={() => handleAnswer(opt)}>{opt}</button>
          );
        })}
      </div>
      {selected !== null && (
        <button className="btn-primary" style={{ marginTop: 16, width: "100%" }} onClick={handleNext}>
          {current + 1 >= quiz.length ? "See Results 🏆" : "Next Question →"}
        </button>
      )}
    </div>
  );
}