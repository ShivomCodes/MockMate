# <div align="center">🧠 MockMate AI</div>

<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&height=180&text=MockMate%20AI&fontAlign=50&fontAlignY=32&color=gradient&customColorList=12,19,25,30" alt="MockMate AI banner" />
</div>

<div align="center">
  <img src="https://readme-typing-svg.demolab.com?font=Inter&weight=600&size=22&pause=1200&color=8B5CF6&center=true&vCenter=true&width=820&lines=Practice+realistic+AI-powered+mock+interviews;Speak+or+type+your+answers+in+live+sessions;Get+structured+feedback+with+score+breakdowns" alt="Typing animation" />
</div>

<div align="center">
  <img alt="React" src="https://img.shields.io/badge/React-19-20232A?style=for-the-badge&logo=react" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite" />
  <img alt="Express" src="https://img.shields.io/badge/Express-5-111827?style=for-the-badge&logo=express" />
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma" />
  <img alt="Better Auth" src="https://img.shields.io/badge/BetterAuth-Email%2FPassword-7C3AED?style=for-the-badge" />
  <img alt="Gemini" src="https://img.shields.io/badge/Gemini-2.5%20Flash-1A73E8?style=for-the-badge&logo=google" />
</div>

---

## ✨ Overview

**MockMate AI** is a full-stack AI interview simulator where users:
1. Create interview sessions by role, type, difficulty, and duration.
2. Answer questions using **voice transcription** (or typed fallback).
3. Receive AI-generated feedback with overall score, strengths, improvements, and question-level breakdown.

The product is optimized for a polished UX with dark/light theme support, responsive layout, and animated interview/feedback flows.

---

## 🚀 Feature Highlights

### 👤 Authentication & User Accounts
- Email/password auth via **Better Auth**.
- Session-based protection for all interview APIs.
- Profile management:
  - Update display name
  - Change password
  - Sign out

### 🎯 Interview Lifecycle
- Multi-step setup:
  - Role
  - Interview type (`behavioral`, `technical`, `mixed`)
  - Difficulty (`easy`, `medium`, `hard`)
  - Duration (5–30 mins)
- Interview state management:
  - `pending` → `in_progress` → `completed`
- Real-time progress + countdown timer.
- Optional early termination with confirmation dialog.

### 🎙️ Voice + Camera Experience
- Browser mic capture using `MediaRecorder`.
- Audio sent to backend for AI transcription.
- Webcam preview before and during interview.
- Fallback to typed answers if voice fails or is unavailable.
- Question text-to-speech with replay + mute controls.

### 🤖 AI Capabilities
- **Gemini 2.5 Flash** generates:
  - Interview question sets
  - Post-interview feedback and scoring
  - Audio transcription
- Includes resilient JSON parsing for model outputs.
- Uses fallback default questions if AI question generation fails.

### 📊 Feedback & Performance Analytics
- Overall score + hiring recommendation.
- Communication / Technical / Confidence sub-scores.
- Strengths & improvement areas.
- Per-question feedback with ideal answer guidance.
- Downloadable plain-text report.
- Dashboard and profile analytics (average, best, recent activity).

---

## 🏗️ Architecture

```mermaid
flowchart LR
  A[React + Vite Client] -->|Cookie-based auth + API calls| B[Express API Server]
  B --> C[Better Auth]
  B --> D[Prisma ORM]
  D --> E[(PostgreSQL)]
  B --> F[Google Gemini API]
  A -->|Voice/Media| G[Browser Media APIs]
```

### Request/Data Flow (Interview)
1. Client creates interview (`POST /api/interviews`)
2. Client starts interview (`PATCH /api/interviews/:id/start`)
3. Client fetches AI questions (`GET /api/interviews/:id/questions`)
4. Client records answer and sends audio for transcription (`POST /api/interviews/transcribe`)
5. Client completes interview with transcript (`PATCH /api/interviews/:id/complete`)
6. Server stores feedback + score and client reads it (`GET /api/interviews/:id`)

