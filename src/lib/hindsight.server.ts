const BANK_ID = "incident-bank";

type RecallResult = { id: string; text: string; type?: string | null };

function config() {
  const baseUrl = process.env["HINDSIGHT_BASE_URL"];
  const apiKey = process.env["HINDSIGHT_API_KEY"];
  if (!baseUrl || !apiKey) {
    throw new Error(
      "Hindsight is not configured yet. Add HINDSIGHT_API_KEY and HINDSIGHT_BASE_URL.",
    );
  }
  return { baseUrl: baseUrl.replace(/\/$/, ""), apiKey };
}

async function call<T>(path: string, body: unknown): Promise<T> {
  const { baseUrl, apiKey } = config();
  const res = await fetch(`${baseUrl}/v1/default/banks/${BANK_ID}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: apiKey.startsWith("Bearer ") ? apiKey : `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Hindsight request failed (${res.status}). ${detail.slice(0, 300)}`,
    );
  }
  return (await res.json()) as T;
}

export async function recall(query: string): Promise<RecallResult[]> {
  const data = await call<{ results?: RecallResult[] }>("/memories/recall", {
    query,
    max_tokens: 2048,
  });
  return data.results ?? [];
}

export async function reflect(query: string): Promise<string> {
  const data = await call<{ text?: string }>("/reflect", { query });
  return data.text ?? "";
}

export async function retain(contents: string[]): Promise<void> {
  await call("/memories", {
    items: contents.map((content) => ({ content })),
    async: true,
  });
}
