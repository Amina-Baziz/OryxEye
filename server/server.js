require("dotenv").config();
const express  = require("express");
const cors     = require("cors");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════════════
// MONGODB CONNECTION
// ═══════════════════════════════════════════════════════════════
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log(" MongoDB connected!"))
  .catch(err => console.error("MongoDB error:", err.message));

// ── SCHEMAS ──────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email:    { type: String, required: true },
  password: { type: String, required: true },
  streak: {
    count:    { type: Number, default: 0 },
    lastDate: { type: String, default: null }
  }
});

const discoverySchema = new mongoose.Schema({
  username:  { type: String, required: true },
  name:      String,
  category:  String,
  emoji:     String,
  date:      String,
  createdAt: { type: Date, default: Date.now }
});

const quizResultSchema = new mongoose.Schema({
  username: { type: String, required: true },
  category: String,
  score:    Number,
  total:    Number,
  date:     { type: Date, default: Date.now }
});

const User       = mongoose.model("User",       userSchema);
const Discovery  = mongoose.model("Discovery",  discoverySchema);
const QuizResult = mongoose.model("QuizResult", quizResultSchema);

// ── GROQ SETUP ────────────────────────────────────────────────
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL     = "https://api.groq.com/openai/v1/chat/completions";
const MODEL        = "llama-3.3-70b-versatile";

