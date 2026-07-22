import { format } from "date-fns";
import type { ParsedCv } from "./types";
import { mergeContactIntoParsed } from "./contact-header";
import type { CvContact } from "./types";

export function mergeLetterExportHeader(
  parsed: ParsedCv,
  options: {
    contact?: CvContact | null;
    company: string;
    role: string;
    date?: Date;
  }
): ParsedCv {
  const withContact = mergeContactIntoParsed(parsed, options.contact);
  const dateLine = format(options.date ?? new Date(), "MMMM d, yyyy");
  const roleLine = [options.role.trim(), options.company.trim()].filter(Boolean).join(" — ");
  const metaLines = roleLine ? [dateLine, `Re: ${roleLine}`] : [dateLine];

  return {
    ...withContact,
    headerLines: [...withContact.headerLines, ...metaLines],
  };
}
