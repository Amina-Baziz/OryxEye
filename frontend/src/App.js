import { useState, useEffect } from "react";
import "./App.css";

import Toast        from "./components/Toast";
import BottomNav    from "./components/BottomNav";
import LandingPage  from "./pages/LandingPage";
import DiscoverPage from "./pages/DiscoverPage";
import ChatbotPage  from "./pages/ChatbotPage";
import DailyPage    from "./pages/DailyPage";
import GuessPage    from "./pages/GuessPage";
import JournalPage  from "./pages/JournalPage";
import DashboardPage from "./pages/DashboardPage";

export default function App() {
  const [view,         setView]         = useState("landing");
  const [appView,      setAppView]      = useState(() => localStorage.getItem("oryxeye_view") || "dashboard");
  const [username,     setUsername]     = useState("");
  const [password,     setPassword]     = useState("");
  const [email,        setEmail]        = useState("");
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [toast,        setToast]        = useState({ message: "", type: "" });

  const [journal,    setJournal]    = useState([]);
  const [dashData,   setDashData]   = useState(null);
  const [dashLoading,setDashLoading]= useState(false);

  // ── RESTORE SESSION ON REFRESH ────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("oryxeye_user");
    if (saved) {
      const user = JSON.parse(saved);
      setLoggedInUser(user);
      setView("app");
      // Load progress immediately
      setDashLoading(true);
      fetch(`http://localhost:4000/progress/${user.username}`)
        .then(r => r.json())
        .then(data => {
          setJournal(data.discoveries || []);
          setDashData(data);
        })
        .catch(console.error)
        .finally(() => setDashLoading(false));
    }
  }, []);

  const handleSetAppView = (view) => {
    setAppView(view);
    localStorage.setItem("oryxeye_view", view);
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "" }), 3000);
  };

  useEffect(() => {
    if ((appView === "journal" || appView === "dashboard") && loggedInUser) {
      loadProgress();
    }
    // eslint-disable-next-line
  }, [appView]);

  const loadProgress = async () => {
    if (!loggedInUser) return;
    setDashLoading(true);
    try {
      const res  = await fetch(`http://localhost:4000/progress/${loggedInUser.username}`);
      const data = await res.json();
      setJournal(data.discoveries || []);
      setDashData(data);
    } catch (err) {
      console.error("Progress error:", err);
    } finally {
      setDashLoading(false);
    }
  };

  const saveResult = async (speciesName, category, emoji, quizScore, totalQuestions) => {
    if (!loggedInUser) return;
    try {
      await fetch("http://localhost:4000/save-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loggedInUser.username, speciesName, category, emoji, quizScore, totalQuestions }),
      });
      await loadProgress();
    } catch (err) { console.error("Save error:", err); }
  };

  // ── AUTH ──────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res  = await fetch("http://localhost:4000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.user) {
        setLoggedInUser(data.user);
        localStorage.setItem("oryxeye_user", JSON.stringify(data.user));
        setView("app");
        showToast(`Welcome, ${data.user.username}! 🌿`, "success");
      } else {
        showToast(data.error || "Login failed", "error");
      }
    } catch {
      showToast("Server not running?", "error");
    }
  };

  const validatePassword = (pwd) => {
    const rules = [
      { test: pwd.length >= 8,          msg: "At least 8 characters" },
      { test: /[A-Z]/.test(pwd),        msg: "At least one uppercase letter" },
      { test: /[a-z]/.test(pwd),        msg: "At least one lowercase letter" },
      { test: /[0-9]/.test(pwd),        msg: "At least one number" },
      { test: /[!@#$%^&*()_+\-=]/.test(pwd), msg: "At least one special character (!@#$%...)" },
    ];
    return rules.filter(r => !r.test).map(r => r.msg);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    const errors = validatePassword(password);
    if (errors.length > 0) { showToast(errors[0], "error"); return; }
    try {
      const res  = await fetch("http://localhost:4000/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, email }),
      });
      const data = await res.json();
      showToast(data.message || "Account created!", "success");
      setView("login");
    } catch {
      showToast("Signup failed", "error");
    }
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    localStorage.removeItem("oryxeye_user");
    localStorage.removeItem("oryxeye_view");
    setView("login");
    setAppView("dashboard");
    setUsername(""); setPassword("");
  };

  // ── LANDING ───────────────────────────────────────────────
  if (view === "landing") return <LandingPage toast={toast} setView={setView} />;

  // ── LOGIN ─────────────────────────────────────────────────
  if (view === "login") return (
    <div className="oryxeye-root">
      <div className="blob blob-1" /><div className="blob blob-2" /><div className="blob blob-3" />
      <Toast message={toast.message} type={toast.type} />
      <div className="page-center">
        <div className="logo-area">
          <span className="logo-emoji">🐾</span>
          <div className="logo-title">ORYXEYE</div>
          <div className="logo-sub">Nature Explorer for Kids</div>
        </div>
        <div className="card">
          <h2>👋 Welcome Back!</h2>
          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label>Username</label>
              <input type="text" placeholder="Enter your username"
                value={username} onChange={e => setUsername(e.target.value)} required />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input type="password" placeholder="Enter your password"
                value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn-primary">Sign In 🚀</button>
          </form>
          <p className="switch-text">No account?{" "}
            <span className="switch-link" onClick={() => setView("signup")}>Create one!</span>
          </p>
          <p className="switch-text" style={{ marginTop: 8 }}>
            <span className="switch-link" onClick={() => setView("landing")}>← Back to home</span>
          </p>
        </div>
      </div>
    </div>
  );

  // ── SIGNUP ────────────────────────────────────────────────
  if (view === "signup") return (
    <div className="oryxeye-root">
      <div className="blob blob-1" /><div className="blob blob-2" /><div className="blob blob-3" />
      <Toast message={toast.message} type={toast.type} />
      <div className="page-center">
        <div className="logo-area">
          <span className="logo-emoji">🌿</span>
          <div className="logo-title">ORYXEYE</div>
          <div className="logo-sub">Nature Explorer for Kids</div>
        </div>
        <div className="card">
          <h2>🌟 Join ORYXEYE!</h2>
          <form onSubmit={handleSignup}>
            <div className="input-group">
              <label>Username</label>
              <input type="text" placeholder="Pick a cool username"
                value={username} onChange={e => setUsername(e.target.value)} required />
            </div>
            <div className="input-group">
              <label>Email</label>
              <input type="email" placeholder="Your email address"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input type="password" placeholder="Create a password"
                value={password} onChange={e => setPassword(e.target.value)} required />
              {password.length > 0 && (
                <div className="pwd-rules">
                  {[
                    { test: password.length >= 8,               label: "8+ characters" },
                    { test: /[A-Z]/.test(password),             label: "Uppercase letter" },
                    { test: /[a-z]/.test(password),             label: "Lowercase letter" },
                    { test: /[0-9]/.test(password),             label: "Number" },
                    { test: /[!@#$%^&*()_+\-=]/.test(password),label: "Special character" },
                  ].map((r, i) => (
                    <div key={i} className={`pwd-rule ${r.test ? "pass" : "fail"}`}>
                      {r.test ? "✅" : "❌"} {r.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button type="submit" className="btn-primary">Create Account 🎉</button>
          </form>
          <p className="switch-text">Have an account?{" "}
            <span className="switch-link" onClick={() => setView("login")}>Sign in</span>
          </p>
          <p className="switch-text" style={{ marginTop: 8 }}>
            <span className="switch-link" onClick={() => setView("landing")}>← Back to home</span>
          </p>
        </div>
      </div>
    </div>
  );

  // ── MAIN APP ──────────────────────────────────────────────
  return (
    <div className="app-root">
      <div className="blob blob-1" /><div className="blob blob-2" />
      <Toast message={toast.message} type={toast.type} />

      <div className="topbar">
        <div className="topbar-logo"><span>🐾</span>ORYXEYE</div>
        <div className="topbar-user">
          {loggedInUser && <div className="user-badge">👤 {loggedInUser.username}</div>}
          <button className="btn-danger" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <BottomNav active={appView} setView={handleSetAppView} />

      <div className="app-content">
        {appView === "dashboard" && <DashboardPage dashData={dashData} dashLoading={dashLoading} />}
        {appView === "upload"    && <DiscoverPage  loggedInUser={loggedInUser} saveResult={saveResult} showToast={showToast} />}
        {appView === "chatbot"   && <ChatbotPage   />}
        {appView === "daily"     && <DailyPage     saveResult={saveResult} showToast={showToast} />}
        {appView === "guess"     && <GuessPage     showToast={showToast} />}
        {appView === "journal"   && <JournalPage   journal={journal} />}
      </div>
    </div>
  );
}