async function askGroq(systemPrompt, userPrompt) {
  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL, temperature: 0.7, max_tokens: 500,
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

// ── ORYX PERSONA ─────────────────────────────────────────────
const ORYX_PERSONA = `
You are Oryx, a friendly and enthusiastic nature guide for kids aged 6-12.
- Always use very simple words a child can understand
- Keep answers fun, short, and exciting
- Use 1-2 relevant emojis per response
- Never use scary, violent, or sad facts
- If asked a casual greeting like "hi", respond warmly and invite a nature question
- If asked anything off-topic, say: "I only know about nature! Ask me about animals or plants 🌿"
- Always end with an encouraging phrase like "Great question!" or "You're a nature explorer!"
`;

// ═══════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════
app.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !password || !email)
    return res.status(400).json({ error: "Missing fields" });
  try {
    const exists = await User.findOne({ username });
    if (exists) return res.status(400).json({ error: "Username already taken" });
    await User.create({ username, email, password });
    res.json({ message: `Account created! Welcome, ${username} 🌿` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username, password });
    if (!user) return res.status(401).json({ error: "Wrong username or password" });
    res.json({ user: { username: user.username, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// SAVE RESULT
// ═══════════════════════════════════════════════════════════════
app.post("/save-result", async (req, res) => {
  const { username, speciesName, category, emoji, quizScore, totalQuestions } = req.body;
  if (!username) return res.status(400).json({ error: "No username" });
  try {
    await Discovery.create({
      username, name: speciesName, category,
      emoji: emoji || "🌿",
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })
    });
    await QuizResult.create({ username, category, score: quizScore, total: totalQuestions });

    // Update streak
    const user      = await User.findOne({ username });
    const today     = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (user.streak.lastDate === today) {
      // already logged today
    } else if (user.streak.lastDate === yesterday) {
      user.streak.count += 1;
      user.streak.lastDate = today;
    } else {
      user.streak.count    = 1;
      user.streak.lastDate = today;
    }
    await user.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// PROGRESS / DASHBOARD
// ═══════════════════════════════════════════════════════════════
app.get("/progress/:username", async (req, res) => {
  const { username } = req.params;
  try {
    const user        = await User.findOne({ username });
    const discoveries = await Discovery.find({ username }).sort({ createdAt: -1 });
    const quizResults = await QuizResult.find({ username });

    const categoryStats = {};
    quizResults.forEach(r => {
      if (!categoryStats[r.category]) categoryStats[r.category] = { correct: 0, total: 0 };
      categoryStats[r.category].correct += r.score;
      categoryStats[r.category].total   += r.total;
    });

    const categories   = Object.entries(categoryStats).map(([name, s]) => ({
      label: name.charAt(0).toUpperCase() + name.slice(1),
      pct:   s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0
    }));
    const totalCorrect = quizResults.reduce((a, r) => a + r.score, 0);
    const totalQs      = quizResults.reduce((a, r) => a + r.total, 0);
    const accuracy     = totalQs > 0 ? Math.round((totalCorrect / totalQs) * 100) : 0;
    const weakest      = [...categories].sort((a, b) => a.pct - b.pct)[0];

    res.json({
      discoveries, totalDiscoveries: discoveries.length,
      totalQuizzes: quizResults.length,
      accuracy, streak: user ? user.streak.count : 0,
      categories, weakest: weakest || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// 1. CHATBOT
// ═══════════════════════════════════════════════════════════════
app.post("/chat", async (req, res) => {
  const { question } = req.body;
  if (!question) return res.status(400).json({ error: "No question provided" });
  const userPrompt = `
User: Why do camels have humps?
Oryx: Camels store fat in their humps, not water! 🐪 Great question!

User: What do butterflies eat?
Oryx: Butterflies drink nectar from flowers using a long tube called a proboscis! 🦋 You're a nature explorer!

Now answer this:
User: ${question}
Oryx:`;
  try {
    const answer = await askGroq(ORYX_PERSONA, userPrompt);
    res.json({ answer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// 2. DAILY CHALLENGE
// ═══════════════════════════════════════════════════════════════
app.get("/daily", async (req, res) => {
  const categories     = ["mammal","bird","insect","reptile","fish","plant","tree","marine creature"];
  const randomCategory = categories[Math.floor(Math.random() * categories.length)];
  const randomSeed     = Math.floor(Math.random() * 1000);
  const userPrompt = `
Today is ${new Date().toDateString()} (seed: ${randomSeed}).
Pick ONE interesting ${randomCategory} from anywhere in the world.
Do NOT pick Date Palm, Sea Turtle, or Camel.
You MUST return ONLY a raw JSON object. No markdown, no backticks, no explanation, no extra text before or after.
Exactly this structure:
{"creature":"name","category":"type","emoji":"one emoji","lesson":"3 fun sentences for kids","funFact":"one fun fact","habitat":"where it lives in 3-5 words","quiz":[{"question":"q1","options":["A","B","C","D"],"answer":"correct"},{"question":"q2","options":["A","B","C","D"],"answer":"correct"},{"question":"q3","options":["A","B","C","D"],"answer":"correct"},{"question":"q4","options":["A","B","C","D"],"answer":"correct"},{"question":"q5","options":["A","B","C","D"],"answer":"correct"}]}`;
  try {
    let text = await askGroq(ORYX_PERSONA, userPrompt);
    text = text.replace(/```json|```/g, "").trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON found in response");
    res.json(JSON.parse(match[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// 3. GUESS THE NATURE
// ═══════════════════════════════════════════════════════════════
app.get("/guess/new", async (req, res) => {
  const cats = ["insect","bird","mammal","plant","marine creature","reptile","tree","flower"];
  const cat  = cats[Math.floor(Math.random() * cats.length)];
  const seed = Math.floor(Math.random() * 9999);
  const userPrompt = `
Generate a "Guess What I Am!" game for kids. (seed: ${seed})
Pick a ${cat} from anywhere in the world. NOT Sea Turtle, Date Palm, or Camel.
You MUST return ONLY a raw JSON object. No markdown, no backticks, no explanation, no extra text before or after.
Exactly this structure:
{"answer":"name","clues":["vague clue","medium clue","easy clue"],"funFact":"fun fact after reveal","emoji":"one emoji"}`;
  try {
    let text = await askGroq(ORYX_PERSONA, userPrompt);
    text = text.replace(/```json|```/g, "").trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON found in response");
    res.json(JSON.parse(match[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// 4. GENERATE QUIZ
// ═══════════════════════════════════════════════════════════════
app.post("/generate-quiz", async (req, res) => {
  const { speciesName, category } = req.body;
  if (!speciesName) return res.status(400).json({ error: "No species provided" });
  const userPrompt = `
Generate a fun quiz for kids about: ${speciesName} (${category || "wildlife"})
You MUST return ONLY a raw JSON object. No markdown, no backticks, no explanation, no extra text before or after.
Exactly this structure:
{"speciesName":"${speciesName}","lesson":"3 fun sentences","funFact":"one fun fact","habitat":"3-5 words","diet":"3-5 words","region":"3-5 words","type":"mammal/bird/reptile/plant/fish/insect","quiz":[{"question":"q1","options":["A","B","C","D"],"answer":"correct"},{"question":"q2","options":["A","B","C","D"],"answer":"correct"},{"question":"q3","options":["A","B","C","D"],"answer":"correct"},{"question":"q4","options":["A","B","C","D"],"answer":"correct"},{"question":"q5","options":["A","B","C","D"],"answer":"correct"}]}`;
  try {
    let text = await askGroq(ORYX_PERSONA, userPrompt);
    text = text.replace(/```json|```/g, "").trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON found in response");
    res.json(JSON.parse(match[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// 5. NLP GUESS CHECKER
// ═══════════════════════════════════════════════════════════════
const natural   = require("natural");
const tokenizer = new natural.WordTokenizer();
const stemmer   = natural.PorterStemmer;
const TfIdf     = natural.TfIdf;

function tokenizeAndStem(text) {
  return tokenizer.tokenize(text.toLowerCase()).map(t => stemmer.stem(t));
}

function cosineSimilarity(text1, text2) {
  const tfidf = new TfIdf();
  tfidf.addDocument(tokenizeAndStem(text1).join(" "));
  tfidf.addDocument(tokenizeAndStem(text2).join(" "));
  const terms = new Set();
  tfidf.listTerms(0).forEach(t => terms.add(t.term));
  tfidf.listTerms(1).forEach(t => terms.add(t.term));
  const vec1 = [], vec2 = [];
  terms.forEach(term => { vec1.push(tfidf.tfidf(term, 0)); vec2.push(tfidf.tfidf(term, 1)); });
  const dot  = vec1.reduce((s, v, i) => s + v * vec2[i], 0);
  const mag1 = Math.sqrt(vec1.reduce((s, v) => s + v * v, 0));
  const mag2 = Math.sqrt(vec2.reduce((s, v) => s + v * v, 0));
  if (mag1 === 0 || mag2 === 0) return 0;
  return dot / (mag1 * mag2);
}

async function semanticCheck(guess, answer) {
  const prompt = `Correct answer: "${answer}". Child's guess: "${guess}". Same animal/plant? Reply ONLY "yes" or "no".`;
  try {
    const r = await askGroq("You are a strict but fair judge.", prompt);
    return r.toLowerCase().includes("yes");
  } catch { return false; }
}

app.post("/check-guess", async (req, res) => {
  const { guess, answer } = req.body;
  if (!guess || !answer) return res.status(400).json({ error: "Missing guess or answer" });
  const stemmedGuess  = tokenizeAndStem(guess);
  const stemmedAnswer = tokenizeAndStem(answer);
  const similarity    = cosineSimilarity(guess, answer);
  const overlap       = stemmedGuess.some(gw => stemmedAnswer.some(aw => aw === gw));
  console.log(`🔍 "${guess}" vs "${answer}" — similarity: ${similarity.toFixed(3)}`);
  if (similarity >= 0.5 || overlap)
    return res.json({ correct: true, method: "tfidf", similarity });
  const semantic = await semanticCheck(guess, answer);
  res.json({ correct: semantic, method: "semantic", similarity });
});

// ═══════════════════════════════════════════════════════════════
// 6. HEALTH CHECK
// ═══════════════════════════════════════════════════════════════
app.get("/", (req, res) => res.json({ status: "ORYXEYE server running 🐾", model: MODEL }));

const PORT = 4000;
app.listen(PORT, () => console.log(`🐾 ORYXEYE server running on http://localhost:${PORT}`));