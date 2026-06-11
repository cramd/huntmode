# HuntMode — Job Search Assistant

Your ADHD-friendly job search command center. Track applications, generate AI-tailored CVs and cover letters, and stay motivated with goals and streak tracking.

## Features

- **AI Document Generation** — Paste a job URL, and get a tailored CV and cover letter in seconds (OpenAI GPT-4o or Claude)
- **Application Tracker** — Track every application with status, notes, and links to generated documents
- **Goals & Streaks** — Daily checklists, streak calendar (GitHub-style heatmap), and motivational milestones
- **Dashboard** — Application funnel, weekly progress ring, activity chart, and recent applications
- **Master Resume** — Store multiple resume variants; the AI adapts the right one per role

## Setup

### 1. Firebase Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and create a new project
2. Enable **Authentication** → Google sign-in provider
3. Enable **Firestore** (start in production mode)
4. Enable **Storage**
5. Go to **Project Settings → Your Apps** → Add a Web App → copy the config

### 2. Environment Variables

Copy `.env.local` and fill in your values:

```bash
# Firebase Web Config
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (for API routes)
# Firebase Console → Project Settings → Service Accounts → Generate new private key
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# AI Provider (add key for your chosen provider)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

### 3. Deploy Firestore Rules

```bash
npx firebase-tools@latest login
npx firebase-tools@latest use --add <YOUR_PROJECT_ID>
npx firebase-tools@latest deploy --only firestore:rules
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Stack

- **Next.js 15** (App Router)
- **Firebase** (Auth, Firestore, Storage)
- **Vercel AI SDK** — provider-agnostic (OpenAI or Anthropic)
- **Tailwind CSS + shadcn/ui**
- **Recharts**
- **TypeScript**

## AI Provider

Configure in **Settings** inside the app, or via environment variables. Supports:
- OpenAI GPT-4o (`OPENAI_API_KEY`)
- Anthropic Claude 3.5 Sonnet (`ANTHROPIC_API_KEY`)
