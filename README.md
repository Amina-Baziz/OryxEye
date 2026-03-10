# ORYXEYE — Nature Explorer for Kids

An AI-powered web app where kids upload photos of animals and plants, learn about them, chat with an AI nature guide, and play quizzes.

Built with **React + Node.js + Groq AI + NLP**

---

##  Requirements

Before you start, make sure you have these installed on your computer.

### 1. Node.js (v18 or higher)
Download from: https://nodejs.org  
To check if you already have it:
```bash
node --version
```

### 2. Python (3.9 or higher)
Download from: https://python.org  
To check if you already have it:
```bash
python --version
```

### 3. Install server packages
Open a terminal, go into the server folder, and run:
```bash
cd server
npm install express cors dotenv natural
```
This installs:
- `express` — the web server framework
- `cors` — allows the frontend to talk to the backend
- `dotenv` — loads your secret API key from the `.env` file
- `natural` — NLP library used for the Guess game (tokenizer, stemmer, TF-IDF)

### 4. Install frontend packages
```bash
cd frontend
npm install
```
This installs React and everything the frontend needs (all listed in `package.json`).

---

## Get Your Groq API Key (Free)

The app uses Groq to power the AI chatbot, daily challenges, guess game, and quizzes. It is completely free — no credit card needed.

### Step 1 — Sign up
Go to: **https://console.groq.com**  
Click **Sign Up** and create a free account.

### Step 2 — Create an API key
1. Log in to your Groq account
2. Click **"API Keys"** in the left sidebar
3. Click **"Create API Key"**
4. Give it any name (e.g. `oryxeye`)
5. Copy the key — it looks like: `gsk_xxxxxxxxxxxxxxxxxxxx`

### Step 3 — Add the key to the project
Inside the `server/` folder, create a new file called `.env`:
```
GROQ_API_KEY=gsk_your_key_here
```

> this file must NEVER be pushed to GitHub.  
> Make sure your `server/.gitignore` file contains:
> ```
> .env
> node_modules/
> ```

---

##  How to Run

You need **two terminals open at the same time** — one for the server and one for the frontend.

### Terminal 1 — Start the Server

```bash
cd server
node server.js
```

If everything is working you will see:
```
 ORYXEYE server running on http://localhost:4000
```

> If you see an error about the API key, double check your `.env` file is saved correctly inside the `server/` folder.

### Terminal 2 — Start the Frontend

```bash
cd frontend
npm start
```

This will automatically open the app in your browser at:  
**http://localhost:3000**

>  The server (Terminal 1) must be running at all times while using the app. Do not close it.

---

##  Important Files — What Each One Does

### Server files (`server/`)

| File | What it does |
|------|-------------|
| `server.js` | The main backend file. Contains all API endpoints — chat, daily challenge, guess game, NLP checker, quiz generation, user auth, and progress tracking. If something on the backend is broken, this is the file to check. |
| `.env` | Stores your secret Groq API key. Never share or push this file. |
| `.env.example` | A safe template showing what `.env` should look like. This one CAN be pushed to GitHub. |
| `.gitignore` | Tells Git which files to ignore. Must include `.env` and `node_modules/`. |

### Frontend files (`frontend/src/`)

| File | What it does |
|------|-------------|
| `App.js` | The main app file. Handles routing between pages, login, signup, logout, and shared state like progress data. |
| `App.css` | All the visual styling for the entire app — colors, fonts, layouts, animations. |
| `components/Toast.jsx` | The small notification popup that appears at the top (e.g. "Welcome back!"). |
| `components/BottomNav.jsx` | The top tab bar with Discover, Ask Oryx, Daily, Guess, Journal, Progress. |
| `components/QuizSection.jsx` | The reusable quiz component used in Discover, Daily Challenge, and Generate Quiz. |
| `pages/LandingPage.jsx` | The intro/home page with scrolling photos, floating animals, and feature cards. |
| `pages/DiscoverPage.jsx` | The photo upload page where kids upload an image to identify a species. |
| `pages/ChatbotPage.jsx` | The Ask Oryx chatbot page — kids can ask any nature question. |
| `pages/DailyPage.jsx` | The daily nature challenge page — loads a new creature and quiz each day. |
| `pages/GuessPage.jsx` | The Guess the Nature game — shows clues, accepts guesses using NLP matching. |
| `pages/JournalPage.jsx` | Shows all the species the user has discovered and completed quizzes for. |
| `pages/DashboardPage.jsx` | Shows progress stats — total discoveries, quiz accuracy, streak, badges. |

---
