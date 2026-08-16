import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  imageDataUrl: z.string().min(32).max(12_000_000),
});

export const extractTextFromImage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You read text out of photos (signs, slogans, book pages, poems, handwriting). Reply with ONLY the text you see, preserving original line breaks and original language/script. No translation, no commentary, no quotes. If there is no legible text, reply with an empty string.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract the text from this photo." },
              { type: "image_url", image_url: { url: data.imageDataUrl } },
            ],
          },
        ],
      }),
    });

    if (res.status === 429) throw new Error("Rate limited — please try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted — add credits to keep using photo capture.");
    if (!res.ok) throw new Error(`Could not read the photo (${res.status}).`);

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = json.choices?.[0]?.message?.content ?? "";
    const lines = raw
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .slice(0, 12);

    return { text: lines.join("\n") };
  });
