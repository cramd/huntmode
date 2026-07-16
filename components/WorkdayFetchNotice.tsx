import { Info } from "lucide-react";
import { isWorkdayJobUrl } from "@/lib/job-url";

interface WorkdayFetchNoticeProps {
  jobUrl: string;
  className?: string;
}

export function WorkdayFetchNotice({ jobUrl, className }: WorkdayFetchNoticeProps) {
  if (!isWorkdayJobUrl(jobUrl)) return null;

  return (
    <div
      className={`flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 ${className ?? ""}`}
    >
      <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
      <div className="space-y-1">
        <p className="text-xs font-bold text-amber-300">Workday posting detected</p>
        <p className="text-xs text-slate-400 leading-relaxed">
          Pulling details from Workday can take longer than Greenhouse, Lever, or Ashby — but it
          should still work. To skip the wait, open the posting, copy the full job description, and
          paste it in the field below.
        </p>
      </div>
    </div>
  );
}
