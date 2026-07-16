import { loadEnv } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const blogRoot = fileURLToPath(new URL("../..", import.meta.url));
const repoRoot = path.resolve(blogRoot, "..");

export function getAnalyticsEnv(mode: string = "production") {
  const env = loadEnv(mode, repoRoot, ["NEXT_PUBLIC_", "PUBLIC_"]);
  return {
    posthogKey: env.NEXT_PUBLIC_POSTHOG_KEY ?? env.PUBLIC_POSTHOG_KEY ?? "",
    posthogHost: env.NEXT_PUBLIC_POSTHOG_HOST ?? env.PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    gaId: env.PUBLIC_GA_MEASUREMENT_ID ?? "G-M7B7K5L6WF",
  };
}
