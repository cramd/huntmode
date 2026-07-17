import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
  type Styles,
} from "@react-pdf/renderer";
import { parseInlineMarkdown } from "./parse-cv-markdown";
import { toPdfSafeText } from "./pdf-safe-text";
import { CV_TEMPLATES, type CvTemplate } from "./templates";
import type { CvTemplateId, ParsedCv, TextRunStyle } from "./types";

type PdfTextStyle = Styles[string];

function buildStyles(template: CvTemplate) {
  return StyleSheet.create({
    page: {
      paddingTop: template.pageMargin,
      paddingBottom: template.pageMargin,
      paddingHorizontal: template.pageMargin,
      fontFamily: "Helvetica",
      fontSize: template.bodyFontSize,
      color: "#111111",
    },
    headerBlock: {
      marginBottom: 10,
      alignItems: template.headerAlign === "center" ? "center" : "flex-start",
    },
    name: {
      fontFamily: "Helvetica-Bold",
      fontSize: template.nameFontSize,
      marginBottom: 4,
      textAlign: template.headerAlign,
    },
    contact: {
      fontSize: template.contactFontSize,
      color: "#444444",
      marginBottom: 2,
      textAlign: template.headerAlign,
    },
    section: {
      marginTop: template.sectionGap,
    },
    sectionTitle: {
      fontFamily: "Helvetica-Bold",
      fontSize: template.sectionTitleFontSize,
      marginBottom: template.blockGap + 2,
      letterSpacing: template.sectionUppercase ? 0.6 : 0,
      ...(template.sectionBorderBottom
        ? {
            borderBottomWidth: 1,
            borderBottomColor: "#CCCCCC",
            paddingBottom: 3,
          }
        : {}),
    },
    paragraph: {
      marginBottom: template.blockGap + 1,
      lineHeight: 1.4,
    },
    bulletRow: {
      flexDirection: "row",
      marginBottom: template.blockGap,
      paddingRight: 4,
    },
    bulletMarker: {
      width: 12,
      fontSize: template.bodyFontSize,
      lineHeight: 1.4,
    },
    bulletText: {
      flex: 1,
      lineHeight: 1.4,
    },
  });
}

function PdfInlineRuns({
  runs,
  style,
}: {
  runs: TextRunStyle[];
  style?: PdfTextStyle;
}) {
  return (
    <Text style={style}>
      {runs.map((run, index) => (
        <Text
          key={`run-${index}`}
          style={
            run.bold
              ? { fontFamily: "Helvetica-Bold" }
              : run.italic
                ? { fontFamily: "Helvetica-Oblique" }
                : undefined
          }
        >
          {toPdfSafeText(run.text)}
        </Text>
      ))}
    </Text>
  );
}

function CvPdfDocument({
  parsed,
  template,
}: {
  parsed: ParsedCv;
  template: CvTemplate;
}) {
  const styles = buildStyles(template);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {parsed.headerLines.length > 0 ? (
          <View style={styles.headerBlock}>
            {parsed.headerLines.map((line, index) => (
              <Text
                key={`header-${index}`}
                style={index === 0 ? styles.name : styles.contact}
              >
                {toPdfSafeText(line)}
              </Text>
            ))}
          </View>
        ) : null}

        {parsed.sections.map((section, sectionIndex) => (
          <View key={`section-${sectionIndex}`} style={styles.section} wrap>
            {section.title ? (
              <Text style={styles.sectionTitle}>
                {toPdfSafeText(
                  template.sectionUppercase
                    ? section.title.toUpperCase()
                    : section.title
                )}
              </Text>
            ) : null}
            {section.blocks.map((block, blockIndex) => {
              const runs = parseInlineMarkdown(block.text);
              if (block.type === "bullet") {
                return (
                  <View
                    key={`block-${sectionIndex}-${blockIndex}`}
                    style={styles.bulletRow}
                  >
                    <Text style={styles.bulletMarker}>-</Text>
                    <PdfInlineRuns runs={runs} style={styles.bulletText} />
                  </View>
                );
              }
              return (
                <PdfInlineRuns
                  key={`block-${sectionIndex}-${blockIndex}`}
                  runs={runs}
                  style={styles.paragraph}
                />
              );
            })}
          </View>
        ))}
      </Page>
    </Document>
  );
}

export async function generateCvPdf(
  parsed: ParsedCv,
  templateId: CvTemplateId
): Promise<Blob> {
  const template = CV_TEMPLATES[templateId];
  return pdf(<CvPdfDocument parsed={parsed} template={template} />).toBlob();
}
