# Deploying VibePoll Live on Vercel with Turso SQLite DB

This guide provides step-by-step instructions and the complete code required to migrate the **VibePoll Live** application to work with a **Turso SQLite cloud database** and deploy it to **Vercel** using environment variables.

---

## 1. Prerequisites & Account Setup

1. **Turso Account**:
   - Sign up at [Turso](https://turso.tech/) (Free tier includes up to 500 databases and 9GB of storage).
   - Install the Turso CLI or use the Turso dashboard to create a database:
     ```bash
     turso db create vibepoll-live
     ```
   - Retrieve your **Database URL** and **Auth Token**:
     ```bash
     turso db show vibepoll-live --show-urls
     turso db tokens create vibepoll-live
     ```

2. **Vercel Account**:
   - Sign up at [Vercel](https://vercel.com).
   - Ensure you can push codes to a GitHub repository connected to Vercel.

---

## 2. Install Turso Database Client

In your project root, add the official Turso SQLite client:
```bash
npm install @libsql/client
npm install -D tsx
```

---

## 3. Database Schema Design (SQLite)

Create an initialization script at `scripts/migrate-turso.js` to create the SQLite tables instantly. This script will run on your local machine using your credentials and initialize the remote Turso DB.

Create the file `/scripts/migrate-turso.js`:

```javascript
import { createClient } from "@libsql/client";
import dotenv from "dotenv";
dotenv.config();

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("❌ Setup check: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required in your environment variables!");
  process.exit(1);
}

const db = createClient({ url, authToken });

async function initSchema() {
  console.log("⚡ Starting Turso cloud database migration...");

  try {
    // 1. Polls Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS polls (
        id TEXT PRIMARY KEY,
        question TEXT NOT NULL,
        timer INTEGER NOT NULL DEFAULT 45,
        createdAt INTEGER NOT NULL,
        expiresAt INTEGER,
        status TEXT NOT NULL DEFAULT 'draft',
        theme TEXT NOT NULL DEFAULT 'indigo',
        quizMode INTEGER NOT NULL DEFAULT 0,
        correctOptionId TEXT,
        imageUrl TEXT
      );
    `);

    // 2. Poll Demographics Configuration
    await db.execute(`
      CREATE TABLE IF NOT EXISTS poll_demographics (
        id TEXT PRIMARY KEY,
        poll_id TEXT NOT NULL,
        name TEXT NOT NULL,
        options_json TEXT NOT NULL, -- Stored as JSON serialized array
        FOREIGN KEY (poll_id) REFERENCES polls (id) ON DELETE CASCADE
      );
    `);

    // 3. Options Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS options (
        id TEXT NOT NULL,
        poll_id TEXT NOT NULL,
        text TEXT NOT NULL,
        PRIMARY KEY (id, poll_id),
        FOREIGN KEY (poll_id) REFERENCES polls (id) ON DELETE CASCADE
      );
    `);

    // 4. Votes Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS votes (
        id TEXT PRIMARY KEY,
        poll_id TEXT NOT NULL,
        optionId TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        fingerprint TEXT NOT NULL,
        demographics_json TEXT NOT NULL, -- Stored as JSON serialised object
        responseTimeMs INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (poll_id) REFERENCES polls (id) ON DELETE CASCADE
      );
    `);

    // 5. Templates Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        question TEXT NOT NULL,
        options_json TEXT NOT NULL,
        timer INTEGER NOT NULL DEFAULT 60,
        demographics_json TEXT NOT NULL,
        quizMode INTEGER NOT NULL DEFAULT 0,
        correctOptionIdIndex INTEGER,
        theme TEXT NOT NULL DEFAULT 'indigo'
      );
    `);

    console.log("✅ Database schema migrated successfully!");
  } catch (err) {
    console.error("❌ Migration failed:", err);
  }
}

initSchema();
```

To execute the migration script, run:
```bash
node scripts/migrate-turso.js
```

---

## 4. The Unified Database Layer (`src/lib/db.ts`)

Create a flexible database driver `src/lib/db.ts` to query Turso SQLite when configuration exists, otherwise falling back automatically to the standard JSON files. This ensures your local development and testing are completely unaffected!

