# ORYXEYE — Nature Explorer for Kids

An AI-powered educational web app where children upload photos of animals and plants, learn about them through an AI nature guide, play quizzes, and track their discoveries.

**Tech Stack:** React · Node.js · Python · Flask · Groq AI · TensorFlow · MongoDB Atlas · NLP (natural)

---

## Team

**Submitted by:**
- Amina Baziz — 60300593
- Maryam Mahaboob — 60301005
- Umm Kulsoom — 60301986

---

## Quick Install

A convenience script is included to install all dependencies at once.

**Option 1 — CMD (recommended):**
```
cd path\to\OryxEye
install.bat
```

**Option 2 — PowerShell:**
```
cd path\to\OryxEye
.\install.bat
```

This will install all Node.js and Python packages automatically. After it finishes, skip to the [How to Run](#how-to-run) section.

>  Windows only. Mac/Linux users should follow the manual steps below.

---

## Requirements

Before you start, make sure you have these installed on your computer.

### 1. Node.js (v18 or higher)
Download from: https://nodejs.org  
To check if you already have it:
```
node --version
```

### 2. Python (3.9 or higher)
Download from: https://python.org  
Python is required to run the AI classification models (plant and animal) through a local Flask API.  
To check if you already have it:
```
python --version
```

### 3. MongoDB Atlas (Free)
The app uses MongoDB Atlas as its online database — no local MongoDB installation needed.

1. Go to: https://mongodb.com/atlas
2. Sign up for a free account
3. Create a free shared cluster (M0 tier)
4. Under **Database Access**, create a database user with a username and password
5. Under **Network Access**, click "Allow Access from Anywhere"
6. Click **Connect** → **Drivers** → copy your connection string

### 4. Install server packages
Open a terminal, go into the server folder, and run:
```
cd server
npm install express cors dotenv natural mongoose mongodb
```
This installs:
- **express** — the web server framework
- **cors** — allows the frontend to talk to the backend
- **dotenv** — loads your secret keys from the `.env` file
- **natural** — NLP library used for the Guess game (tokenizer, stemmer, TF-IDF)
- **mongoose / mongodb** — MongoDB database driver and ODM

### 5. Install frontend packages
```
cd frontend
npm install
```
This installs React and everything the frontend needs (all listed in `package.json`).

### 6. Install Python dependencies
```
cd CNN
pip install flask tensorflow pillow numpy
```
This installs:
- **flask** — serves the classification models as a local API
- **tensorflow** — runs the EfficientNetV2S plant and animal models
- **pillow / numpy** — image processing utilities

---

## Get Your Groq API Key (Free)

The app uses Groq to power the AI chatbot, daily challenges, guess game, and quizzes. It is completely free — no credit card needed.

**Step 1 — Sign up**  
Go to: https://console.groq.com  
Click Sign Up and create a free account.

**Step 2 — Create an API key**
1. Log in to your Groq account
2. Click "API Keys" in the left sidebar
3. Click "Create API Key"
4. Give it any name (e.g. `oryxeye`)
5. Copy the key — it looks like: `gsk_xxxxxxxxxxxxxxxxxxxx`

**Step 3 — Add the key to the project**  
Inside the `server/` folder, create a new file called `.env`:
```
GROQ_API_KEY=gsk_your_key_here
MONGODB_URI=mongodb://username:password@your-cluster-url/test
```
>  This file must **NEVER** be pushed to GitHub.  
> Make sure your `.gitignore` file contains:
> ```
> .env
> node_modules/
> ```

---

## How to Run

You need **three terminals** open at the same time.

### Terminal 1 — Start the ML Models (Flask API)
```
cd CNN
python app.py
```
You should see:
```
Flask model server running on http://localhost:5001
```
This serves both the plant classification model (39 classes, EfficientNetV2S) and the animal classification model.

### Terminal 2 — Start the Node.js Server
```
cd server
node server.js
```
You should see:
```
ORYXEYE server running on http://localhost:4000
MongoDB connected!
```
If you see an error about the API key, double check your `.env` file is saved correctly inside the `server/` folder. If you see a MongoDB error, verify your connection string and that your IP is allowed in Atlas Network Access.

### Terminal 3 — Start the Frontend
```
cd frontend
npm start
```
This will automatically open the app in your browser at:  
**http://localhost:3000**

> All three terminals must stay running while using the app.

---

## Important Files — What Each One Does

### CNN folder (CNN/)
| File | What it does |
|------|--------------|
| `app.py` | Flask API server running on port 5001. Accepts image uploads and returns classification predictions for both plants and animals. |
| `plant_model.h5` | Trained EfficientNetV2S model for plant classification — 39 classes, ~92.67% validation accuracy. |
| `plant_model_fewshot.keras` | Fine-tuned plant model on cartoon-style images for better accuracy with illustrated content. |
| `animal_EfficientNetV2S_finetuned_final.keras` | Fine-tuned animal classification model. |
| `animal_model_fewshot_backbone.keras` | Few-shot backbone model for animal classification. |
| `plant_labels.json` | Class label mappings for the plant model. |
| `animal_labels.json` | Class label mappings for the animal model. |

### Server files (server/)
| File | What it does |
|------|--------------|
| `server.js` | The main backend file. Contains all API endpoints — chat, daily challenge, guess game, NLP checker, quiz generation, user auth, and progress tracking. |
| `.env` | Stores your secret Groq API key and MongoDB connection string. Never share or push this file. |
| `.env.example` | A safe template showing what `.env` should look like (Groq key + MongoDB URI). This one CAN be pushed to GitHub. |
| `.gitignore` | Tells Git which files to ignore. Must include `.env` and `node_modules/`. |

### Frontend files (frontend/src/)
| File | What it does |
|------|--------------|
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