import { useState, useEffect, useRef } from "react";

export default function ChatbotPage() {
  const [messages, setMessages] = useState([
    { from: "oryx", text: "Hi! I'm Oryx 🐾 Ask me anything about animals" }
  ]);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleChat = async () => {
    if (!input.trim()) return;
    const question = input.trim();
    setMessages(prev => [...prev, { from: "kid", text: question }]);
    setInput("");
    setLoading(true);
    try {
      const res  = await fetch("http://localhost:4000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history }),
      });
      const data = await res.json();
      const answer = data.answer || "Hmm, try again!";
      setMessages(prev => [...prev, { from: "oryx", text: answer }]);
      setHistory(prev => [
        ...prev,
        { role: "user",      content: question },
        { role: "assistant", content: answer   }
      ]);
    } catch {
      setMessages(prev => [...prev, { from: "oryx", text: "Oops! Make sure the server is running!" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-card">
      <div className="chat-header">
        <span className="chat-avatar">🐾</span>
        <div>
          <div className="chat-name">Oryx</div>
          <div className="chat-sub">Your nature guide</div>
        </div>
      </div>
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble ${msg.from}`}>
            {msg.from === "oryx" && <span className="bubble-avatar">🐾</span>}
            <div className="bubble-text">{msg.text}</div>
          </div>
        ))}
        {loading && (
          <div className="chat-bubble oryx">
            <span className="bubble-avatar">🐾</span>
            <div className="bubble-text">
              <span className="loading-dots"><span /><span /><span /></span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="chat-input-row">
        <input
          className="chat-input"
          placeholder="Ask about any animal or insect..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleChat()}
        />
        <button className="chat-send" onClick={handleChat} disabled={loading}>➤</button>
      </div>
    </div>
  );
}