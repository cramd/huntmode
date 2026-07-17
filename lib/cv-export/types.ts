export type CvBlock =
  | { type: "paragraph"; text: string }
  | { type: "bullet"; text: string };

export interface CvSection {
  title: string;
  blocks: CvBlock[];
}

export interface ParsedCv {
  headerLines: string[];
  sections: CvSection[];
}

/** Canonical contact block injected into exports from the user profile. */
export interface CvContact {
  fullName?: string;
  email?: string;
  phone?: string;
  linkedIn?: string;
  location?: string;
}

export type CvTemplateId = "classic-ats" | "modern-compact";

export type CvExportFormat = "pdf" | "docx";

export interface TextRunStyle {
  text: string;
  bold?: boolean;
  italic?: boolean;
}
