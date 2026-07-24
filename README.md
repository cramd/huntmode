# HuntMode — Job Search Assistant

Your ADHD-friendly job search command center. Track applications, generate AI-tailored CVs and cover letters, and stay motivated with goals and streak tracking.

## Editions

This repository has two long-lived branches:

- **`main`** — hosted production at [huntmode.ca](https://huntmode.ca). Deploy with `./deploy.sh` (local build + PM2 on the production server).
- **`core`** — self-host / OSS line with open sign-up and BYOK-only in-app AI.

See [docs/EDITIONS.md](docs/EDITIONS.md) for merge workflow, feature split, and env flags.

**On `main` (hosted):** copy `.env.example` with `HUNTMODE_EDITION=hosted`, set `ADMIN_EMAIL`, Firebase, and optional PostHog / tip URL. Production deploy:

```bash
./deploy.sh
```

**Self-hosting:** check out the `core` branch and follow the Docker or bare-metal sections below.

### Chrome extension

Install from the [Chrome Web Store](https://chromewebstore.google.com/detail/kejpagponmjfjcjljojamacifnbmjmbk) to save job URLs from any page and import them as draft applications. See [extension/README.md](extension/README.md) for usage.

**Development:** load unpacked from the [`extension/`](extension/) folder in Chrome.

## Features

- **AI Document Generation** — Paste a job URL, and get a tailored CV and cover letter in seconds (OpenAI GPT-4o or Claude)
- **Application Tracker** — Track every application with status, notes, and links to generated documents
- **Goals & Streaks** — Daily checklists, streak calendar (GitHub-style heatmap), and motivational milestones
- **Dashboard** — Application funnel, weekly progress ring, activity chart, and recent applications
- **Master Resume** — Store multiple resume variants; the AI adapts the right one per role
- **Document revision chat** — Iterate on tailored CVs and cover letters in natural language, then Apply or Undo
- **PDF/DOCX export** — Download tailored CVs and cover letters with your contact header
- **Onboarding & tooltips** — Sticky primary actions, export contact profile setup, and consistent AI action labels

## Thanks

Shout-out to **Rod** for being a good pony and surfacing some of the best feature ideas in this release — revision chat, export polish, onboarding contact profiles, and clearer AI controls. 🐴

## Setup

### 1. Firebase Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and create a new project
2. Enable **Authentication** → Google sign-in provider
3. Enable **Firestore** (start in production mode)
4. Enable **Storage**
5. Go to **Project Settings → Your Apps** → Add a Web App → copy the config

### 2. Environment Variables

Create a `.env.local` file by copying the example template:

```bash
cp .env.example .env.local
```

Fill in all the required variables inside `.env.local`. Note that `RESEND_API_KEY` is optional; if left blank, admin login approval URLs will print directly to the server logs for easy local testing.

Optional PostHog analytics (client-side, encouraged on hosted but not required):

```env
NEXT_PUBLIC_POSTHOG_KEY=phc_your_project_token
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

Optional tipping (“Say thanks”) — hosted only; Buy Me a Coffee, Ko-fi, Stripe Payment Link, etc.:

```env
NEXT_PUBLIC_TIP_URL=https://buymeacoffee.com/yourpage
```

When set, HuntMode shows a soft tip intro after onboarding, a sidebar/Settings CTA, and a sparkle celebration with a tip ask when applications move to Phone Screen, Interview, or Offer. Omit the variable to hide all tip UI.

### 3. Deploy Firestore Rules

```bash
npx firebase-tools@latest login
npx firebase-tools@latest use --add <YOUR_PROJECT_ID>
npx firebase-tools@latest deploy --only firestore:rules
```

### 4. Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 🐳 Self-Hosting & Deployment Options

### Option A: Docker & Docker Compose (Recommended for Self-Hosting)

A production-grade `Dockerfile` and `docker-compose.yml` are included in the repository root for simplified deployments:

1. Copy and configure your environment variables:
   ```bash
   cp .env.example .env.local
   ```
2. Build and launch the container in the background:
   ```bash
   docker compose up -d --build
   ```
The application will be accessible at `http://localhost:3000`.

### 🐳 Publishing & Using Pre-Built Images (Docker Hub)

If you want to build and publish the image to your own **Docker Hub** page so others can run it without cloning the source code:

1. **Log in to Docker Hub**:
   ```bash
   docker login
   ```
2. **Build and Tag the Image** (replace `YOUR_DOCKERHUB_USERNAME` with your actual username):
   ```bash
   docker build -t YOUR_DOCKERHUB_USERNAME/huntmode:latest .
   ```
3. **Push to Docker Hub**:
   ```bash
   docker push YOUR_DOCKERHUB_USERNAME/huntmode:latest
   ```

#### Running the Pre-Built Image
Once pushed, anyone can run your application using just a `docker-compose.yml` file and a `.env.local` file without downloading the rest of the source files. 

They can replace the `build:` block in `docker-compose.yml` with the image name:
```yaml
services:
  huntmode:
    image: YOUR_DOCKERHUB_USERNAME/huntmode:latest
    container_name: huntmode-app
    restart: always
    ports:
      - "3000:3000"
    env_file:
      - .env.local
```

### Option B: Bare-Metal VPS (PM2 & Nginx)

**Hosted production (`main` branch only):** configure `deploy.sh` with your server credentials, then:

```bash
./deploy.sh
```

This builds locally, rsyncs to the server, runs `npm install --omit=dev`, and restarts PM2 (`huntmode`).

For other VPS deployments without the HuntMode production script:

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
