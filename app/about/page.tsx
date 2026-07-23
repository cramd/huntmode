import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Flame,
  Lock,
  ShieldAlert,
  Target,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GithubIcon } from "@/components/landing/GithubIcon";
import { HuntModeBrand } from "@/components/HuntModeBrand";
import { DOCKER_HUB_URL, GITHUB_REPO_URL } from "@/components/landing/copy";

export const metadata: Metadata = {
  title: "About HuntMode | Why this exists",
  description:
    "HuntMode is a free BYOK interview prep HUD and AI job application assistant. Learn what it does, why it exists, and how to run it locally.",
};

const PROBLEMS = [
  {
    title: 'The "Doom Box" of Resumes',
    desc: "Storing 50 slightly different versions of your CV in random folders until you lose track of them entirely.",
  },
  {
    title: "Executive Dysfunction",
    desc: "Staring at a blinking cursor for two hours trying to write a single tailored cover letter.",
  },
  {
    title: "The Black Hole",
    desc: "Forgetting which jobs you applied to, when you applied, and where you put the job description.",
  },
  {
    title: "The Motivation Crash",
    desc: "Losing steam and abandoning the search after three days because there's no immediate feedback loop.",
  },
];

const FEATURES = [
  {
    icon: FileText,
    title: "Tailor documents in one click",
    desc: "Paste a job URL and let HuntMode adapt your Master Resume into a targeted CV and cover letter. Powered by your own AI key (OpenAI, Anthropic, or Gemini).",
  },
  {
    icon: Target,
    title: "Live interview HUD",
    desc: "Quick Battlecard, Topic Clusters, Closing Questions, and Pacing & Coverage — glanceable panels you can keep open while you talk.",
  },
  {
    icon: Flame,
    title: "Streaks & heatmaps",
    desc: "Visualize daily consistency with an application heatmap and weekly goals so momentum stays visible.",
  },
];

