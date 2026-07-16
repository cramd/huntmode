import dotenv from "dotenv";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import multer from "multer";
import { validatePost } from "./lib/validate-post.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });
const REPO_ROOT = path.resolve(__dirname, "../..");
const PORT = Number(process.env.BLOG_PUBLISHER_PORT || 8787);
const HOST = process.env.BLOG_PUBLISHER_HOST || "0.0.0.0";
const AUTH_USER = process.env.BLOG_PUBLISHER_USER;
const AUTH_PASS = process.env.BLOG_PUBLISHER_PASS;

if (!AUTH_USER || !AUTH_PASS) {
  console.error("Set BLOG_PUBLISHER_USER and BLOG_PUBLISHER_PASS in tools/blog-publisher/.env");
  process.exit(1);
}

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

function basicAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Basic ")) {
    res.set("WWW-Authenticate", 'Basic realm="HuntMode Blog Publisher"');
    return res.status(401).send("Authentication required");
  }
  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const sep = decoded.indexOf(":");
  const user = decoded.slice(0, sep);
  const pass = decoded.slice(sep + 1);
  if (user !== AUTH_USER || pass !== AUTH_PASS) {
    res.set("WWW-Authenticate", 'Basic realm="HuntMode Blog Publisher"');
    return res.status(401).send("Invalid credentials");
  }
  next();
}

app.use(basicAuth);
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/validate", (req, res) => {
  const { slug, markdown, uploadedImageNames = [], allowOverwrite = false } = req.body ?? {};
  const result = validatePost({
    repoRoot: REPO_ROOT,
    slug: String(slug || "").trim(),
    markdown: String(markdown || ""),
    uploadedImageNames,
    allowOverwrite: Boolean(allowOverwrite),
  });
  res.json(result);
});

app.post("/api/publish", upload.array("images", 20), async (req, res) => {
  const slug = String(req.body.slug || "").trim();
  const markdown = String(req.body.markdown || "");
  const allowOverwrite = req.body.allowOverwrite === "true" || req.body.allowOverwrite === true;
  const uploadedNames = (req.files || []).map((f) => f.originalname);

  const validation = validatePost({
    repoRoot: REPO_ROOT,
    slug,
    markdown,
    uploadedImageNames: uploadedNames,
    allowOverwrite,
  });

  if (!validation.ok) {
    return res.status(400).json({ ok: false, errors: validation.errors, warnings: validation.warnings });
  }

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const writeLog = (line) => {
    res.write(`${line}\n`);
  };

  try {
    const imagesDir = path.join(REPO_ROOT, "blog/public/images");
    fs.mkdirSync(imagesDir, { recursive: true });

    for (const file of req.files || []) {
      const safeName = path.basename(file.originalname);
      const dest = path.join(imagesDir, safeName);
      fs.writeFileSync(dest, file.buffer);
      writeLog(`✓ Wrote blog/public/images/${safeName}`);
    }

    const postPath = path.join(REPO_ROOT, "blog/src/content/blog", `${slug}.md`);
    fs.mkdirSync(path.dirname(postPath), { recursive: true });
    fs.writeFileSync(postPath, markdown, "utf8");
    writeLog(`✓ Wrote blog/src/content/blog/${slug}.md`);

    writeLog("");
    writeLog("— Deploying blog —");
    writeLog("");

    const deployScript = path.join(REPO_ROOT, "scripts/deploy-blog.sh");
    const child = spawn("bash", [deployScript], {
      cwd: REPO_ROOT,
      env: process.env,
    });

    child.stdout.on("data", (chunk) => writeLog(chunk.toString().trimEnd()));
    child.stderr.on("data", (chunk) => writeLog(chunk.toString().trimEnd()));

    child.on("close", (code) => {
      if (code === 0) {
        writeLog("");
        writeLog(`✅ Published: https://www.huntmode.ca/blog/${slug}/`);
      } else {
        writeLog("");
        writeLog(`❌ Deploy failed (exit ${code})`);
      }
      res.end();
    });

    child.on("error", (err) => {
      writeLog(`❌ Failed to start deploy: ${err.message}`);
      res.end();
    });
  } catch (err) {
    writeLog(`❌ Publish error: ${err instanceof Error ? err.message : String(err)}`);
    res.end();
  }
});

app.listen(PORT, HOST, () => {
  console.log(`HuntMode Blog Publisher → http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`);
  console.log(`Repo root: ${REPO_ROOT}`);
});
