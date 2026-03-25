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

const shownCreatureSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  shownAt:  { type: Date, default: Date.now }
});

const ShownCreature = mongoose.model("ShownCreature", shownCreatureSchema);
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
      model: MODEL, temperature: 0.9, max_tokens: 1500,
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

// ── SAFE JSON PARSER (fixes common LLM output issues) ────────
function safeParseLLMJson(raw) {
  // Strip markdown fences
  let text = raw.replace(/```json|```/g, "").trim();

  // Extract the JSON object
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON found in response");

  let jsonStr = match[0];

  // Fix trailing commas before ] or } (most common LLM mistake)
  jsonStr = jsonStr.replace(/,\s*([}\]])/g, "$1");

  // Fix unescaped newlines inside string values
  jsonStr = jsonStr.replace(/(?<=:\s*"[^"]*)\n([^"]*")/g, "\\n$1");

  // Fix single quotes used instead of double quotes (but not inside strings)
  // Only do this if standard parse fails
  try {
    return JSON.parse(jsonStr);
  } catch (firstError) {
    try {
      // Try replacing single-quoted keys/values
      const fixed = jsonStr
        .replace(/'/g, '"')
        .replace(/,\s*([}\]])/g, "$1");
      return JSON.parse(fixed);
    } catch (secondError) {
      console.error("❌ JSON parse failed. Raw text:\n", raw.substring(0, 500));
      throw new Error(`Invalid JSON from LLM: ${firstError.message}`);
    }
  }
}

// ── ORYX PERSONA ─────────────────────────────────────────────
const ORYX_PERSONA = `
You are Oryx, a friendly and enthusiastic nature guide for kids aged 6-10.
- You love both animals AND plants — you're excited about all living things!
- Keep responses to 2-3 sentences max — short and punchy. Only go longer if the kid asks for a story.
- Use simple, fun, and exciting language a child can understand
- Keep answers short and engaging
- Use 1-2 relevant emojis naturally — don't force them
- Avoid scary, violent, or sad facts
- You love nature, animals, plants and fun stories — be flexible and creative!
- For greetings, respond warmly and invite a question about nature
- If asked anything unrelated to nature, animals, or plants, gently say "I only know about nature!" and suggest a nature question
- Vary your endings every time — never repeat the same phrase twice
- Always keep responses appropriate for young children — if asked about sensitive or adult topics, gently redirect to a fun nature fact instead
`;