const STEPS = [
  {
    step: "1",
    title: "Sign in",
    desc: "Connect with Google or GitHub in seconds.",
  },
  {
    step: "2",
    title: "Load your background",
    desc: "Drop your experience into the Master Resume vault.",
  },
  {
    step: "3",
    title: "Hunt",
    desc: "Paste job URLs, generate tailored applications, and open your interview HUD before the call.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500/30">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full bg-purple-500/5 blur-[120px]" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-8 sm:px-10">
        <HuntModeBrand variant="inline" href="/" />
        <nav className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/changelog"
            className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
          >
            What&apos;s New
          </Link>
          <Link
            href="/blog/"
            className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
          >
            Blog
          </Link>
          <Link
            href="/privacy"
            className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
          >
            Privacy
          </Link>
          <Link
            href="/"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-transparent px-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl space-y-20 px-6 pb-24 sm:px-10">
        <section className="max-w-2xl space-y-5 pt-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400/80">
            What &amp; why
          </p>
          <h1 className="text-4xl font-black leading-[1.15] tracking-tight text-white sm:text-5xl">
            Job hunting with ADHD is exhausting.{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500 bg-clip-text text-transparent">
              Let&apos;s make it a game.
            </span>
          </h1>
          <p className="text-lg leading-relaxed text-slate-400">
            HuntMode is a free, open-source AI job application assistant:{" "}
            <strong className="text-slate-200">
              BYOK resume tailoring, cover letters, application tracking,
            </strong>{" "}
            and a live interview prep HUD you can actually read while you talk.
          </p>
        </section>

        <section className="space-y-10">
          <div className="max-w-2xl space-y-3">
            <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Traditional job searching wasn&apos;t built for our brains.
            </h2>
            <p className="text-sm text-slate-400">
              Administrative loops, no immediate feedback, and org chaos that
              kills momentum.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {PROBLEMS.map(({ title, desc }) => (
              <Card
                key={title}
                className="relative overflow-hidden rounded-2xl border-white/5 bg-slate-900/40 p-6"
              >
                <div className="absolute top-0 left-0 h-full w-1 bg-indigo-500/30" />
                <CardHeader className="mb-2 p-0">
                  <CardTitle className="text-lg font-bold text-white">
                    {title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <p className="text-xs leading-relaxed text-slate-400">
                    {desc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-10">
          <div className="max-w-xl space-y-3">
            <h2 className="text-2xl font-black text-white sm:text-3xl">
              Built to keep you moving forward
            </h2>
            <p className="text-sm text-slate-400">
              Structure for the admin work. Feedback for the dopamine. HUD for
              the live interview.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="space-y-4 rounded-2xl border border-white/5 bg-slate-900/40 p-6"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10">
                  <Icon className="h-5 w-5 text-indigo-400" />
                </div>
                <h3 className="text-lg font-bold text-white">{title}</h3>
                <p className="text-xs leading-relaxed text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-10">
          <div className="max-w-xl space-y-3">
            <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
              From zero to tracking in three steps
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {STEPS.map(({ step, title, desc }) => (
              <div
                key={step}
                className="space-y-4 rounded-2xl border border-white/5 bg-slate-900/40 p-6"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-base font-black text-indigo-400">
                  {step}
                </div>
                <h3 className="text-lg font-bold text-white">{title}</h3>
                <p className="text-xs leading-relaxed text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-xl sm:p-12">
          <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2">
            <div className="space-y-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10">
                <Lock className="h-5 w-5 text-emerald-400" />
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight text-white">
                Bring Your Own Key.
                <br />
                <span className="text-emerald-400">Keys stay local.</span>
              </h2>
              <p className="text-sm leading-relaxed text-slate-400">
                HuntMode doesn&apos;t mark up AI tokens. Plug in your own OpenAI,
                Anthropic, or Google Gemini API key.
              </p>
              <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                <p className="text-xs leading-relaxed text-slate-400">
                  Your API key is stored in your browser&apos;s{" "}
                  <strong className="text-slate-200">localStorage</strong>. It
                  is never saved on our servers.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {[
                {
                  title: "No subscriptions",
                  desc: "Pay pennies directly to the AI provider instead of a $20/mo wrapper.",
                },
                {
                  title: "Open source",
                  desc: "Inspect the code. Self-host if you want total control.",
                },
                {
                  title: "Your documents stay yours",
                  desc: "Master Resume and generated CVs remain under your control.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/5 bg-white/5 p-5"
                >
                  <h4 className="mb-1 flex items-center gap-2 text-sm font-bold text-white">
                    <CheckCircle2 className="h-4 w-4 text-indigo-400" />
                    {item.title}
                  </h4>
                  <p className="pl-6 text-xs text-slate-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-950 p-8 sm:p-12">
          <div className="mx-auto max-w-2xl space-y-6 text-center">
            <h2 className="text-2xl font-black text-white sm:text-3xl">
              Download &amp; run it yourself
            </h2>
            <p className="text-sm leading-relaxed text-slate-400">
              Want to tweak features, add your own panels, or keep the stack
              fully private? Clone the repo or pull the Docker image and run
              HuntMode on your machine.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-6 text-base font-bold text-slate-950 transition-colors hover:bg-slate-100 sm:w-auto"
              >
                <GithubIcon className="h-5 w-5" />
                View source on GitHub
              </a>
              <a
                href={DOCKER_HUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-slate-700 bg-slate-900/60 px-6 text-base font-bold text-white transition-colors hover:bg-slate-800 sm:w-auto"
              >
                Docker Hub image
              </a>
            </div>
            <p className="font-mono text-[11px] text-slate-500">
              docker pull cramd/huntmode
            </p>
          </div>
        </section>

        <section className="text-center">
          <Link
            href="/"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-indigo-600 px-8 text-base font-bold text-white transition-colors hover:bg-indigo-500"
          >
            Sign in to start hunting
          </Link>
        </section>
      </main>
    </div>
  );
}
