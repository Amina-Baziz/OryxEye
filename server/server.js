require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// ── GROQ SETUP ────────────────────────────────────────────────
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile"; // free, fast, reliable

async function askGroq(systemPrompt, userPrompt) {
  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.7,
      max_tokens: 500,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userPrompt }
      ]
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Groq API error");
  return data.choices[0].message.content.trim();
}

// ── SYSTEM PERSONA ────────────────────────────────────────────
const ORYX_PERSONA = `
You are Oryx, a friendly and enthusiastic nature guide for kids aged 6-12.
Rules you MUST follow:
- Always use very simple words a child can understand
- Keep answers fun, short, and exciting
- Use 1-2 relevant emojis per response
- Never use scary, violent, or sad facts
- Never talk about death or hunting in graphic detail
- If asked a casual greeting like "hi", "hello", "hey", respond warmly and invite them to ask a nature question
- Only redirect off-topic questions (like math, movies, games) to nature topics
- If asked anything clearly off-topic, say: "I only know about nature! Ask me about animals or plants 🌿"
- Always end with an encouraging phrase like "Great question!" or "You're a nature explorer!"
`;

// ── SIMPLE IN-MEMORY AUTH ─────────────────────────────────────
const users = [];

app.post("/signup", (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Missing fields" });
  if (users.find(u => u.username === username))
    return res.status(400).json({ error: "Username already taken" });
  users.push({ username, email, password });
  res.json({ message: `Account created! Welcome, ${username} 🌿` });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: "Wrong username or password" });
  res.json({ user: { username: user.username, email: user.email } });
});

// ── IN-MEMORY DATA STORE ─────────────────────────────────────
// { username: { discoveries: [], quizResults: [], streak: { lastDate, count } } }
const userData = {};

function getUser(username) {
  if (!userData[username]) {
    userData[username] = { discoveries: [], quizResults: [], streak: { lastDate: null, count: 0 } };
  }
  return userData[username];
}

// Save a discovery + quiz result
app.post("/save-result", (req, res) => {
  const { username, speciesName, category, emoji, quizScore, totalQuestions } = req.body;
  if (!username) return res.status(400).json({ error: "No username" });
  const u = getUser(username);

  // Add to journal
  u.discoveries.unshift({
    name: speciesName,
    category,
    emoji: emoji || "🌿",
    date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })
  });

  // Add quiz result
  u.quizResults.push({ category, score: quizScore, total: totalQuestions, date: new Date() });

  // Update streak
  const today = new Date().toDateString();
  if (u.streak.lastDate === today) {
    // already logged today, no change
  } else if (u.streak.lastDate === new Date(Date.now() - 86400000).toDateString()) {
    u.streak.count += 1; // consecutive day
    u.streak.lastDate = today;
  } else {
    u.streak.count = 1; // reset streak
    u.streak.lastDate = today;
  }

  res.json({ success: true });
});

// Get dashboard + journal data
app.get("/progress/:username", (req, res) => {
  const u = getUser(req.params.username);

  // Calculate accuracy per category
  const categoryStats = {};
  u.quizResults.forEach(r => {
    if (!categoryStats[r.category]) categoryStats[r.category] = { correct: 0, total: 0 };
    categoryStats[r.category].correct += r.score;
    categoryStats[r.category].total   += r.total;
  });

  const categories = Object.entries(categoryStats).map(([name, s]) => ({
    label: name.charAt(0).toUpperCase() + name.slice(1),
    pct: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0
  }));

  const totalCorrect = u.quizResults.reduce((a, r) => a + r.score, 0);
  const totalQs      = u.quizResults.reduce((a, r) => a + r.total, 0);
  const accuracy     = totalQs > 0 ? Math.round((totalCorrect / totalQs) * 100) : 0;

  const weakest = categories.sort((a, b) => a.pct - b.pct)[0];

  res.json({
    discoveries:  u.discoveries,
    totalDiscoveries: u.discoveries.length,
    totalQuizzes: u.quizResults.length,
    accuracy,
    streak: u.streak.count,
    categories,
    weakest: weakest || null
  });
});

