import type { Context } from "types";

export async function callLlm(context: Context, systemPrompt: string, prompt: string): Promise<string> {
  const { model, client } = context;

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
    stream: false,
  });

  return response.choices[0]?.message.content || "";
}
