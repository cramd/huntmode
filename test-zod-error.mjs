import { z } from "zod";
import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const google = createGoogleGenerativeAI({ apiKey: "dummy" });

async function main() {
  try {
    await generateObject({
      model: google("gemini-3.5-flash"),
      prompt: "Return invalid JSON.",
      schema: z.object({ value: z.string() }),
    });
  } catch (err) {
    console.error("ERROR MESSAGE:", err.message);
  }
}

main();
