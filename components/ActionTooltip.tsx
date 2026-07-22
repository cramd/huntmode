"use client";

import { cloneElement, isValidElement, type ReactElement } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ActionTooltipProps {
  label: string;
  children: ReactElement;
  side?: "top" | "bottom" | "left" | "right";
}

export function ActionTooltip({
  label,
  children,
  side = "top",
}: ActionTooltipProps) {
  const trigger: ReactElement = isValidElement(children)
    ? cloneElement(children, {
        "aria-label": label,
        title: undefined,
      } as Record<string, unknown>)
    : children;

  return (
    <Tooltip>
      <TooltipTrigger render={trigger} />
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  );
}