// ═══════════════════════════════════════════════════════════════
// 1. CHATBOT
// ═══════════════════════════════════════════════════════════════
app.post("/chat", async (req, res) => {
  const { question } = req.body;
  if (!question) return res.status(400).json({ error: "No question provided" });

  const userPrompt = `
Here are examples of how you answer:

User: Why do camels have humps?
Oryx: Camels store fat in their humps, not water! 🐪 This fat gives them energy when food is hard to find in the desert. They are amazing desert survivors! Great question!

User: What do butterflies eat?
Oryx: Butterflies drink nectar from flowers using a long tube called a proboscis — like a built-in straw! 🦋 They also help flowers grow by spreading pollen. You're a nature explorer!

User: How do trees drink water?
Oryx: Trees drink water through their roots underground! 🌳 The water travels all the way up through the trunk to the leaves — like a giant drinking straw. Isn't that cool!

Now answer this:
User: ${question}
Oryx:`;

  try {
    console.log("Chat question:", question);
    const answer = await askGroq(ORYX_PERSONA, userPrompt);
    console.log("Chat answer:", answer);
    res.json({ answer });
  } catch (err) {
    console.error("Chat error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// 2. DAILY CHALLENGE
// ═══════════════════════════════════════════════════════════════
app.get("/daily", async (req, res) => {
  const categories = ["mammal", "bird", "insect", "reptile", "fish", "plant", "tree", "marine creature"];
  const randomCategory = categories[Math.floor(Math.random() * categories.length)];
  const randomSeed = Math.floor(Math.random() * 1000);

  const userPrompt = `
Today is ${new Date().toDateString()} (seed: ${randomSeed}).
Pick ONE interesting ${randomCategory} from the Middle East, Gulf region, or Qatar.
Do NOT pick a Date Palm, Sea Turtle, or Camel — choose something creative and unexpected!
Think of something a child would find surprising and exciting!

Return ONLY a valid JSON object, no markdown, no extra text:
{
  "creature": "name",
  "category": "mammal or bird or reptile or fish or insect or plant or tree or flower",
  "emoji": "one emoji",
  "lesson": "3 fun sentences for kids aged 6-12",
  "funFact": "one surprising fun fact",
  "habitat": "where it lives in 3-5 words",
  "quiz": [
    {"question": "q1", "options": ["A", "B", "C", "D"], "answer": "correct option text"},
    {"question": "q2", "options": ["A", "B", "C", "D"], "answer": "correct option text"},
    {"question": "q3", "options": ["A", "B", "C", "D"], "answer": "correct option text"},
    {"question": "q4", "options": ["A", "B", "C", "D"], "answer": "correct option text"},
    {"question": "q5", "options": ["A", "B", "C", "D"], "answer": "correct option text"}
  ]
}`;

  try {
    let text = await askGroq(ORYX_PERSONA, userPrompt);
    text = text.replace(/```json|```/g, "").trim();
    const data = JSON.parse(text);
    res.json(data);
  } catch (err) {
    console.error("Daily error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// 3. GUESS THE NATURE
// ═══════════════════════════════════════════════════════════════
app.get("/guess/new", async (req, res) => {
  const guessCategories = ["insect", "bird", "mammal", "plant", "marine creature", "reptile", "tree", "flower"];
  const randomGuessCategory = guessCategories[Math.floor(Math.random() * guessCategories.length)];
  const guessSeed = Math.floor(Math.random() * 9999);

  const userPrompt = `
Generate a "Guess What I Am!" nature game for kids aged 6-12. (seed: ${guessSeed})
Pick a ${randomGuessCategory} from the Middle East, Gulf, or Qatar region.
Do NOT pick a Sea Turtle, Date Palm, or Camel — be creative and unexpected!

Return ONLY a valid JSON object, no markdown, no extra text:
{
  "answer": "name",
  "clues": [
    "Clue 1: very vague clue",
    "Clue 2: medium clue with more detail",
    "Clue 3: easy clue that almost gives it away"
  ],
  "funFact": "a fun fact revealed after the answer",
  "emoji": "one relevant emoji"
}

Example:
{
  "answer": "Arabian Oryx",
  "clues": [
    "Clue 1: I am perfectly adapted to survive in one of the world's harshest environments 🌵",
    "Clue 2: I have long straight horns and a white coat that reflects the hot sun ☀️",
    "Clue 3: I am Qatar's national animal and appear on many logos here! 🇶🇦"
  ],
  "funFact": "The Arabian Oryx can detect rain from 90km away!",
  "emoji": "🦌"
}`;

  try {
    let text = await askGroq(ORYX_PERSONA, userPrompt);
    text = text.replace(/```json|```/g, "").trim();
    const data = JSON.parse(text);
    res.json(data);
  } catch (err) {
    console.error("Guess error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// 4. GENERATE QUIZ (ready for CNN)
// ═══════════════════════════════════════════════════════════════
app.post("/generate-quiz", async (req, res) => {
  const { speciesName, category } = req.body;
  if (!speciesName) return res.status(400).json({ error: "No species provided" });

  const userPrompt = `
Generate a fun educational quiz for kids aged 6-12 about: ${speciesName} (${category || "wildlife"})

Return ONLY a valid JSON object, no markdown, no extra text:
{
  "speciesName": "${speciesName}",
  "lesson": "3 fun sentences for kids",
  "funFact": "one surprising fun fact",
  "habitat": "where it lives in 3-5 words",
  "diet": "what it eats in 3-5 words",
  "region": "which part of the world in 3-5 words",
  "type": "mammal or bird or reptile or plant or fish or insect",
  "quiz": [
    {"question": "q1", "options": ["A", "B", "C", "D"], "answer": "correct option text"},
    {"question": "q2", "options": ["A", "B", "C", "D"], "answer": "correct option text"},
    {"question": "q3", "options": ["A", "B", "C", "D"], "answer": "correct option text"},
    {"question": "q4", "options": ["A", "B", "C", "D"], "answer": "correct option text"},
    {"question": "q5", "options": ["A", "B", "C", "D"], "answer": "correct option text"}
  ]
}`;

  try {
    let text = await askGroq(ORYX_PERSONA, userPrompt);
    text = text.replace(/```json|```/g, "").trim();
    const data = JSON.parse(text);
    res.json(data);
  } catch (err) {
    console.error("Quiz error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// 5. HEALTH CHECK
// ═══════════════════════════════════════════════════════════════
app.get("/", (req, res) => {
  res.json({ status: "ORYXEYE server is running 🐾", model: MODEL });
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`🐾 ORYXEYE server running on http://localhost:${PORT}`);
});