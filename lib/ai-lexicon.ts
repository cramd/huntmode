/** Consistent labels and tooltips for AI-related actions across HuntMode. */
export const AI_LEXICON = {
  cvGenerate: {
    label: "AI Tailor Document",
    tooltip: "Generate a tailored CV from your master resume and this job description",
  },
  cvRegenerate: {
    label: "Regenerate tailored CV",
    tooltip: "Regenerate the tailored CV from your master resume and job description",
  },
  clGenerate: {
    label: "AI Write Document",
    tooltip: "Generate a cover letter tailored to this role and company",
  },
  clRegenerate: {
    label: "Regenerate cover letter",
    tooltip: "Regenerate the cover letter for this application",
  },
  suggestions: {
    label: "AI Enhance — suggestions",
    tooltip: "Get AI suggestions to strengthen this document",
  },
  analyzeFit: {
    label: "Analyze Fit",
    tooltip: "Score how well your resume matches this job and surface gaps",
  },
  incorporateFit: {
    label: "Add to CV",
    tooltip: "Incorporate this fit insight into your tailored CV",
  },
  findSimilar: {
    label: "Find similar roles",
    tooltip: "Search for similar open roles to explore",
  },
  interviewPrep: {
    label: "AI Generate prep",
    tooltip: "Generate interview talking points and practice materials",
  },
  cvRevisionChat: {
    label: "CV revision chat",
    tooltip: "Ask for stylistic or strategic CV edits in natural language",
  },
  cvUpload: {
    label: "Upload CV PDF",
    tooltip: "Upload or replace the CV from a PDF",
  },
  clUpload: {
    label: "Upload cover letter PDF",
    tooltip: "Upload or replace the cover letter from a PDF",
  },
  saveDocument: {
    label: "Save document",
    tooltip: "Save your edits to this document",
  },
  undoDocument: {
    label: "Undo last change",
    tooltip: "Restore the previous version of this document",
  },
  copyDocument: {
    label: "Copy to clipboard",
    tooltip: "Copy this document text to your clipboard",
  },
  exportCv: {
    label: "Export CV",
    tooltip: "Download the tailored CV as PDF or DOCX",
  },
  exportCoverLetter: {
    label: "Export cover letter",
    tooltip: "Download the cover letter as PDF or DOCX",
  },
  clRevisionChat: {
    label: "Cover letter revision chat",
    tooltip: "Ask for stylistic or strategic cover letter edits in natural language",
  },
} as const;
