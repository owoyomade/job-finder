import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

export const MODEL = "claude-opus-5-5";

export class AIError extends Error {
  constructor(
    message: string,
    public status = 500,
  ) {
    super(message);
  }
}

export function aiMockEnabled() {
  return process.env.AI_MOCK === "1" || !process.env.ANTHROPIC_API_KEY;
}

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic());

/**
 * Ask Claude for a JSON object matching `schema`. Streams so long outputs
 * (50+ interview answers) don't hit HTTP timeouts.
 */
export async function generateStructured<S extends z.ZodType>(opts: {
  schema: S;
  system: string;
  prompt: string;
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
}): Promise<z.infer<S>> {
  try {
    const stream = getClient().beta.messages.stream({
      model: MODEL,
      max_tokens: opts.maxTokens ?? 32000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: opts.system,
      messages: [{ role: "user", content: opts.prompt }],
      output_config: {
        effort: opts.effort ?? "medium",
        format: betaZodOutputFormat(opts.schema),
      },
    });
    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") {
      throw new AIError("Claude declined this request. Try rewording the job description or profile.", 422);
    }
    if (message.stop_reason === "max_tokens") {
      throw new AIError("The response was cut off before it finished. Try asking for fewer items.", 502);
    }
    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("");
    return opts.schema.parse(JSON.parse(text));
  } catch (err) {
    if (err instanceof AIError) throw err;
    if (err instanceof Anthropic.AuthenticationError) {
      throw new AIError("Your ANTHROPIC_API_KEY was rejected. Check .env.local.", 401);
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new AIError("Claude API rate limit reached. Wait a minute and try again.", 429);
    }
    if (err instanceof Anthropic.APIError) {
      throw new AIError(`Claude API error (${err.status}): ${err.message}`, 502);
    }
    if (err instanceof SyntaxError) {
      throw new AIError("Claude returned malformed JSON. Please try again.", 502);
    }
    throw err;
  }
}
