import { mergeLetterExportHeader } from "./letter-header";
import { buildCoverLetterFilename, downloadBlob } from "./download";
import { generateCvDocx } from "./generate-docx";
import { generateCvPdf } from "./generate-pdf";
import { parseCvMarkdown } from "./parse-cv-markdown";
import { sanitizeCoverLetterMarkdown } from "./sanitize-document-markdown";
import type { CvContact, CvExportFormat, CvTemplateId } from "./types";

export async function exportCoverLetter(options: {
  markdown: string;
  templateId: CvTemplateId;
  format: CvExportFormat;
  company: string;
  role: string;
  contact?: CvContact | null;
}): Promise<void> {
  const cleaned = sanitizeCoverLetterMarkdown(options.markdown);
  const parsed = parseCvMarkdown(cleaned);
  const withHeader = mergeLetterExportHeader(parsed, {
    contact: options.contact,
    company: options.company,
    role: options.role,
  });
  const hasContent =
    withHeader.headerLines.length > 0 ||
    withHeader.sections.some((section) => section.blocks.length > 0);

  if (!hasContent) {
    throw new Error("Nothing to export — add cover letter content first.");
  }

  const filename = buildCoverLetterFilename(options.company, options.role, options.format);
  const blob =
    options.format === "docx"
      ? await generateCvDocx(withHeader, options.templateId)
      : await generateCvPdf(withHeader, options.templateId);

  downloadBlob(blob, filename);
}
