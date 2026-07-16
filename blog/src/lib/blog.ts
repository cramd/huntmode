import type { BlogCategory } from "../content.config";
import { CATEGORY_LABELS } from "../content.config";

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function categoryLabel(category: BlogCategory): string {
  return CATEGORY_LABELS[category];
}

export function categoryHref(category: BlogCategory): string {
  return `/blog/category/${category}/`;
}

export function isPublished(draft: boolean): boolean {
  return import.meta.env.DEV || !draft;
}

export function postSlug(id: string): string {
  return id.replace(/\.md$/, "");
}

export function postHref(id: string): string {
  return `/blog/${postSlug(id)}/`;
}

export function appHref(path = "/"): string {
  return path.startsWith("/") ? path : `/${path}`;
}
