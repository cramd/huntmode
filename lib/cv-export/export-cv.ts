import { mergeContactIntoParsed } from "./contact-header";
import { buildCvFilename, downloadBlob } from "./download";
import { generateCvDocx } from "./generate-docx";
import { generateCvPdf } from "./generate-pdf";
import { parseCvMarkdown } from "./parse-cv-markdown";
import type { CvContact, CvExportFormat, CvTemplateId } from "./types";

export async function exportCv(options: {
  markdown: string;
  templateId: CvTemplateId;
  format: CvExportFormat;
  company: string;
  role: string;
  contact?: CvContact | null;
}): Promise<void> {
  const parsed = parseCvMarkdown(options.markdown);
  const withContact = mergeContactIntoParsed(parsed, options.contact);
  const hasContent =
    withContact.headerLines.length > 0 ||
    withContact.sections.some((section) => section.blocks.length > 0);

  if (!hasContent) {
    throw new Error("Nothing to export — add CV content first.");
  }

  const filename = buildCvFilename(options.company, options.role, options.format);
  const blob =
    options.format === "docx"
      ? await generateCvDocx(withContact, options.templateId)
      : await generateCvPdf(withContact, options.templateId);

  downloadBlob(blob, filename);
}
