import { createServerFn } from "@tanstack/react-start";

export const DEMO_INCIDENTS = [
  "Incident: Postgres 'FATAL: remaining connection slots are reserved' during a traffic spike. Root cause: app pool size exceeded max_connections. Fix applied: put pgbouncer in transaction mode and raised max_connections from 100 to 200. Outcome: worked.",
  "Incident: API latency jumped to 8s after a deploy. Root cause: N+1 query in the orders endpoint. Fix applied: added eager loading. Outcome: worked.",
  "Incident: Redis OOM errors and evicted sessions users were logged out. Root cause: no TTL on cache keys. Fix applied: set 24h TTL and maxmemory-policy allkeys-lru. Outcome: worked.",
  "Incident: Postgres connection errors during peak. Fix applied: restarted the database server only. Outcome: failed, the errors came back within 20 minutes.",
  "Incident: pods in CrashLoopBackOff after config change. Root cause: missing environment variable DATABASE_URL in the new deployment. Fix applied: restored the secret reference and redeployed. Outcome: worked.",
  "Incident: 502 Bad Gateway from nginx. Root cause: upstream service ran out of file descriptors. Fix applied: raised ulimit to 65535 and restarted the service. Outcome: worked.",
];

export const analyzeIncident = createServerFn({ method: "POST" })
  .inputValidator((data: { error: string }) => {
    const error = (data?.error ?? "").trim();
    if (!error) throw new Error("Paste an error or incident description first.");
    return { error: error.slice(0, 8000) };
  })
  .handler(async ({ data }) => {
    const { recall, reflect } = await import("./hindsight.server");
    const memories = await recall(data.error);
    const suggestion = await reflect(
      `New incident: ${data.error}. Based on past incidents, what fix should I try first? Only recommend fixes that worked before. Explicitly warn me about fixes that failed before. Mention which past incident you are relying on. If no relevant past incident exists, say so clearly and give brief general advice.`,
    );
    return {
      memories: memories.map((m) => ({ id: m.id, text: m.text })),
      suggestion,
    };
  });

export const recordOutcome = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      error: string;
      suggestion: string;
      action: string;
      outcome: "worked" | "failed";
    }) => {
      if (!data?.error?.trim()) throw new Error("Nothing to record yet.");
      if (data.outcome !== "worked" && data.outcome !== "failed") {
        throw new Error("Invalid outcome.");
      }
      return data;
    },
  )
  .handler(async ({ data }) => {
    const { retain } = await import("./hindsight.server");
    await retain([
      `Incident: ${data.error}. Suggested fix: ${data.suggestion || "none"}. Actual action taken: ${data.action || "not specified"}. Outcome: ${data.outcome}.`,
    ]);
    return { saved: 1 };
  });

export const loadDemoHistory = createServerFn({ method: "POST" }).handler(
  async () => {
    const { retain } = await import("./hindsight.server");
    await retain(DEMO_INCIDENTS);
    return { saved: DEMO_INCIDENTS.length };
  },
);
