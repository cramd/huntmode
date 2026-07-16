import { defineCollection, z } from "astro:content";

export const BLOG_CATEGORIES = [
  "product",
  "tips",
  "industry",
  "guest",
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<BlogCategory, string> = {
  product: "Product updates",
  tips: "Tips & tricks",
  industry: "Job market pulse",
  guest: "Guest voices",
};

const blog = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z.enum(BLOG_CATEGORIES),
    author: z.string().default("HuntMode Team"),
    authorTitle: z.string().optional(),
    guestAuthor: z.boolean().default(false),
    syndicatedFrom: z.string().url().optional(),
    videoUrl: z.string().url().optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
    coverImage: z.string().optional(),
    coverImageAlt: z.string().optional(),
    coverCaption: z.string().optional(),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    keywords: z.array(z.string()).default([]),
    ogImage: z.string().optional(),
    canonicalUrl: z.string().url().optional(),
    robots: z.enum(["index, follow", "noindex, nofollow"]).default("index, follow"),
    readingTimeMinutes: z.number().int().positive().optional(),
  }),
});

export const collections = { blog };
