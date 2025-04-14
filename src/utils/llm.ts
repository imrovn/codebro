import { getClient } from "client";
import { config } from "configs";

export async function callLlm(systemPrompt: string, prompt: string): Promise<string> {
  const client = getClient(config);

  const response = await client.chat.completions.create({
    model: config.model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
    stream: false,
  });

  return response.choices[0]?.message.content || "";
}
