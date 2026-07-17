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
import { exportCv } from "@/lib/cv-export/export-cv";
import { CV_TEMPLATES, CV_TEMPLATE_IDS } from "@/lib/cv-export/templates";
import type { CvContact, CvExportFormat, CvTemplateId } from "@/lib/cv-export/types";
import { toast } from "sonner";

interface CvExportMenuProps {
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

export function CvExportMenu({ markdown, company, role, contact, disabled }: CvExportMenuProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async (templateId: CvTemplateId, format: CvExportFormat) => {
    setExporting(true);
    try {
      await exportCv({
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
            className="h-8 px-2 border-white/10 hover:bg-white/5 text-slate-400 hover:text-white rounded-lg text-[10px] font-bold gap-1"
            title="Export CV as PDF or DOCX"
          >
            {exporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Export</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Download locally</DropdownMenuLabel>
          {EXPORT_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={`${option.templateId}-${option.format}`}
              disabled={exporting}
              onClick={() => handleExport(option.templateId, option.format)}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
