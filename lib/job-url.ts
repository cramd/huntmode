/** Detect Workday career site job posting URLs (e.g. alteryx.wd108.myworkdayjobs.com). */
export function isWorkdayJobUrl(url: string): boolean {
  if (!url.trim()) return false;
  return /\.wd\d+\.myworkdayjobs\.com/i.test(url);
}
