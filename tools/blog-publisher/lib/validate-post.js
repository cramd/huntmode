import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";

export const BLOG_CATEGORIES = ["product", "tips", "industry", "guest"];

const frontmatterSchema = z.object({
  title: z.string().min(1, "title is required"),
  description: z.string().min(1, "description is required"),
  pubDate: z.coerce.date({ error: "pubDate must be a valid date (YYYY-MM-DD)" }),
  updatedDate: z.coerce.date().optional(),
  category: z.enum(BLOG_CATEGORIES, {
    error: `category must be one of: ${BLOG_CATEGORIES.join(", ")}`,
  }),
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
});

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const ROOT_PUBLIC_ASSETS = new Set([
  "huntmode-logo.png",
  "huntmode-lockup.png",
  "huntmode-mark.png",
]);

function normalizeImageRef(ref) {
  if (!ref || typeof ref !== "string") return null;
  const trimmed = ref.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("/")) return trimmed;
  return null;
}

function extractInlineImagePaths(body) {
  const paths = [];
  const re = /!\[[^\]]*\]\(([^)]+)\)/g;
  let match;
  while ((match = re.exec(body)) !== null) {
    const p = normalizeImageRef(match[1]);
    if (p) paths.push(p);
  }
  return paths;
}

function imageExistsAtPath(repoRoot, imagePath, uploadedFilenames) {
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return { ok: true, kind: "url" };
  }

  if (imagePath.startsWith("/blog/images/")) {
    const filename = path.basename(imagePath);
    if (uploadedFilenames.has(filename)) return { ok: true, kind: "upload" };
    const disk = path.join(repoRoot, "blog/public/images", filename);
    if (fs.existsSync(disk)) return { ok: true, kind: "disk" };
    return { ok: false, kind: "missing", filename };
  }

  if (imagePath.startsWith("/")) {
    const rel = imagePath.slice(1);
    if (ROOT_PUBLIC_ASSETS.has(rel)) {
      const disk = path.join(repoRoot, "public", rel);
      if (fs.existsSync(disk)) return { ok: true, kind: "root-public" };
    }
    const blogPublic = path.join(repoRoot, "blog/public", rel.replace(/^blog\//, ""));
    if (fs.existsSync(blogPublic)) return { ok: true, kind: "blog-public" };
    return { ok: false, kind: "missing-root", path: imagePath };
  }

  return { ok: false, kind: "relative", path: imagePath };
}

/**
 * @param {object} input
 * @param {string} input.repoRoot
 * @param {string} input.slug
 * @param {string} input.markdown
 * @param {string[]} input.uploadedImageNames
 * @param {boolean} input.allowOverwrite
 */
export function validatePost(input) {
  const { repoRoot, slug, markdown, uploadedImageNames = [], allowOverwrite = false } = input;
  const errors = [];
  const warnings = [];
  const uploadedSet = new Set(uploadedImageNames.map((n) => path.basename(n)));

  if (!slug || !SLUG_RE.test(slug)) {
    errors.push({
      field: "slug",
      message: "Slug must be lowercase kebab-case (e.g. july-hunt)",
    });
  }

  const postPath = path.join(repoRoot, "blog/src/content/blog", `${slug}.md`);
  if (slug && SLUG_RE.test(slug) && fs.existsSync(postPath) && !allowOverwrite) {
    errors.push({
      field: "slug",
      message: `Post already exists: blog/src/content/blog/${slug}.md — enable overwrite to replace`,
    });
  }

  if (!markdown?.trim()) {
    errors.push({ field: "markdown", message: "Markdown content is required" });
    return { ok: false, errors, warnings, data: null };
  }

  let parsed;
  try {
    parsed = matter(markdown);
  } catch (err) {
    errors.push({
      field: "frontmatter",
      message: `Failed to parse frontmatter: ${err instanceof Error ? err.message : String(err)}`,
    });
    return { ok: false, errors, warnings, data: null };
  }

  if (!parsed.data || Object.keys(parsed.data).length === 0) {
    errors.push({
      field: "frontmatter",
      message: "Missing YAML frontmatter block (--- at top of file)",
    });
  }

  const body = (parsed.content || "").trim();
  if (!body) {
    errors.push({ field: "body", message: "Post body is empty after frontmatter" });
  }

  let frontmatter = null;
  if (parsed.data && Object.keys(parsed.data).length > 0) {
    const result = frontmatterSchema.safeParse(parsed.data);
    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push({
          field: issue.path.join(".") || "frontmatter",
          message: issue.message,
        });
      }
    } else {
      frontmatter = result.data;
    }
  }

  const h1Match = body.match(/^#\s+(.+)$/m);
  if (h1Match && frontmatter?.title && h1Match[1].trim() === frontmatter.title.trim()) {
    warnings.push({
      field: "body",
      message: "Body contains an H1 matching frontmatter title — Astro uses frontmatter title as the page H1",
    });
  }

  const imageRefs = new Set();
  if (frontmatter?.coverImage) {
    const ref = normalizeImageRef(frontmatter.coverImage);
    if (!ref) {
      errors.push({
        field: "coverImage",
        message: "coverImage must be an absolute path (/blog/images/...) or URL",
      });
    } else {
      imageRefs.add(ref);
    }
  }

  for (const ref of extractInlineImagePaths(body)) {
    if (!ref.startsWith("/") && !ref.startsWith("http")) {
      errors.push({
        field: "body",
        message: `Inline image must use absolute path: ${ref}`,
      });
    } else {
      imageRefs.add(ref);
    }
  }

  for (const ref of imageRefs) {
    if (ref.startsWith("http")) continue;
    const check = imageExistsAtPath(repoRoot, ref, uploadedSet);
    if (!check.ok) {
      if (check.kind === "relative") {
        errors.push({
          field: "images",
          message: `Image path must start with / : ${ref}`,
        });
      } else if (check.kind === "missing") {
        errors.push({
          field: "images",
          message: `Missing image file for ${ref} — upload ${check.filename} or add to blog/public/images/`,
        });
      } else {
        errors.push({
          field: "images",
          message: `Image not found: ${ref}`,
        });
      }
    }
  }

  if (frontmatter?.ogImage && !frontmatter.ogImage.startsWith("http")) {
    const ogCheck = imageExistsAtPath(repoRoot, frontmatter.ogImage, uploadedSet);
    if (!ogCheck.ok) {
      errors.push({
        field: "ogImage",
        message: `ogImage not found or must be a full URL: ${frontmatter.ogImage}`,
      });
    }
  }

  if (frontmatter?.description && frontmatter.description.length > 200) {
    warnings.push({
      field: "description",
      message: `Description is ${frontmatter.description.length} chars — aim for 150–160 for SEO cards`,
    });
  }

  const ok = errors.length === 0;
  return {
    ok,
    errors,
    warnings,
    data: ok
      ? {
          slug,
          frontmatter,
          body,
          postPath: `blog/src/content/blog/${slug}.md`,
          urlPath: `/blog/${slug}/`,
        }
      : null,
  };
}
