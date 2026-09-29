# Incident Memory

An AI agent for on-call engineers that remembers how past production incidents were resolved, and which fixes failed, so it can suggest the right fix first.

**Live demo:** https://pixel-perfect-render-4968.lovable.app

## The problem

The same outages keep coming back, and the fix lives in someone's head or in an old ticket. Generic AI advice like "check your servers" does not help at 3 AM.

## How it works

1. An engineer pastes an error or incident description.
2. The agent searches its memory for similar past incidents.
3. It suggests a fix that worked before and warns about fixes that failed.
4. The engineer marks the result "This worked" or "This failed", and the agent remembers the outcome for next time.

The agent suggests and a human decides. It never runs commands on servers.

## How Hindsight memory is used

Memory is the core of this project. It uses [Hindsight](https://github.com/vectorize-io/hindsight) with one memory bank (`incident-bank`) and three operations:

- **retain**: every incident and its outcome (worked or failed) is saved as a memory.
- **recall**: finds similar past incidents for a new error. These appear in the "What the agent remembers" panel.
- **reflect**: writes the suggested fix from that memory, preferring proven fixes and warning about ones that failed.

### Before vs. after memory

- **Empty memory:** the agent says it has no relevant past incident and gives brief general advice.
- **After incidents are recorded:** the agent points to the specific fix that worked for this team, and steers away from fixes that failed.

Example: after "restarting the database" is recorded as failed and "pgbouncer plus a higher max_connections" is recorded as worked, a new connection error gets the pgbouncer suggestion with a warning against a plain restart.

## Demo

1. Click **Load demo history** to save six realistic past incidents into memory.
2. Paste a new error the agent has never seen. It answers generically.
3. Paste `too many connections for role "app_user"`. It recalls the earlier fix.
4. Click **This worked** or **This failed** to teach the agent something new.

## Security

The Hindsight API key is stored as a backend secret and is never sent to the browser. Error text is treated as untrusted data only.

## Tech stack

- Frontend: React, built with Lovable
- Backend: server functions calling the Hindsight API
- Memory: Hindsight Cloud (retain, recall, reflect)

## Run locally

```bash
git clone https://github.com/SamudralaSaiManaswini/pixel-perfect-render-4968.git
cd pixel-perfect-render-4968
npm i
npm run dev
```

The backend functions and secrets run in Lovable's cloud, so a local copy needs its own Hindsight API key and base URL to reach memory.

## Roadmap

- Pull recent git commits to point at the change that likely caused an incident
- Separate memory banks per team or service
- Integrations with alerting and ticketing tools
