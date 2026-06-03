/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@libsql/client';
import { Poll, PollTemplate, Vote } from './src/types';

const app = express();
const PORT = 3000;

app.use(express.json());

// Turso SQLite configuration
const dbUrl = process.env.TURSO_DATABASE_URL?.trim();
const dbToken = process.env.TURSO_AUTH_TOKEN?.trim();

const isTursoEnabled = !!(dbUrl && dbToken);
let db: any = null;

if (isTursoEnabled) {
  try {
    db = createClient({ url: dbUrl!, authToken: dbToken! });
    console.log('Successfully initialized Turso database client.');
  } catch (err) {
    console.error('❌ Failed to construct Turso database client (possible URL/Token format error):', err);
  }
}

// File paths for persistence (Local fallback keys)
const POLLS_FILE = path.join(process.cwd(), 'polls_store.json');
const TEMPLATES_FILE = path.join(process.cwd(), 'templates_store.json');

// Memory storage
let polls: Record<string, Poll> = {};
let templates: Record<string, PollTemplate> = {};

// In-memory active SSE clients [pollId -> Response objects]
const sseClients = new Map<string, express.Response[]>();

// Load polls from disk
function loadPolls() {
  try {
    if (fs.existsSync(POLLS_FILE)) {
      const data = fs.readFileSync(POLLS_FILE, 'utf-8');
      polls = JSON.parse(data);
      console.log(`Loaded ${Object.keys(polls).length} polls from disk.`);
    } else {
      polls = {};
    }
  } catch (error) {
    console.error('Error loading polls:', error);
    polls = {};
  }
}

