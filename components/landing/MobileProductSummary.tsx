import {
  MOBILE_BULLETS,
  MOBILE_SUMMARY_TITLE,
  MOBILE_TRUST,
} from "@/components/landing/copy";

export function MobileProductSummary({ className }: { className?: string }) {
  return (
    <section
      className={`border-t border-white/5 bg-slate-950/80 px-6 py-8 ${className ?? ""}`}
    >
      <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-300">
        {MOBILE_SUMMARY_TITLE}
      </h2>
      <ul className="mt-4 space-y-3">
        {MOBILE_BULLETS.map((item) => (
          <li key={item.title} className="flex gap-2 text-sm text-slate-300">
            <span className="shrink-0 font-bold text-white">{item.title}</span>
            <span className="text-slate-500">—</span>
            <span className="text-slate-400">{item.description}</span>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-xs text-slate-500">{MOBILE_TRUST}</p>
    </section>
  );
}
