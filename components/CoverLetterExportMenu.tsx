"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportCoverLetter } from "@/lib/cv-export/export-cover-letter";
import { CV_TEMPLATES, CV_TEMPLATE_IDS } from "@/lib/cv-export/templates";
import type { CvContact, CvExportFormat, CvTemplateId } from "@/lib/cv-export/types";
import { toast } from "sonner";

interface CoverLetterExportMenuProps {
  markdown: string;
  company: string;
  role: string;
  contact?: CvContact | null;
  disabled?: boolean;
}

const EXPORT_OPTIONS: { templateId: CvTemplateId; format: CvExportFormat; label: string }[] =
  CV_TEMPLATE_IDS.flatMap((templateId) => [
    {
      templateId,
      format: "pdf" as const,
      label: `${CV_TEMPLATES[templateId].label} (PDF)`,
    },
    {
      templateId,
      format: "docx" as const,
      label: `${CV_TEMPLATES[templateId].label} (DOCX)`,
    },
  ]);

export function CoverLetterExportMenu({
  markdown,
  company,
  role,
  contact,
  disabled,
}: CoverLetterExportMenuProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async (templateId: CvTemplateId, format: CvExportFormat) => {
    setExporting(true);
    try {
      await exportCoverLetter({
        markdown,
        templateId,
        format,
        company,
        role,
        contact,
      });
      toast.success(`Downloaded ${CV_TEMPLATES[templateId].label} ${format.toUpperCase()}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Export failed";
      toast.error(message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || exporting || !markdown.trim()}
            className="h-8 gap-1 rounded-lg border-white/10 px-2 text-[10px] font-bold text-slate-400 hover:bg-white/5 hover:text-white"
            aria-label="Export cover letter"
          >
            {exporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">Export</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="border-white/10 bg-slate-950 text-white">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-slate-400">
            Cover letter format
          </DropdownMenuLabel>
          {EXPORT_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={`${option.templateId}-${option.format}`}
              onClick={() => void handleExport(option.templateId, option.format)}
              className="text-xs focus:bg-white/5 focus:text-white"
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