// Save polls to disk
function savePolls() {
  try {
    fs.writeFileSync(POLLS_FILE, JSON.stringify(polls, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving polls:', error);
  }
}

// Load templates from disk
function loadTemplates() {
  try {
    if (fs.existsSync(TEMPLATES_FILE)) {
      const data = fs.readFileSync(TEMPLATES_FILE, 'utf-8');
      templates = JSON.parse(data);
    } else {
      // Seed with beautiful default templates
      const defaultTemplates: Record<string, PollTemplate> = {
        'icebreaker-1': {
          id: 'icebreaker-1',
          name: '🎓 Classroom Icebreaker',
          question: 'If you had to master one language overnight, which one would you choose?',
          options: ['TypeScript / JavaScript', 'Rust', 'Python', 'Go', 'Swift', 'C++'],
          timer: 60,
          demographics: [
            {
              id: 'demo-role',
              name: 'Your Current Role',
              options: ['Student', 'Professional Developer', 'Educator', 'Hobbyist']
            },
            {
              id: 'demo-exp',
              name: 'Years of Experience',
              options: ['< 1 Year', '1 - 3 Years', '3 - 5 Years', '5+ Years']
            }
          ],
          quizMode: false,
          correctOptionIdIndex: null,
          theme: 'indigo'
        },
        'trivia-1': {
          id: 'trivia-1',
          name: '🧠 Tech Trivia Challenge',
          question: 'Which of the following describes Rust\'s primary safety mechanism?',
          options: [
            'Garbage Collection',
            'Ownership and borrowing with lifetime checks',
            'Automatic reference counting (ARC)',
            'Virtual Machine sandboxing'
          ],
          timer: 45,
          demographics: [
            {
              id: 'demo-grade',
              name: 'Level of Confidence',
              options: ['Super Confident', 'Slightly Guessing', 'Purely Drunk Luck']
            }
          ],
          quizMode: true,
          correctOptionIdIndex: 1, // Rust ownership & borrowing is index 1
          theme: 'cyber'
        },
        'feedback-1': {
          id: 'feedback-1',
          name: '🎨 Product Design Session',
          question: 'What is the main priority for the upcoming redesign upgrade?',
          options: [
            'Aesthetic Visual Polish & Contrast',
            'Loading Speeds & Response Performance',
            'Smarter Analytics & Reporting Logs',
            'Offline-First Local Interactivity'
          ],
          timer: 120,
          demographics: [],
          quizMode: false,
          correctOptionIdIndex: null,
          theme: 'coral'
        }
      };
      templates = defaultTemplates;
      fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(templates, null, 2), 'utf-8');
    }
    console.log(`Loaded ${Object.keys(templates).length} templates from disk.`);
  } catch (error) {
    console.error('Error loading templates:', error);
    templates = {};
  }
}

// Save templates to disk
function saveTemplates() {
  try {
    fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(templates, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving templates:', error);
  }
}

// Initialize persistence
loadPolls();
loadTemplates();

// Initialize Turso tables if environment variables are configured
async function initTurso() {
  if (!db) {
    console.log('Turso Database url not found. Fallback to in-memory/JSON store initialization.');
    return;
  }
  console.log('Initializing Turso cloud Database schema tables...');
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

    // 2. Options Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS options (
        id TEXT NOT NULL,
        poll_id TEXT NOT NULL,
        text TEXT NOT NULL,
        PRIMARY KEY (id, poll_id),
        FOREIGN KEY (poll_id) REFERENCES polls (id) ON DELETE CASCADE
      );
    `);

    // 3. Poll Demographics Configuration
    await db.execute(`
      CREATE TABLE IF NOT EXISTS poll_demographics (
        id TEXT PRIMARY KEY,
        poll_id TEXT NOT NULL,
        name TEXT NOT NULL,
        options_json TEXT NOT NULL,
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
        demographics_json TEXT NOT NULL,
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
    console.log('✅ Turso Cloud Tables prepared successfully!');
  } catch (err) {
    console.error('❌ Failed to prepare Turso Cloud Tables:', err);
  }
}

// Database Layer Fallback Handlers
async function dbGetPoll(id: string): Promise<Poll | null> {
  if (db) {
    try {
      const rs = await db.execute({
        sql: 'SELECT * FROM polls WHERE id = ?',
        args: [id]
      });
      if (rs.rows.length === 0) return null;
      const row = rs.rows[0];

      const optionsRs = await db.execute({
        sql: 'SELECT * FROM options WHERE poll_id = ?',
        args: [id]
      });
      const demoRs = await db.execute({
        sql: 'SELECT * FROM poll_demographics WHERE poll_id = ?',
        args: [id]
      });
      const votesRs = await db.execute({
        sql: 'SELECT * FROM votes WHERE poll_id = ?',
        args: [id]
      });

      return {
        id,
        question: row.question as string,
        options: optionsRs.rows.map(r => ({ id: r.id as string, text: r.text as string })),
        timer: Number(row.timer),
        createdAt: Number(row.createdAt),
        expiresAt: row.expiresAt ? Number(row.expiresAt) : null,
        status: row.status as 'draft' | 'active' | 'ended',
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
    } catch (err) {
      console.error(`Error loading poll ${id} from Turso:`, err);
    }
  }
  return polls[id] || null;
}

async function dbGetPolls(): Promise<Poll[]> {
  if (db) {
    try {
      const rs = await db.execute('SELECT id FROM polls ORDER BY createdAt DESC');
      const list: Poll[] = [];
      for (const row of rs.rows) {
        const poll = await dbGetPoll(row.id as string);
        if (poll) list.push(poll);
      }
      return list;
    } catch (err) {
      console.error('Error loading polls from Turso:', err);
    }
  }
  return Object.values(polls);
}

async function dbSavePoll(poll: Poll): Promise<void> {
  // Sync in-memory state fallbacks
  polls[poll.id] = poll;
  savePolls();

  if (db) {
    try {
      await db.execute({
        sql: `INSERT INTO polls (id, question, timer, createdAt, expiresAt, status, theme, quizMode, correctOptionId, imageUrl)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                status = excluded.status,
                expiresAt = excluded.expiresAt,
                correctOptionId = excluded.correctOptionId`,
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

      // Sync options
      for (const opt of poll.options) {
        await db.execute({
          sql: 'INSERT OR IGNORE INTO options (id, poll_id, text) VALUES (?, ?, ?)',
          args: [opt.id, poll.id, opt.text]
        });
      }

      // Sync demographics
      for (const demo of poll.demographics) {
        await db.execute({
          sql: 'INSERT OR IGNORE INTO poll_demographics (id, poll_id, name, options_json) VALUES (?, ?, ?, ?)',
          args: [demo.id, poll.id, demo.name, JSON.stringify(demo.options)]
        });
      }

      // Sync votes
      if (poll.votes.length === 0) {
        await db.execute({
          sql: 'DELETE FROM votes WHERE poll_id = ?',
          args: [poll.id]
        });
      } else {
        for (const vote of poll.votes) {
          await db.execute({
            sql: `INSERT OR IGNORE INTO votes (id, poll_id, optionId, timestamp, fingerprint, demographics_json, responseTimeMs)
                  VALUES (?, ?, ?, ?, ?, ?, ?)`,
            args: [
              vote.id,
              poll.id,
              vote.optionId,
              vote.timestamp,
              vote.fingerprint,
              JSON.stringify(vote.demographics),
              vote.responseTimeMs
            ]
          });
        }
      }
    } catch (err) {
      console.error(`Error saving poll ${poll.id} to Turso:`, err);
    }
  }
}

async function dbDeletePoll(id: string): Promise<boolean> {
  const existed = !!polls[id];
  delete polls[id];
  savePolls();

  if (db) {
    try {
      await db.execute({
        sql: 'DELETE FROM polls WHERE id = ?',
        args: [id]
      });
      return true;
    } catch (err) {
      console.error(`Error deleting poll ${id} from Turso:`, err);
    }
  }
  return existed;
}

async function dbGetTemplates(): Promise<PollTemplate[]> {
  if (db) {
    try {
      const rs = await db.execute('SELECT * FROM templates');
      if (rs.rows.length > 0) {
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
      }
    } catch (err) {
      console.error('Error loading templates from Turso:', err);
    }
  }
  return Object.values(templates);
}

async function dbSaveTemplate(template: PollTemplate): Promise<void> {
  templates[template.id] = template;
  saveTemplates();

  if (db) {
    try {
      await db.execute({
        sql: `INSERT INTO templates (id, name, question, options_json, timer, demographics_json, quizMode, correctOptionIdIndex, theme)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                question = excluded.question,
                options_json = excluded.options_json,
                timer = excluded.timer,
                demographics_json = excluded.demographics_json,
                quizMode = excluded.quizMode,
                correctOptionIdIndex = excluded.correctOptionIdIndex,
                theme = excluded.theme`,
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
    } catch (err) {
      console.error(`Error saving template ${template.id} to Turso:`, err);
    }
  }
}

// Helper to check and finalize expired polls
function checkPollExpiry(poll: Poll): boolean {
  if (poll.status === 'active' && poll.expiresAt && Date.now() >= poll.expiresAt) {
    poll.status = 'ended';
    return true;
  }
  return false;
}

// Broadcast poll update to active SSE connections
function broadcastPollUpdate(pollId: string, updatedPoll: Poll) {
  const clients = sseClients.get(pollId) || [];
  console.log(`Broadcasting poll: ${pollId} to ${clients.length} clients`);
  const deadClients: express.Response[] = [];
  
  clients.forEach((res) => {
    try {
      res.write(`data: ${JSON.stringify(updatedPoll)}\n\n`);
    } catch (err) {
      deadClients.push(res);
    }
  });

  if (deadClients.length > 0) {
    const updatedList = clients.filter((c) => !deadClients.includes(c));
    sseClients.set(pollId, updatedList);
  }
}

// SSE Connection Endpoint
app.get('/api/polls/:id/stream', async (req, res) => {
  const pollId = req.params.id;
  const poll = await dbGetPoll(pollId);
  
  if (!poll) {
    res.status(404).json({ error: 'Poll not found' });
    return;
  }

  // Set real SSE Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // For nginx compression bypass
  });

  // Check expiry on initial stream connect
  if (checkPollExpiry(poll)) {
    await dbSavePoll(poll);
  }

  // Send current state immediately
  res.write(`data: ${JSON.stringify(poll)}\n\n`);

  // Add client
  if (!sseClients.has(pollId)) {
    sseClients.set(pollId, []);
  }
  sseClients.get(pollId)!.push(res);

  // Heartbeat interval to prevent socket timeouts
  const heartbeatInterval = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      // client likely dead
    }
  }, 20000);

  // Cleanup on connection close
  req.on('close', () => {
    clearInterval(heartbeatInterval);
    const clients = sseClients.get(pollId) || [];
    const updatedList = clients.filter((c) => c !== res);
    sseClients.set(pollId, updatedList);
    res.end();
  });
});

// GET list of active polls
app.get('/api/polls', async (req, res) => {
  const allPolls = await dbGetPolls();
  let changed = false;
  for (const poll of allPolls) {
    if (checkPollExpiry(poll)) {
      await dbSavePoll(poll);
      changed = true;
    }
  }
  const result = changed ? await dbGetPolls() : allPolls;
  res.json(result);
});

// GET poll details
app.get('/api/polls/:id', async (req, res) => {
  const poll = await dbGetPoll(req.params.id);
  if (!poll) {
    res.status(404).json({ error: 'Poll not found' });
    return;
  }
  if (checkPollExpiry(poll)) {
    await dbSavePoll(poll);
    broadcastPollUpdate(poll.id, poll);
  }
  res.json(poll);
});

// CREATE a new poll
app.post('/api/polls', async (req, res) => {
  const { question, options, timer, demographics, theme, quizMode, correctOptionId, imageUrl } = req.body;
  
  if (!question || !options || !Array.isArray(options) || options.length < 2) {
    res.status(400).json({ error: 'Question and at least 2 options are required.' });
    return;
  }

  const pollId = Math.random().toString(36).substring(2, 10);
  const newPoll: Poll = {
    id: pollId,
    question,
    options: options.map((opt: string, i: number) => ({
      id: `opt-${i}`,
      text: opt
    })),
    timer: Number(timer) || 45,
    createdAt: Date.now(),
    expiresAt: null,
    status: 'draft',
    demographics: Array.isArray(demographics) ? demographics : [],
    votes: [],
    theme: theme || 'indigo',
    quizMode: !!quizMode,
    correctOptionId: correctOptionId || null,
    imageUrl: imageUrl || null
  };

  await dbSavePoll(newPoll);
  res.status(201).json(newPoll);
});

// START / LAUNCH a poll (begins the countdown)
app.post('/api/polls/:id/launch', async (req, res) => {
  const poll = await dbGetPoll(req.params.id);
  if (!poll) {
    res.status(404).json({ error: 'Poll not found' });
    return;
  }

  if (poll.status !== 'draft') {
    res.status(400).json({ error: 'Only drafts can be launched' });
    return;
  }

  poll.status = 'active';
  poll.expiresAt = Date.now() + (poll.timer * 1000);
  await dbSavePoll(poll);
  broadcastPollUpdate(poll.id, poll);
  res.json(poll);
});

// RESET a poll to let visitors vote again (resets votes and resets to draft/clean status)
app.post('/api/polls/:id/reset', async (req, res) => {
  const poll = await dbGetPoll(req.params.id);
  if (!poll) {
    res.status(404).json({ error: 'Poll not found' });
    return;
  }

  poll.status = 'draft';
  poll.expiresAt = null;
  poll.votes = [];
  await dbSavePoll(poll);
  broadcastPollUpdate(poll.id, poll);
  res.json(poll);
});

// RECORD a new vote
app.post('/api/polls/:id/vote', async (req, res) => {
  const pollId = req.params.id;
  const poll = await dbGetPoll(pollId);
  if (!poll) {
    res.status(404).json({ error: 'Poll not found' });
    return;
  }

  if (checkPollExpiry(poll)) {
    await dbSavePoll(poll);
    broadcastPollUpdate(poll.id, poll);
    res.status(410).json({ error: 'This poll timer has run out! Voting is closed.' });
    return;
  }

  if (poll.status === 'ended') {
    res.status(410).json({ error: 'This poll has ended. Voting is closed.' });
    return;
  }

  if (poll.status === 'draft') {
    res.status(400).json({ error: 'The presenter has not launched this poll yet.' });
    return;
  }

  const { optionId, fingerprint, demographics, responseTimeMs } = req.body;

  if (!optionId || !fingerprint) {
    res.status(400).json({ error: 'optionId and device identifier fingerprint is required.' });
    return;
  }

  // Validate choice exists
  const choiceExists = poll.options.some(opt => opt.id === optionId);
  if (!choiceExists) {
    res.status(400).json({ error: 'Selected option does not exist.' });
    return;
  }

  // Enforce one vote per device
  const alreadyVoted = poll.votes.some(v => v.fingerprint === fingerprint);
  if (alreadyVoted) {
    res.status(409).json({ error: 'You have already placed a vote on this poll.' });
    return;
  }

  const newVote: Vote = {
    id: `vote-${Math.random().toString(36).substring(2, 10)}`,
    optionId,
    timestamp: Date.now(),
    fingerprint,
    demographics: demographics || {},
    responseTimeMs: Number(responseTimeMs) || 0
  };

  poll.votes.push(newVote);
  await dbSavePoll(poll);
  
  // Instantly broadcast the update to active listeners!
  broadcastPollUpdate(pollId, poll);
  
  res.status(201).json({ success: true, poll });
});

// DELETE a poll
app.delete('/api/polls/:id', async (req, res) => {
  const pollId = req.params.id;
  const deleted = await dbDeletePoll(pollId);
  if (!deleted) {
    res.status(404).json({ error: 'Poll not found' });
    return;
  }
  res.json({ success: true, message: 'Poll deleted successfully' });
});

// GET dynamic templates
app.get('/api/templates', async (req, res) => {
  const list = await dbGetTemplates();
  res.json(list);
});

// SAVE poll as template
app.post('/api/templates', async (req, res) => {
  const { name, question, options, timer, demographics, quizMode, correctOptionIdIndex, theme } = req.body;
  if (!name || !question || !options || !Array.isArray(options) || options.length < 2) {
    res.status(400).json({ error: 'Template name, question, and at least 2 options are required.' });
    return;
  }

  const templateId = `temp-${Math.random().toString(36).substring(2, 10)}`;
  const newTemplate: PollTemplate = {
    id: templateId,
    name,
    question,
    options,
    timer: Number(timer) || 60,
    demographics: Array.isArray(demographics) ? demographics : [],
    quizMode: !!quizMode,
    correctOptionIdIndex: correctOptionIdIndex !== undefined ? correctOptionIdIndex : null,
    theme: theme || 'indigo'
  };

  await dbSaveTemplate(newTemplate);
  res.status(201).json(newTemplate);
});

// Clean up finished streams checker
setInterval(async () => {
  try {
    const allPolls = await dbGetPolls();
    let changed = false;
    for (const poll of allPolls) {
      if (checkPollExpiry(poll)) {
        changed = true;
        await dbSavePoll(poll);
        broadcastPollUpdate(poll.id, poll);
      }
    }
  } catch (err) {
    // ignore
  }
}, 2000);


// START DEV & PROD SERVERS SETUP
async function startServer() {
  // Initialize Turso tables if environment variables are configured
  await initTurso();

  // Vite dev server mounting or static dist serve
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Live Polling Server deployed successfully under port ${PORT}`);
  });
}

// Do not start server when running on Vercel as a serverless function
if (process.env.VERCEL !== '1') {
  startServer();
} else {
  // Ensure tables are initialized on cold start for Vercel serverless function env
  initTurso().catch(console.error);
}

// Export default app for Vercel Serverless Function support
export default app;