const EDUCATOR_SYSTEM = "You are a fun nature guide for kids aged 6-12. Use simple, clear language. Be enthusiastic and make learning feel exciting. Avoid overly scientific terms.";

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
    res.json({ message: `Account created! Welcome, ${username} 🐾` });
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
      emoji: emoji || "🐾",
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })
    });
    await QuizResult.create({ username, category, score: quizScore, total: totalQuestions });

    const user      = await User.findOne({ username });
    const today     = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (user.streak.lastDate === today) {
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
  const { question, history = [] } = req.body;
  if (!question) return res.status(400).json({ error: "No question provided" });
  try {
    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: MODEL, temperature: 0.9, max_tokens: 1000,
        messages: [{ role: "system", content: ORYX_PERSONA }, ...history, { role: "user", content: question }]
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Groq API error");
    res.json({ answer: data.choices[0].message.content.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// 2. DAILY CHALLENGE
// ═══════════════════════════════════════════════════════════════
app.get("/daily", async (req, res) => {
  const { username } = req.query;
  const animalCats = ["mammal","bird","insect","reptile","fish","amphibian","marine creature","arachnid","crustacean","marsupial"];
  const plantCats  = ["flowering plant","fruit tree","tropical plant","desert plant","aquatic plant","herb","shrub","vine"];

  const isPlant        = Math.random() > 0.5;
  const categories     = isPlant ? plantCats : animalCats;
  const randomCategory = categories[Math.floor(Math.random() * categories.length)];
  const randomSeed     = Math.floor(Math.random() * 99999);
  const type           = isPlant ? "plant" : "animal";

  try {
    // Get past discoveries for cumulative quiz
    let pastCreatures = [];
    if (username) {
      const discoveries = await Discovery.find({ username }).sort({ createdAt: -1 }).limit(5);
      pastCreatures = discoveries.map(d => d.name).filter(Boolean);
    }
    const hasPast  = pastCreatures.length > 0;
    const pastList = hasPast ? pastCreatures.join(", ") : "";

    // Get already-shown creatures to avoid repeats
    const shown      = await ShownCreature.find({}).sort({ shownAt: -1 }).limit(50).select("name");
    const shownNames = shown.map(s => s.name.toLowerCase());
    const excludeList = shownNames.length > 0
      ? `Do NOT pick any of these already-shown creatures: ${shownNames.join(", ")}.`
      : "";

    const userPrompt = `
Today is ${new Date().toDateString()} (seed: ${randomSeed}).
Pick ONE interesting ${randomCategory} from anywhere in the world. Be creative and unexpected.
${excludeList}
You MUST return ONLY a raw JSON object. No markdown, no backticks, no explanation, no extra text before or after.
${hasPast ? `The kid has previously learned about: ${pastList}. Mix 2 quiz questions about those past creatures and 3 about the new creature.` : "Generate 5 quiz questions about the new creature."}
Exactly this structure:
{"creature":"name","category":"${type}","emoji":"one emoji","lesson":"3 fun sentences for kids about this ${type}","funFact":"one fun fact","habitat":"where it lives or grows in 3-5 words","quiz":[{"question":"q1","options":["A","B","C","D"],"answer":"correct"},{"question":"q2","options":["A","B","C","D"],"answer":"correct"},{"question":"q3","options":["A","B","C","D"],"answer":"correct"},{"question":"q4","options":["A","B","C","D"],"answer":"correct"},{"question":"q5","options":["A","B","C","D"],"answer":"correct"}]}`;

    let text = await askGroq(ORYX_PERSONA, userPrompt);
    const parsed = safeParseLLMJson(text);

    // Validate the quiz array exists and has the right shape
    if (!parsed.quiz || !Array.isArray(parsed.quiz) || parsed.quiz.length === 0) {
      throw new Error("LLM response missing valid quiz array");
    }
    // Ensure every quiz item has required fields
    parsed.quiz = parsed.quiz.filter(q => q.question && q.options && q.answer);
    if (parsed.quiz.length === 0) {
      throw new Error("No valid quiz questions after filtering");
    }

    await ShownCreature.create({ name: parsed.creature });
    res.json(parsed);
  } catch (err) {
    console.error("❌ /daily error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// 3. GUESS THE ANIMAL
// ═══════════════════════════════════════════════════════════════
app.get("/guess/new", async (req, res) => {
  const categories = ["insect","bird","mammal","marine creature","reptile","amphibian","marsupial"];
  const cat  = categories[Math.floor(Math.random() * categories.length)];
  const seed = Math.floor(Math.random() * 99999);
  
  const userPrompt = `
Generate a "Guess What I Am!" game for kids aged 6-12. (seed: ${seed})
Pick a DIFFERENT well-known ${cat} every time based on the seed number. 
The animal must be something a 6-year-old would know.
You MUST return ONLY a raw JSON object. No markdown, no backticks, no explanation.
Exactly this structure:
{"answer":"animal name","clues":["one obvious physical feature","where it lives or what it eats","a very well-known fact about it"],"funFact":"one fun fact after reveal","emoji":"one emoji"}`;

  try {
    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: MODEL, temperature: 0.6, max_tokens: 300,
        messages: [{ role: "system", content: ORYX_PERSONA }, { role: "user", content: userPrompt }]
      })
    });
    const data = await response.json();
    let text = data.choices[0].message.content.trim();
    const parsed = safeParseLLMJson(text);
    res.json(parsed);
  } catch (err) {
    console.error("❌ /guess/new error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// 4. GENERATE QUIZ
// ═══════════════════════════════════════════════════════════════
app.post("/generate-quiz", async (req, res) => {
  const { speciesName, category } = req.body;
  if (!speciesName) return res.status(400).json({ error: "No species provided" });

  const isPlant  = category === "plant";
  const isAnimal = category === "animal";

  const systemPrompt = (isPlant || isAnimal) ? EDUCATOR_SYSTEM : ORYX_PERSONA;

const userPrompt = isPlant ? `
Generate fun and educational plant information for kids aged 6-10 about: ${speciesName}
You MUST return ONLY a raw JSON object. No markdown, no backticks, no explanation.
Exactly this structure:
{"speciesName":"${speciesName}","lesson":"3 sentences — what this plant looks like, how it grows, and one cool thing it does in nature","funFact":"one wow-worthy fact that would surprise a kid","habitat":"where it naturally grows in 5-7 words","diet":"what it needs to survive e.g. sunlight, water, minerals","region":"where it originally comes from in 5-7 words","type":"simple plant type e.g. fruit tree, flowering herb, tropical shrub","quiz":[{"question":"fun educational q1","options":["A","B","C","D"],"answer":"correct"},{"question":"fun educational q2","options":["A","B","C","D"],"answer":"correct"},{"question":"fun educational q3","options":["A","B","C","D"],"answer":"correct"},{"question":"fun educational q4","options":["A","B","C","D"],"answer":"correct"},{"question":"fun educational q5","options":["A","B","C","D"],"answer":"correct"}]}`

  : isAnimal ? `
Generate fun and educational animal information for kids aged 6-10 about: ${speciesName}
You MUST return ONLY a raw JSON object. No markdown, no backticks, no explanation.
Exactly this structure:
{"speciesName":"${speciesName}","lesson":"3 sentences — what this animal looks like, how it behaves, and one cool thing about how it survives","funFact":"one wow-worthy fact that would surprise a kid","habitat":"specific ecosystem in 5-7 words","diet":"what it eats in 5-7 words","region":"where it lives in 5-7 words","type":"animal type e.g. apex predator, migratory bird, nocturnal mammal","quiz":[{"question":"fun educational q1","options":["A","B","C","D"],"answer":"correct"},{"question":"fun educational q2","options":["A","B","C","D"],"answer":"correct"},{"question":"fun educational q3","options":["A","B","C","D"],"answer":"correct"},{"question":"fun educational q4","options":["A","B","C","D"],"answer":"correct"},{"question":"fun educational q5","options":["A","B","C","D"],"answer":"correct"}]}`

  : `
Generate a fun quiz for kids about: ${speciesName} (${category || "wildlife"})
You MUST return ONLY a raw JSON object. No markdown, no backticks, no explanation.
Exactly this structure:
{"speciesName":"${speciesName}","lesson":"3 fun sentences","funFact":"one fun fact","habitat":"3-5 words","diet":"3-5 words","region":"3-5 words","type":"mammal/bird/reptile/fish/insect","quiz":[{"question":"q1","options":["A","B","C","D"],"answer":"correct"},{"question":"q2","options":["A","B","C","D"],"answer":"correct"},{"question":"q3","options":["A","B","C","D"],"answer":"correct"},{"question":"q4","options":["A","B","C","D"],"answer":"correct"},{"question":"q5","options":["A","B","C","D"],"answer":"correct"}]}`;
  try {
    let text = await askGroq(systemPrompt, userPrompt);
    const parsed = safeParseLLMJson(text);

    // Validate quiz array
    if (!parsed.quiz || !Array.isArray(parsed.quiz) || parsed.quiz.length === 0) {
      throw new Error("LLM response missing valid quiz array");
    }
    parsed.quiz = parsed.quiz.filter(q => q.question && q.options && q.answer);
    if (parsed.quiz.length === 0) {
      throw new Error("No valid quiz questions after filtering");
    }

    res.json(parsed);
  } catch (err) {
    console.error("❌ /generate-quiz error:", err.message);
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
  const prompt = `Correct answer: "${answer}". Child's guess: "${guess}". Same animal? Reply ONLY "yes" or "no".`;
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

  const guessWords  = guess.toLowerCase().split(" ");
  const answerWords = answer.toLowerCase().split(" ");
  const closeEnough = guessWords.some(gw =>
    answerWords.some(aw => natural.LevenshteinDistance(gw, aw) <= 2)
  );
  if (closeEnough)
    return res.json({ correct: true, method: "levenshtein", similarity });

  const semantic = await semanticCheck(guess, answer);
  res.json({ correct: semantic, method: "semantic", similarity });
});

// ═══════════════════════════════════════════════════════════════
// 6. HEALTH CHECK
// ═══════════════════════════════════════════════════════════════
app.get("/", (req, res) => res.json({ status: "ORYXEYE server running 🐾", model: MODEL }));

// ═══════════════════════════════════════════════════════════════
// 7. CLASSIFY IMAGE
// ═══════════════════════════════════════════════════════════════
const multer   = require("multer");
const FormData = require("form-data");
const upload   = multer({ storage: multer.memoryStorage() });

app.post("/classify", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image provided" });
  try {
    const axios = require("axios");
    const form  = new FormData();
    form.append("image", req.file.buffer, {
      filename:    req.file.originalname || "image.jpg",
      contentType: req.file.mimetype     || "image/jpeg",
      knownLength: req.file.buffer.length
    });
    const response = await axios.post("http://localhost:5001/classify", form, {
      headers: form.getHeaders()
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 4000;
app.listen(PORT, () => console.log(`🐾 ORYXEYE server running on http://localhost:${PORT}`));