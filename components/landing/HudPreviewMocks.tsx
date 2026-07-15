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

export function HudPreviewMocks({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative hidden min-h-screen flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950/20 to-slate-950 px-8 py-10 lg:flex",
        className
      )}
    >
      <div className="pointer-events-none absolute top-[-20%] right-[-10%] h-[50%] w-[50%] rounded-full bg-indigo-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-purple-500/10 blur-[100px]" />

      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-4">
        <PreviewWindow title="Quick Battlecard">
          <div className="space-y-3 text-xs">
            <div className="flex items-start justify-between gap-2">
              <p className="font-bold text-white">
                Senior Platform Engineer @ Acme Corp
              </p>
              <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-400">
                HIGH FIT
              </span>
            </div>
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/30 p-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                Angle
              </p>
              <p className="mt-1 text-slate-300 leading-relaxed">
                They&apos;re scaling K8s without a platform team — you&apos;ve done
                this twice.
              </p>
            </div>
            <div className="rounded-xl border border-white/5 bg-slate-950/50 p-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                Value prop
              </p>
              <p className="mt-1 text-indigo-200 leading-relaxed">
                Cut MTTR 40% with observability you actually operate.
              </p>
            </div>
          </div>
        </PreviewWindow>

        <PreviewWindow title="Topic Clusters" className="translate-x-4">
          <div className="space-y-2.5 text-xs">
            {[
              {
                label: "PLATFORM",
                tags: "K8s, Terraform, on-call rotation",
                hook: "Led platform migration at…",
              },
              {
                label: "LEADERSHIP",
                tags: "cross-team RFCs",
                hook: "Drove design doc for…",
              },
              {
                label: "CULTURE",
                tags: "remote-first, async",
                hook: "Async standups, written decisions…",
              },
            ].map((cluster) => (
              <div
                key={cluster.label}
                className="rounded-xl border border-amber-500/15 bg-slate-950/40 p-3"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-black tracking-wide text-amber-400">
                    {cluster.label}
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="text-[10px] font-semibold text-amber-400/70">
                    {cluster.tags}
                  </span>
                </div>
                <p className="mt-1.5 text-slate-400">→ {cluster.hook}</p>
              </div>
            ))}
          </div>
        </PreviewWindow>

        <div className="mt-2 rounded-2xl border border-white/5 bg-slate-900/50 p-4 backdrop-blur-sm">
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
