# HuntMode Blog (Astro)

Static blog served at **https://www.huntmode.ca/blog/** alongside the Next.js app.

## Local development

```bash
cd blog
npm install
npm run dev
```

Open http://localhost:4321/blog/

Analytics (PostHog + Google Analytics) load on every blog page via `src/components/Analytics.astro`. Build reads `NEXT_PUBLIC_POSTHOG_*` from the repo root `.env.local` (same keys as the main app).

## Add a post

Create a markdown file in `src/content/blog/`:

```md
---
title: "Your post title"
description: "One-line summary for cards, social previews, and SEO (150–160 chars ideal)"
pubDate: 2026-07-14
updatedDate: 2026-07-14          # optional
category: tips                   # product | tips | industry | guest
author: HuntMode Team
tags: ["applications", "resume"]
keywords: ["job search", "resume tips", "huntmode"]
featured: false
draft: false

# Cover / social card image (1200×630 recommended)
coverImage: "/blog/images/your-cover.jpg"   # or /huntmode-lockup.png as fallback
coverImageAlt: "Describe the image for accessibility"
coverCaption: "Optional caption under hero image"

# SEO overrides (optional — defaults to title/description)
seoTitle: "Custom browser tab title | HuntMode Blog"
seoDescription: "Custom meta description for Google and social cards"
ogImage: "https://www.huntmode.ca/blog/images/your-cover.jpg"
canonicalUrl: "https://www.huntmode.ca/blog/your-slug/"  # optional
robots: "index, follow"          # or "noindex, nofollow"
readingTimeMinutes: 6            # optional — auto-calculated if omitted
---

Your content here...
```

Put cover images in `blog/public/images/` (served at `/blog/images/...`). Default OG fallback: `/huntmode-lockup.png`.

### Guest recruiter posts

```yaml
category: guest
guestAuthor: true
author: Jane Recruiter
authorTitle: Lead Recruiter, Acme Corp
```

### Syndicated / republished articles

```yaml
syndicatedFrom: https://example.com/original-article
```

### Video interviews (YouTube or Vimeo)

```yaml
videoUrl: https://www.youtube.com/watch?v=VIDEO_ID
```

## Build

```bash
npm run build
```

Output goes to `../public/blog/` and is served by Next.js at `/blog/*`.

From the repo root:

```bash
npm run blog:build
```

## Categories

| Slug | Purpose |
|------|---------|
| `product` | HuntMode feature launches and changelog-style posts |
| `tips` | Tactical job search advice |
| `industry` | Market pulse, hiring trends, tooling shifts |
| `guest` | Recruiter and hiring-leader guest posts |

Category pages: `/blog/category/{slug}/`

RSS feed: `/blog/rss.xml`
