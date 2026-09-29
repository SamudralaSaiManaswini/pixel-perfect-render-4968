const BANK_ID = "incident-bank";

type RecallResult = { id: string; text: string; type?: string | null };

function config() {
  const a = process.env["HINDSIGHT_BASE_URL"] ?? "";
  const b = process.env["HINDSIGHT_API_KEY"] ?? "";
  // Tolerate the two values being entered in either field.
  const isUrl = (v: string) => /^https?:\/\//i.test(v.trim());
  const baseUrl = isUrl(a) ? a : isUrl(b) ? b : "";
  const apiKey = isUrl(a) ? b : a;
  if (!baseUrl || !apiKey) {
    throw new Error(
      "Hindsight is not configured yet. Add a valid HINDSIGHT_BASE_URL (https://...) and HINDSIGHT_API_KEY.",
    );
  }
  return { baseUrl: baseUrl.trim().replace(/\/$/, ""), apiKey: apiKey.trim() };
}

async function request(path: string, body: unknown) {
  const { baseUrl, apiKey } = config();
  return fetch(`${baseUrl}/v1/default/banks/${BANK_ID}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: apiKey.startsWith("Bearer ") ? apiKey : `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
}

async function ensureBank() {
  const { baseUrl, apiKey } = config();
  await fetch(`${baseUrl}/v1/default/banks/${BANK_ID}`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      authorization: apiKey.startsWith("Bearer ") ? apiKey : `Bearer ${apiKey}`,
    },
    body: JSON.stringify({}),
  });
}

async function call<T>(path: string, body: unknown): Promise<T> {
  let res = await request(path, body);
  if (res.status === 404) {
    await ensureBank();
    res = await request(path, body);
  }
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
