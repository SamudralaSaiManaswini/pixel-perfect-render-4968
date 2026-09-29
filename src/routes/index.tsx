import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  analyzeIncident,
  loadDemoHistory,
  recordOutcome,
} from "@/lib/incident.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Incident Memory — AI on-call assistant with agent memory" },
      {
        name: "description",
        content:
          "Paste a production error and get a fix suggestion grounded in what worked or failed in your team's past incidents.",
      },
      {
        property: "og:title",
        content: "Incident Memory — AI on-call assistant with agent memory",
      },
      {
        property: "og:description",
        content:
          "Fix suggestions for production incidents, grounded in your team's past incident outcomes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Memory = { id: string; text: string };

function Spinner() {
  return (
    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}

function Index() {
  const analyze = useServerFn(analyzeIncident);
  const record = useServerFn(recordOutcome);
  const loadDemo = useServerFn(loadDemoHistory);

  const [errorText, setErrorText] = useState("");
  const [analyzedError, setAnalyzedError] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [memories, setMemories] = useState<Memory[] | null>(null);
  const [action, setAction] = useState("");
  const [savedCount, setSavedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [failure, setFailure] = useState("");
  const [notice, setNotice] = useState("");

  const message = (e: unknown) =>
    e instanceof Error ? e.message : "Something went wrong. Try again.";

  async function onAnalyze() {
    setFailure("");
    setNotice("");
    setLoading(true);
    try {
      const res = await analyze({ data: { error: errorText } });
      setSuggestion(res.suggestion);
      setMemories(res.memories);
      setAnalyzedError(errorText);
      setAction("");
    } catch (e) {
      setFailure(message(e));
    } finally {
      setLoading(false);
    }
  }

  async function onRecord(outcome: "worked" | "failed") {
    setFailure("");
    setBusy(outcome);
    try {
      const res = await record({
        data: { error: analyzedError, suggestion, action, outcome },
      });
      setSavedCount((n) => n + res.saved);
      setAction("");
      setNotice("Memory is being processed, wait a few seconds");
    } catch (e) {
      setFailure(message(e));
    } finally {
      setBusy(null);
    }
  }

  async function onLoadDemo() {
    setFailure("");
    setBusy("demo");
    try {
      const res = await loadDemo({ data: undefined });
      setSavedCount((n) => n + res.saved);
      setNotice("Memory is being processed, wait a few seconds");
    } catch (e) {
      setFailure(message(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              Incident Memory
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Interaction 1 is generic. Later ones use what the team learned.
            </p>
          </div>
          <button
            onClick={onLoadDemo}
            disabled={busy === "demo"}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
          >
            {busy === "demo" && <Spinner />} Load demo history
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[1.2fr_1fr]">
        <section className="space-y-5">
          <div className="rounded-lg border border-border bg-card p-5">
            <label
              htmlFor="incident"
              className="text-sm font-medium text-foreground"
            >
              Paste the error or incident description
            </label>
            <textarea
              id="incident"
              value={errorText}
              onChange={(e) => setErrorText(e.target.value)}
              rows={9}
              spellCheck={false}
              placeholder="FATAL: remaining connection slots are reserved..."
              className="mt-3 w-full resize-y rounded-md border border-input bg-background p-3 font-mono text-sm leading-relaxed outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={onAnalyze}
              disabled={loading || !errorText.trim()}
              className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {loading && <Spinner />} Analyze incident
            </button>
          </div>

          {failure && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {failure}
            </p>
          )}
          {notice && (
            <p className="rounded-md border border-border bg-muted px-4 py-2 text-xs text-muted-foreground">
              {notice}
            </p>
          )}

          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-sm font-semibold">Suggested fix</h2>
            {loading ? (
              <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner /> Consulting memory…
              </p>
            ) : suggestion ? (
              <div className="mt-3 space-y-2 text-sm leading-relaxed text-foreground">
                {suggestion
                  .split("\n")
                  .filter((line) => line.trim() !== "")
                  .map((line, i) => {
                    const heading = /^#{1,6}\s/.test(line);
                    const clean = line
                      .replace(/^#{1,6}\s*/, "")
                      .replace(/\*\*/g, "")
                      .replace(/`/g, "");
                    return (
                      <p
                        key={i}
                        className={
                          heading
                            ? "pt-2 text-sm font-semibold text-foreground"
                            : "whitespace-pre-wrap text-muted-foreground"
                        }
                      >
                        {clean}
                      </p>
                    );
                  })}
              </div>

            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                No analysis yet.
              </p>
            )}

            <div className="mt-5 border-t border-border pt-4">
              <label
                htmlFor="action"
                className="text-sm font-medium text-foreground"
              >
                What did you actually do?
              </label>
              <input
                id="action"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder="Raised max_connections and added pgbouncer"
                className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => onRecord("worked")}
                  disabled={!analyzedError || busy !== null}
                  className="inline-flex items-center gap-2 rounded-md border border-[color:var(--worked)]/40 bg-[color:var(--worked)]/10 px-3 py-2 text-sm font-medium text-[color:var(--worked)] transition-colors hover:bg-[color:var(--worked)]/20 disabled:opacity-50"
                >
                  {busy === "worked" && <Spinner />} This worked
                </button>
                <button
                  onClick={() => onRecord("failed")}
                  disabled={!analyzedError || busy !== null}
                  className="inline-flex items-center gap-2 rounded-md border border-[color:var(--failed)]/40 bg-[color:var(--failed)]/10 px-3 py-2 text-sm font-medium text-[color:var(--failed)] transition-colors hover:bg-[color:var(--failed)]/20 disabled:opacity-50"
                >
                  {busy === "failed" && <Spinner />} This failed
                </button>
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm">
            Memories saved this session:{" "}
            <span className="font-mono font-semibold">{savedCount}</span>
          </div>
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-sm font-semibold">What the agent remembers</h2>
            {loading ? (
              <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner /> Recalling…
              </p>
            ) : memories && memories.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {memories.map((m) => {
                  const lower = m.text.toLowerCase();
                  const worked = lower.includes("worked");
                  const failed = lower.includes("failed");
                  return (
                    <li
                      key={m.id}
                      className="rounded-md border border-border bg-background p-3"
                    >
                      {(worked || failed) && (
                        <span
                          className={`mb-2 inline-block rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                            failed
                              ? "bg-[color:var(--failed)]/15 text-[color:var(--failed)]"
                              : "bg-[color:var(--worked)]/15 text-[color:var(--worked)]"
                          }`}
                        >
                          {failed ? "failed" : "worked"}
                        </span>
                      )}
                      <p className="font-mono text-xs leading-relaxed text-muted-foreground">
                        {m.text}
                      </p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                No relevant memories yet
              </p>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
