import { format, isValid, parseISO } from "date-fns";
import type { ApplicationStatus } from "./types";
import { STATUS_CONFIG } from "./types";

const DEFAULT_STATUS: ApplicationStatus = "draft";

export function formatApplicationDate(
  value: string | null | undefined,
  pattern = "MMM d, yyyy"
): string | null {
  if (!value || typeof value !== "string") return null;
  const parsed = parseISO(value);
  if (!isValid(parsed)) return null;
  try {
    return format(parsed, pattern);
  } catch {
    return null;
  }
}

export function getApplicationStatusConfig(status: string | null | undefined) {
  if (status && status in STATUS_CONFIG) {
    return STATUS_CONFIG[status as ApplicationStatus];
  }
  return STATUS_CONFIG[DEFAULT_STATUS];
}