---

## 🧰 Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, React Router 7, Vite 8 |
| UI | Tailwind CSS, shadcn/ui, Radix UI, Lucide icons |
| Forms & Validation | React Hook Form, Zod |
| HTTP | Axios |
| Backend | Node.js, Express 5 |
| Auth | Better Auth + Prisma adapter |
| Database | PostgreSQL + Prisma |
| AI | `@google/generative-ai` (Gemini 2.5 Flash) |

---

## 📁 Project Structure

```text
MockMate/
├─ client/
│  ├─ src/
│  │  ├─ components/
│  │  ├─ context/
│  │  ├─ hooks/
│  │  ├─ lib/
│  │  ├─ pages/
│  │  ├─ App.jsx
│  │  └─ main.jsx
│  ├─ package.json
│  └─ vite.config.js
└─ server/
   ├─ lib/
   │  ├─ auth.js
   │  ├─ gemini.js
   │  └─ prisma.js
   ├─ middleware/
   │  └─ requireAuth.js
   ├─ prisma/
   │  └─ schema.prisma
   ├─ routes/
   │  ├─ index.js
   │  └─ interview.js
   ├─ server.js
   └─ package.json
```

---

## 🔐 Environment Variables

### `server/.env`

```env
PORT=3000
CLIENT_URL=http://localhost:5173

DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME
BETTER_AUTH_SECRET=your_long_random_secret

# Use either one:
GEMINI_API_KEY=your_gemini_key
# or
GOOGLE_API_KEY=your_google_ai_key
```

### `client/.env`

```env
VITE_API_URL=http://localhost:3000
```

---

## ⚙️ Local Development

### 1) Start backend

```bash
cd server
npm install
npm run db:generate
npm run db:push
npm run dev
```

### 2) Start frontend

```bash
cd client
npm install
npm run dev
```

Frontend default: `http://localhost:5173`  
Backend default: `http://localhost:3000`

Health check:

```bash
GET /api/health
```

---

## 📡 API Reference

All interview routes require an authenticated session.

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/health` | Server status check |
| POST | `/api/interviews/transcribe` | Transcribe base64 audio |
| POST | `/api/interviews` | Create new interview |
| GET | `/api/interviews` | List user interviews |
| GET | `/api/interviews/:id` | Get interview details |
| PATCH | `/api/interviews/:id/start` | Mark interview in progress |
| PATCH | `/api/interviews/:id/complete` | Save transcript + generate feedback |
| GET | `/api/interviews/:id/questions` | Generate/fetch AI question set |

Auth routes are mounted under:

```text
/api/auth/*
```

---

## 🗄️ Database Model Snapshot

Core entities in Prisma schema:
- **User**
- **Session**
- **Account**
- **Verification**
- **Interview** (role, type, difficulty, duration, status, transcript, feedback, overallScore)

---

## 🧪 Available Scripts

### Client (`client/package.json`)
- `npm run dev` — start Vite dev server
- `npm run build` — production build
- `npm run preview` — preview build
- `npm run lint` — run ESLint

### Server (`server/package.json`)
- `npm run dev` — start with nodemon
- `npm run start` — start with node
- `npm run db:push` — push Prisma schema to DB
- `npm run db:generate` — generate Prisma client

---

## 🎨 UX Notes

- Responsive desktop/mobile layouts.
- Animated interview states (`loading`, `thinking`, `transcribing`, etc.).
- Typewriter prompt reveal for interview questions.
- Theme persistence via `localStorage`.
- Toast-driven user feedback for errors/success states.

---

## 📄 License

No license file is currently defined in the repository root. Add one if you plan to open-source or distribute the project.

---

<div align="center">
  <sub>Built with focus, feedback loops, and a lot of interview anxiety reduction ✨</sub>
</div>