```typescript
import { createClient } from "@libsql/client";
import { Poll, PollTemplate, Vote } from "../types";
import fs from "fs";
import path from "path";

const dbUrl = process.env.TURSO_DATABASE_URL;
const dbToken = process.env.TURSO_AUTH_TOKEN;

const isTursoEnabled = !!(dbUrl && dbToken);

const client = isTursoEnabled 
  ? createClient({ url: dbUrl!, authToken: dbToken! }) 
  : null;

// JSON fallback system files
const POLLS_FILE = path.join(process.cwd(), "polls_store.json");
const TEMPLATES_FILE = path.join(process.cwd(), "templates_store.json");

// Local fallback store
let localPolls: Record<string, Poll> = {};
let localTemplates: Record<string, PollTemplate> = {};

function initLocalFiles() {
  if (isTursoEnabled) return;
  try {
    if (fs.existsSync(POLLS_FILE)) {
      localPolls = JSON.parse(fs.readFileSync(POLLS_FILE, "utf-8"));
    }
    if (fs.existsSync(TEMPLATES_FILE)) {
      localTemplates = JSON.parse(fs.readFileSync(TEMPLATES_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("Failed to load local JSON fallback files", err);
  }
}
initLocalFiles();

function saveLocalPolls() {
  if (isTursoEnabled) return;
  fs.writeFileSync(POLLS_FILE, JSON.stringify(localPolls, null, 2), "utf-8");
}

function saveLocalTemplates() {
  if (isTursoEnabled) return;
  fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(localTemplates, null, 2), "utf-8");
}

export interface DbService {
  getPolls(): Promise<Poll[]>;
  getPoll(id: string): Promise<Poll | null>;
  createPoll(poll: Poll): Promise<Poll>;
  updatePoll(poll: Poll): Promise<Poll>;
  deletePoll(id: string): Promise<boolean>;
  addVote(pollId: string, vote: Vote): Promise<void>;
  getTemplates(): Promise<PollTemplate[]>;
  saveTemplate(template: PollTemplate): Promise<PollTemplate>;
}

export const dbService: DbService = {
  async getPolls(): Promise<Poll[]> {
    if (isTursoEnabled && client) {
      const rs = await client.execute("SELECT * FROM polls ORDER BY createdAt DESC");
      const polls: Poll[] = [];
      
      for (const row of rs.rows) {
        // Hydrate details
        const pollId = row.id as string;
        const optionsRs = await client.execute({
          sql: "SELECT * FROM options WHERE poll_id = ?",
          args: [pollId]
        });
        const demoRs = await client.execute({
          sql: "SELECT * FROM poll_demographics WHERE poll_id = ?",
          args: [pollId]
        });
        const votesRs = await client.execute({
          sql: "SELECT * FROM votes WHERE poll_id = ?",
          args: [pollId]
        });

        polls.push({
          id: pollId,
          question: row.question as string,
          options: optionsRs.rows.map(r => ({ id: r.id as string, text: r.text as string })),
          timer: Number(row.timer),
          createdAt: Number(row.createdAt),
          expiresAt: row.expiresAt ? Number(row.expiresAt) : null,
          status: row.status as "draft" | "active" | "ended",
          theme: row.theme as any,
          quizMode: Boolean(row.quizMode),
          correctOptionId: (row.correctOptionId as string) || null,
          imageUrl: (row.imageUrl as string) || null,
          demographics: demoRs.rows.map(r => ({
            id: r.id as string,
            name: r.name as string,
            options: JSON.parse(r.options_json as string)
          })),
          votes: votesRs.rows.map(r => ({
            id: r.id as string,
            optionId: r.optionId as string,
            timestamp: Number(r.timestamp),
            fingerprint: r.fingerprint as string,
            demographics: JSON.parse(r.demographics_json as string),
            responseTimeMs: Number(r.responseTimeMs)
          }))
        });
      }
      return polls;
    } else {
      return Object.values(localPolls);
    }
  },

  async getPoll(id: string): Promise<Poll | null> {
    if (isTursoEnabled && client) {
      const rs = await client.execute({
        sql: "SELECT * FROM polls WHERE id = ?",
        args: [id]
      });
      if (rs.rows.length === 0) return null;
      const row = rs.rows[0];

      const optionsRs = await client.execute({
        sql: "SELECT * FROM options WHERE poll_id = ?",
        args: [id]
      });
      const demoRs = await client.execute({
        sql: "SELECT * FROM poll_demographics WHERE poll_id = ?",
        args: [id]
      });
      const votesRs = await client.execute({
        sql: "SELECT * FROM votes WHERE poll_id = ?",
        args: [id]
      });

      return {
        id,
        question: row.question as string,
        options: optionsRs.rows.map(r => ({ id: r.id as string, text: r.text as string })),
        timer: Number(row.timer),
        createdAt: Number(row.createdAt),
        expiresAt: row.expiresAt ? Number(row.expiresAt) : null,
        status: row.status as "draft" | "active" | "ended",
        theme: row.theme as any,
        quizMode: Boolean(row.quizMode),
        correctOptionId: (row.correctOptionId as string) || null,
        imageUrl: (row.imageUrl as string) || null,
        demographics: demoRs.rows.map(r => ({
          id: r.id as string,
          name: r.name as string,
          options: JSON.parse(r.options_json as string)
        })),
        votes: votesRs.rows.map(r => ({
          id: r.id as string,
          optionId: r.optionId as string,
          timestamp: Number(r.timestamp),
          fingerprint: r.fingerprint as string,
          demographics: JSON.parse(r.demographics_json as string),
          responseTimeMs: Number(r.responseTimeMs)
        }))
      };
    } else {
      return localPolls[id] || null;
    }
  },

  async createPoll(poll: Poll): Promise<Poll> {
    if (isTursoEnabled && client) {
      await client.execute({
        sql: `INSERT INTO polls (id, question, timer, createdAt, expiresAt, status, theme, quizMode, correctOptionId, imageUrl)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          poll.id,
          poll.question,
          poll.timer,
          poll.createdAt,
          poll.expiresAt,
          poll.status,
          poll.theme,
          poll.quizMode ? 1 : 0,
          poll.correctOptionId,
          poll.imageUrl
        ]
      });

      // Insert options
      for (const opt of poll.options) {
        await client.execute({
          sql: "INSERT INTO options (id, poll_id, text) VALUES (?, ?, ?)",
          args: [opt.id, poll.id, opt.text]
        });
      }

      // Insert demographics
      for (const demo of poll.demographics) {
        await client.execute({
          sql: "INSERT INTO poll_demographics (id, poll_id, name, options_json) VALUES (?, ?, ?, ?)",
          args: [demo.id, poll.id, demo.name, JSON.stringify(demo.options)]
        });
      }
      return poll;
    } else {
      localPolls[poll.id] = poll;
      saveLocalPolls();
      return poll;
    }
  },

  async updatePoll(poll: Poll): Promise<Poll> {
    if (isTursoEnabled && client) {
      await client.execute({
        sql: `UPDATE polls SET status = ?, expiresAt = ? WHERE id = ?`,
        args: [poll.status, poll.expiresAt, poll.id]
      });

      if (poll.votes.length === 0) {
        // Reset call: truncate existing votes
        await client.execute({
          sql: "DELETE FROM votes WHERE poll_id = ?",
          args: [poll.id]
        });
      }
      return poll;
    } else {
      localPolls[poll.id] = poll;
      saveLocalPolls();
      return poll;
    }
  },

  async deletePoll(id: string): Promise<boolean> {
    if (isTursoEnabled && client) {
      await client.execute({
        sql: "DELETE FROM polls WHERE id = ?",
        args: [id]
      });
      return true;
    } else {
      if (localPolls[id]) {
        delete localPolls[id];
        saveLocalPolls();
        return true;
      }
      return false;
    }
  },

  async addVote(pollId: string, vote: Vote): Promise<void> {
    if (isTursoEnabled && client) {
      await client.execute({
        sql: `INSERT INTO votes (id, poll_id, optionId, timestamp, fingerprint, demographics_json, responseTimeMs)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          vote.id,
          pollId,
          vote.optionId,
          vote.timestamp,
          vote.fingerprint,
          JSON.stringify(vote.demographics),
          vote.responseTimeMs
        ]
      });
    } else {
      if (localPolls[pollId]) {
        localPolls[pollId].votes.push(vote);
        saveLocalPolls();
      }
    }
  },

  async getTemplates(): Promise<PollTemplate[]> {
    if (isTursoEnabled && client) {
      const rs = await client.execute("SELECT * FROM templates");
      return rs.rows.map(r => ({
        id: r.id as string,
        name: r.name as string,
        question: r.question as string,
        options: JSON.parse(r.options_json as string),
        timer: Number(r.timer),
        demographics: JSON.parse(r.demographics_json as string),
        quizMode: Boolean(r.quizMode),
        correctOptionIdIndex: r.correctOptionIdIndex !== null ? Number(r.correctOptionIdIndex) : null,
        theme: r.theme as any
      }));
    } else {
      return Object.values(localTemplates);
    }
  },

  async saveTemplate(template: PollTemplate): Promise<PollTemplate> {
    if (isTursoEnabled && client) {
      await client.execute({
        sql: `INSERT INTO templates (id, name, question, options_json, timer, demographics_json, quizMode, correctOptionIdIndex, theme)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          template.id,
          template.name,
          template.question,
          JSON.stringify(template.options),
          template.timer,
          JSON.stringify(template.demographics),
          template.quizMode ? 1 : 0,
          template.correctOptionIdIndex,
          template.theme
        ]
      });
      return template;
    } else {
      localTemplates[template.id] = template;
      saveLocalTemplates();
      return template;
    }
  }
};
```

---

## 5. Vercel Serverless Function Warning: Real-Time SSE Constraint

### The Architectural Limitation
Vercel's deployment container runtime is fully **Serverless**.
- When a user connects to Server-Sent Events (`/api/polls/:id/stream`), Vercel executes a stateless Lambda function to process the request.
- Lambda functions are **unsuitable for stateful SSE streams** as they time out (typically after 10-60s) and spin down. SSE active clients maps stored in-memory on Vercel do not persist across multiple requests or distinct serverless Lambdas.

### How to Achieve Robust Real-Time Updates on Vercel
To make your real-time presentation charts scale beautifully on Vercel, adopt one of the following architectural workflows:

#### Choice A: Long-Polling Fallback (Client-Side)
Modify client components (`PollPresenter.tsx` and `PollVoter.tsx`) to implement an elegant fallback logic. When the `EventSource` receives an error or disconnects due to serverless timeout constraints, have it periodically fetch updates using a high-frequency polling routine:

```typescript
// Replace or supplement EventSource listener with periodic polling fallback on connection failures:
useEffect(() => {
  let eventSource: EventSource | null = null;
  let intervalId: any = null;

  function connectSSE() {
    eventSource = new EventSource(`/api/polls/${pollId}/stream`);
    
    eventSource.onmessage = (event) => {
      const updatedPoll = JSON.parse(event.data);
      setPoll(updatedPoll);
    };

    eventSource.onerror = () => {
      console.warn("SSE stream disconnected. Re-routing client fallback to long-polling module...");
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      
      // Fallback: poll API every 2.5 seconds for instant dashboard updates
      if (!intervalId) {
        intervalId = setInterval(async () => {
          try {
            const res = await fetch(`/api/polls/${pollId}`);
            if (res.ok) {
              const data = await res.json();
              setPoll(data);
            }
          } catch (err) {
            console.error("Poller failed:", err);
          }
        }, 2500);
      }
    };
  }

  connectSSE();

  return () => {
    if (eventSource) eventSource.close();
    if (intervalId) clearInterval(intervalId);
  };
}, [pollId]);
```

#### Choice B: Cloud Native Pusher integration
Keep state stateless. Send vote transactions to Express and push real-time trigger payloads using a serverless-friendly cloud service like [Pusher Channel](https://pusher.com/channels) (which offers a robust free tier).

---

## 6. Configuring `vercel.json`

To tell Vercel to route any incoming requests correctly to your Express API server routes first, place a unified `vercel.json` file in your root folder:

Create the file `/vercel.json`:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.ts",
      "use": "@vercel/node"
    },
    {
      "src": "package.json",
      "use": "@vercel/static-build"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "server.ts"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ]
}
```

---

## 7. Direct Single-Container Host Deploy (Alternative Recommendation)
If you require fully intact native **SSE (Server-Sent Events) with zero timeouts, zero code fallbacks, and instantaneous updates**, deploy VibePoll directly onto **Render**, **Railway**, or **Fly.io** rather than Vercel:
- None of these platforms spin down your Node.js runtime container.
- Simply bind your GitHub repo, expose the environment variables, and the active Express server on port `3000` will handle bidirectional stream pipes seamlessly!
