import type { CvTemplateId } from "./types";

export interface CvTemplate {
  id: CvTemplateId;
  label: string;
  pageMargin: number;
  nameFontSize: number;
  contactFontSize: number;
  sectionTitleFontSize: number;
  bodyFontSize: number;
  sectionGap: number;
  blockGap: number;
  sectionUppercase: boolean;
  sectionBorderBottom: boolean;
  headerAlign: "left" | "center";
}

export const CV_TEMPLATES: Record<CvTemplateId, CvTemplate> = {
  "classic-ats": {
    id: "classic-ats",
    label: "Classic ATS",
    pageMargin: 54,
    nameFontSize: 20,
    contactFontSize: 10,
    sectionTitleFontSize: 11,
    bodyFontSize: 10,
    sectionGap: 12,
    blockGap: 3,
    sectionUppercase: true,
    sectionBorderBottom: true,
    headerAlign: "center",
  },
  "modern-compact": {
    id: "modern-compact",
    label: "Modern Compact",
    pageMargin: 44,
    nameFontSize: 22,
    contactFontSize: 9,
    sectionTitleFontSize: 11,
    bodyFontSize: 9.5,
    sectionGap: 10,
    blockGap: 2.5,
    sectionUppercase: false,
    sectionBorderBottom: true,
    headerAlign: "left",
  },
};

export const CV_TEMPLATE_IDS = Object.keys(CV_TEMPLATES) as CvTemplateId[];
