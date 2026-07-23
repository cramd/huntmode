import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Shield } from "lucide-react";
import { HuntModeBrand } from "@/components/HuntModeBrand";

export const metadata: Metadata = {
  title: "Privacy Policy | HuntMode",
  description:
    "How HuntMode and the HuntMode Chrome extension collect, use, and protect your data.",
  openGraph: {
    title: "Privacy Policy | HuntMode",
    description:
      "Privacy policy for HuntMode — web app, Chrome extension, and API usage.",
    url: "https://www.huntmode.ca/privacy",
  },
};

const LAST_UPDATED = "July 22, 2026";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500/30">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full bg-purple-500/5 blur-[120px]" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-8 sm:px-10">
        <HuntModeBrand variant="inline" href="/" />
        <nav className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/about"
            className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
          >
            About
          </Link>
          <Link
            href="/"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-transparent px-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Sign in
          </Link>
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl space-y-10 px-6 pb-24 sm:px-10">
        <section className="space-y-4 pt-2">
          <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400/80">
            <Shield className="h-3.5 w-3.5" />
            Privacy
          </p>
          <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="text-sm text-slate-500">Last updated: {LAST_UPDATED}</p>
          <p className="max-w-2xl text-base leading-relaxed text-slate-400">
            This policy describes how HuntMode (&ldquo;we&rdquo;, &ldquo;us&rdquo;) handles
            information when you use the HuntMode web app at{" "}
            <a href="https://www.huntmode.ca" className="text-indigo-400 hover:text-indigo-300">
              huntmode.ca
            </a>{" "}
            and the HuntMode Chrome extension.
          </p>
        </section>

        <PolicySection title="Summary">
          <ul className="list-disc space-y-2 pl-5">
            <li>We collect account and job-hunt data you choose to store in HuntMode.</li>
            <li>
              The Chrome extension only saves job URLs you explicitly queue or add — not your full
              browsing history.
            </li>
            <li>We do not sell your personal data.</li>
            <li>
              You can delete queued extension data locally, disconnect the extension, or delete your
              HuntMode account data by contacting us.
            </li>
          </ul>
        </PolicySection>

        <PolicySection title="Information we collect">
          <h3 className="text-sm font-bold text-slate-200">Account &amp; profile</h3>
          <p>
            When you sign in (Google or GitHub), we receive your account identifier, email address,
            and display name from your identity provider. You may also store a profile, job targets,
            master resumes, applications, generated documents, and interview prep notes in Firebase
            (Google Cloud).
          </p>
          <h3 className="pt-4 text-sm font-bold text-slate-200">Job postings &amp; applications</h3>
          <p>
            When you paste or save a job URL, we store the URL and may scrape public job posting
            content (role, company, description) to create draft applications. Scraping runs on
            HuntMode servers, not in your browser extension on third-party job sites.
          </p>
          <h3 className="pt-4 text-sm font-bold text-slate-200">Bring-your-own AI key (optional)</h3>
          <p>
            If you add an OpenAI, Anthropic, or Google API key in Settings, it is stored in your
            user profile in Firestore and used only to run AI features you request (tailoring,
            interview prep, etc.). We do not use your key for unrelated purposes.
          </p>
          <h3 className="pt-4 text-sm font-bold text-slate-200">Usage analytics (web app)</h3>
          <p>
            We use PostHog to understand product usage (for example: sign-in, creating an
            application, generating a document). Events may include your user id and email when you
            are signed in. We use this to improve HuntMode, not for advertising.
          </p>
        </PolicySection>

        <PolicySection title="Chrome extension">
          <p>The HuntMode extension is optional. When installed, it may collect and store:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-slate-200">Queued job URLs</strong> — URL, page title, and
              timestamp for pages you save via the popup or context menu. Stored locally in{" "}
              <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs">chrome.storage.local</code>{" "}
              on your device until you import or remove them.
            </li>
            <li>
              <strong className="text-slate-200">Authentication</strong> — After you connect the
              extension on huntmode.ca, a Firebase ID token, user id, and email are stored in{" "}
              <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs">chrome.storage.session</code>{" "}
              so &ldquo;Add to HuntMode now&rdquo; can call our API. Session storage clears when the
              browser session ends.
            </li>
            <li>
              <strong className="text-slate-200">API requests</strong> — When you add a job
              immediately, the extension sends the job URL (and optional page title) plus your auth
              token to{" "}
              <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs">
                https://www.huntmode.ca/api/applications/from-url
              </code>{" "}
              over HTTPS.
            </li>
          </ul>
          <p className="pt-2">
            The extension does not read full page content on arbitrary websites, log keystrokes, or
            download remote code. All extension logic is bundled in the published package.
          </p>
          <p className="pt-2">
            <strong className="text-slate-200">Your controls:</strong> remove items from the queue
            in the extension popup; disconnect by clearing extension storage or signing out of
            HuntMode; uninstall the extension to remove all local extension data.
          </p>
        </PolicySection>

        <PolicySection title="How we use information">
          <ul className="list-disc space-y-2 pl-5">
            <li>Provide and improve HuntMode features you request</li>
            <li>Authenticate you and keep your account secure</li>
            <li>Send transactional email (for example, access approval) when applicable</li>
            <li>Monitor reliability and fix bugs</li>
          </ul>
          <p className="pt-2">We do not sell personal information. We do not use your data for credit or lending decisions.</p>
        </PolicySection>

        <PolicySection title="Third-party services">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-slate-200">Firebase / Google Cloud</strong> — authentication
              and database hosting
            </li>
            <li>
              <strong className="text-slate-200">PostHog</strong> — product analytics on the web app
            </li>
            <li>
              <strong className="text-slate-200">AI providers</strong> — when you use AI features
              with your own API key or our configured server keys for onboarding
            </li>
            <li>
              <strong className="text-slate-200">Resend</strong> — transactional email delivery
            </li>
          </ul>
          <p className="pt-2">
            Each provider has its own privacy policy. We share only what is needed to operate the
            feature you use.
          </p>
        </PolicySection>

        <PolicySection title="Retention &amp; security">
          <p>
            Account data is kept while your account is active. Extension queue data stays on your
            device until you clear or import it. We use HTTPS in transit and industry-standard
            access controls on our servers. No method of transmission or storage is 100% secure.
          </p>
        </PolicySection>

        <PolicySection title="Your rights &amp; contact">
          <p>
            You may request access to or deletion of your HuntMode account data by emailing{" "}
            <a
              href="mailto:marcsherwood@gmail.com"
              className="text-indigo-400 hover:text-indigo-300"
            >
              marcsherwood@gmail.com
            </a>
            . We will respond within a reasonable time.
          </p>
        </PolicySection>

        <PolicySection title="Changes">
          <p>
            We may update this policy from time to time. The &ldquo;Last updated&rdquo; date at the
            top will change when we do. Continued use of HuntMode after changes means you accept the
            updated policy.
          </p>
        </PolicySection>
      </main>
    </div>
  );
}

function PolicySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-2xl border border-white/5 bg-slate-900/40 p-5 sm:p-6">
      <h2 className="text-lg font-bold text-white">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-slate-400">{children}</div>
    </section>
  );
}
