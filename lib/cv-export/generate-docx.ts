import {
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { parseInlineMarkdown } from "./parse-cv-markdown";
import { normalizeResumePunctuation } from "./pdf-safe-text";
import { CV_TEMPLATES } from "./templates";
import type { CvTemplateId, ParsedCv } from "./types";

function inlineToDocxRuns(text: string, fontSize: number): TextRun[] {
  return parseInlineMarkdown(text).map(
    (run) =>
      new TextRun({
        text: normalizeResumePunctuation(run.text),
        bold: run.bold,
        italics: run.italic,
        size: fontSize * 2,
      })
  );
}

export async function generateCvDocx(
  parsed: ParsedCv,
  templateId: CvTemplateId
): Promise<Blob> {
  const template = CV_TEMPLATES[templateId];
  const children: Paragraph[] = [];

  if (parsed.headerLines.length > 0) {
    children.push(
      new Paragraph({
        alignment: template.headerAlign === "center" ? "center" : "left",
        children: [
          new TextRun({
            text: parsed.headerLines[0],
            bold: true,
            size: template.nameFontSize * 2,
          }),
        ],
        spacing: { after: 120 },
      })
    );
    for (let i = 1; i < parsed.headerLines.length; i += 1) {
      children.push(
        new Paragraph({
          alignment: template.headerAlign === "center" ? "center" : "left",
          children: [
            new TextRun({
              text: parsed.headerLines[i],
              size: template.contactFontSize * 2,
              color: "444444",
            }),
          ],
          spacing: { after: 60 },
        })
      );
    }
    children.push(new Paragraph({ text: "", spacing: { after: template.sectionGap * 12 } }));
  }

  for (const section of parsed.sections) {
    if (section.title) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: template.sectionUppercase
                ? section.title.toUpperCase()
                : section.title,
              bold: true,
              size: template.sectionTitleFontSize * 2,
            }),
          ],
          border: template.sectionBorderBottom
            ? {
                bottom: {
                  color: "CCCCCC",
                  space: 1,
                  style: BorderStyle.SINGLE,
                  size: 6,
                },
              }
            : undefined,
          spacing: {
            before: template.sectionGap * 12,
            after: template.blockGap * 10,
          },
        })
      );
    }

    for (const block of section.blocks) {
      if (block.type === "bullet") {
        children.push(
          new Paragraph({
            children: inlineToDocxRuns(block.text, template.bodyFontSize),
            bullet: { level: 0 },
            spacing: { after: template.blockGap * 8 },
          })
        );
      } else {
        children.push(
          new Paragraph({
            children: inlineToDocxRuns(block.text, template.bodyFontSize),
            spacing: { after: template.blockGap * 10 },
          })
        );
      }
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}
