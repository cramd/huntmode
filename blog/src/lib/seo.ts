const SITE_ORIGIN = "https://www.huntmode.ca";
export const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/huntmode-lockup.png`;

export function resolveAbsoluteUrl(pathOrUrl: string, site = SITE_ORIGIN): string {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return new URL(path, site).href;
}

export function resolveOgImage(options: {
  ogImage?: string;
  coverImage?: string;
  site?: string;
}): string {
  if (options.ogImage) return resolveAbsoluteUrl(options.ogImage, options.site);
  if (options.coverImage) return resolveAbsoluteUrl(options.coverImage, options.site);
  return DEFAULT_OG_IMAGE;
}

export function estimateReadingTime(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function formatIsoDate(date: Date): string {
  return date.toISOString();
}

export function buildArticleJsonLd(input: {
  title: string;
  description: string;
  url: string;
  image: string;
  datePublished: string;
  dateModified?: string;
  author: string;
  section: string;
  keywords: string[];
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: input.title,
    description: input.description,
    url: input.url,
    image: [input.image],
    datePublished: input.datePublished,
    dateModified: input.dateModified ?? input.datePublished,
    author: {
      "@type": "Person",
      name: input.author,
    },
    publisher: {
      "@type": "Organization",
      name: "HuntMode",
      url: SITE_ORIGIN,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_ORIGIN}/huntmode-mark.png`,
      },
    },
    articleSection: input.section,
    keywords: input.keywords.join(", "),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": input.url,
    },
  };
}
