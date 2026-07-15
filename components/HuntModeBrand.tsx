import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const HUNTMODE_LOGO_SRC = "/huntmode-logo.png";

type HuntModeBrandVariant = "stacked" | "inline" | "icon";

interface HuntModeBrandProps {
  variant?: HuntModeBrandVariant;
  href?: string;
  className?: string;
  logoClassName?: string;
  domainClassName?: string;
  taglineClassName?: string;
  showDomain?: boolean;
  tagline?: string;
}

const logoSizes: Record<
  HuntModeBrandVariant,
  { box: string; width: number; height: number }
> = {
  stacked: { box: "h-20 w-36 sm:h-24 sm:w-44", width: 176, height: 96 },
  inline: { box: "h-10 w-[4.75rem] sm:h-11 sm:w-20", width: 80, height: 44 },
  icon: { box: "h-9 w-9", width: 36, height: 36 },
};

export function HuntModeBrand({
  variant = "stacked",
  href,
  className,
  logoClassName,
  domainClassName,
  taglineClassName,
  showDomain = true,
  tagline,
}: HuntModeBrandProps) {
  const { box, width, height } = logoSizes[variant];

  const logo = (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-xl bg-black shadow-lg shadow-indigo-500/15",
        variant === "icon" ? "rounded-xl" : "rounded-2xl",
        box,
        logoClassName
      )}
    >
      <Image
        src={HUNTMODE_LOGO_SRC}
        alt="HuntMode"
        width={width}
        height={height}
        className={cn(
          "h-full w-full",
          variant === "icon" ? "object-cover object-center" : "object-contain"
        )}
        priority={variant === "stacked"}
      />
    </div>
  );

  const content =
    variant === "stacked" ? (
      <div className={cn("flex flex-col items-center text-center", className)}>
        {logo}
        {showDomain && (
          <p
            className={cn(
              "mt-2 text-lg font-bold tracking-tight text-white sm:text-xl",
              domainClassName
            )}
          >
            HuntMode.ca
          </p>
        )}
        {tagline && (
          <p
            className={cn(
              "mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400",
              taglineClassName
            )}
          >
            {tagline}
          </p>
        )}
      </div>
    ) : variant === "icon" ? (
      <div className={className}>{logo}</div>
    ) : (
      <div className={cn("flex items-center gap-3", className)}>
        {logo}
        <div className="min-w-0">
          {showDomain && (
            <p
              className={cn(
                "text-sm font-bold leading-none tracking-tight text-white sm:text-base",
                domainClassName
              )}
            >
              HuntMode.ca
            </p>
          )}
          {tagline && (
            <p
              className={cn(
                "mt-1.5 text-[10px] font-medium text-slate-400",
                taglineClassName
              )}
            >
              {tagline}
            </p>
          )}
        </div>
      </div>
    );

  if (href) {
    return (
      <Link href={href} className="inline-flex transition-opacity hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}
