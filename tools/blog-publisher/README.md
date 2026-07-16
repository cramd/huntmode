# HuntMode Blog Publisher

Local password-protected UI to validate Astro blog posts, upload images, and deploy only the blog to production.

## Setup

```bash
cd tools/blog-publisher
npm install
cp .env.example .env   # set BLOG_PUBLISHER_USER and BLOG_PUBLISHER_PASS
```

## Run

From repo root:

```bash
npm run blog:publish-ui
```

Or from this directory:

```bash
npm start
# or
npm run blog:publish-ui
```

Opens on `http://0.0.0.0:8787` (HTTP Basic Auth required).

## Access

- **Same machine:** http://localhost:8787
- **LAN:** http://\<your-mac-lan-ip\>:8787 (find IP in System Settings → Network)
- **Remote:** Tailscale or port-forward to 8787 — use a strong password in `.env`

Do not expose this through huntmode.ca in v1.

## Workflow

1. Enter slug (kebab-case, e.g. `july-hunt`)
2. Paste full markdown including `---` frontmatter
3. Upload images referenced as `/blog/images/{filename}`
4. **Validate** — fixes errors before publish is enabled
5. **Publish** — writes files, runs `scripts/deploy-blog.sh`, streams build + rsync logs

## What gets deployed

- `public/blog/` (built static site)
- `blog/src/content/blog/` (source markdown)
- `blog/public/images/` (post images)

Then `pm2 restart huntmode` on the VPS.
