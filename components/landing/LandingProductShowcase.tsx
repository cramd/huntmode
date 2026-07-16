import { BYOK_BADGE, WHAT_YOU_GET } from "@/components/landing/copy";
import { cn } from "@/lib/utils";

function WindowChrome({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
      <div className="flex items-center gap-1.5">
        <div className="h-2.5 w-2.5 rounded-full bg-red-500/50" />
        <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/50" />
        <div className="h-2.5 w-2.5 rounded-full bg-green-500/50" />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
        {title}
      </span>
    </div>
  );
}

function PreviewWindow({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-indigo-500/20 bg-slate-900/70 shadow-[0_0_40px_rgba(99,102,241,0.12)] backdrop-blur-xl",
        className
      )}
    >
      <WindowChrome title={title} />
      <div className="p-4">{children}</div>
    </div>
  );
}

function FitBadge({ score }: { score: number }) {
  const tone =
    score >= 75
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
      : score >= 50
        ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
        : "border-slate-500/30 bg-slate-500/10 text-slate-400";
  return (
    <span
      className={cn(
        "shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
        tone
      )}
    >
      {score}% fit
    </span>
  );
}

function StatusChip({ label, tone }: { label: string; tone: string }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
        tone
      )}
    >
      {label}
    </span>
  );
}

const MOCK_APPLICATIONS = [
  {
    company: "Acme Corp",
    role: "Senior Platform Engineer",
    status: "Interview",
    statusTone: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    fit: 82,
  },
  {
    company: "Northwind Labs",
    role: "Staff SRE",
    status: "Applied",
    statusTone: "border-indigo-500/30 bg-indigo-500/10 text-indigo-400",
    fit: 71,
  },
  {
    company: "Globex",
    role: "Platform Lead",
    status: "Phone screen",
    statusTone: "border-violet-500/30 bg-violet-500/10 text-violet-400",
    fit: 54,
  },
];

export function LandingProductShowcase({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative hidden min-h-screen flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950/20 to-slate-950 px-8 py-10 lg:flex",
        className
      )}
    >
      <div className="pointer-events-none absolute top-[-20%] right-[-10%] h-[50%] w-[50%] rounded-full bg-indigo-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-purple-500/10 blur-[100px]" />

      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-3">
        <PreviewWindow title="Applications">
          <div className="space-y-2 text-xs">
            {MOCK_APPLICATIONS.map((app) => (
              <div
                key={app.company}
                className="flex items-center justify-between gap-2 rounded-xl border border-white/5 bg-slate-950/40 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-white">{app.company}</p>
                  <p className="truncate text-slate-500">{app.role}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StatusChip label={app.status} tone={app.statusTone} />
                  <FitBadge score={app.fit} />
                </div>
              </div>
            ))}
          </div>
        </PreviewWindow>

        <PreviewWindow title="Analyze Fit" className="translate-x-3">
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold text-white">Senior Platform Engineer @ Acme Corp</p>
              <FitBadge score={82} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-2.5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-400/80">
                  Strengths
                </p>
                <ul className="mt-1.5 space-y-1 text-slate-400">
                  <li>→ K8s platform at scale</li>
                  <li>→ On-call &amp; SLO ownership</li>
                </ul>
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-2.5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-amber-400/80">
                  Gaps
                </p>
                <ul className="mt-1.5 space-y-1 text-slate-400">
                  <li>→ Terraform depth</li>
                  <li>→ Public speaking examples</li>
                </ul>
              </div>
            </div>
          </div>
        </PreviewWindow>

        <PreviewWindow title="Quick Battlecard" className="translate-x-6 scale-[0.97]">
          <div className="space-y-2 text-xs">
            <p className="font-bold text-white">Interview day · Acme Corp</p>
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/30 p-2.5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                Angle
              </p>
              <p className="mt-1 leading-relaxed text-slate-300">
                They&apos;re scaling K8s without a platform team — you&apos;ve done this twice.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["PLATFORM", "LEADERSHIP", "CULTURE"].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold text-amber-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </PreviewWindow>

        <div className="mt-1 rounded-2xl border border-white/5 bg-slate-900/50 p-4 backdrop-blur-sm">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            What you get
          </p>
          <div className="grid grid-cols-2 gap-3">
            {WHAT_YOU_GET.map((item) => (
              <div key={item.title} className="space-y-0.5">
                <p className="text-[11px] font-bold text-white">{item.title}</p>
                <p className="text-[10px] leading-snug text-slate-500">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative z-10 flex justify-end pt-4">
        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400">
          {BYOK_BADGE}
        </span>
      </div>
    </div>
  );
}
