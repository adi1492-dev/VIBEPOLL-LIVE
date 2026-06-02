/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { Poll, PollTemplate, Vote } from './src/types';

const app = express();
const PORT = 3000;

app.use(express.json());

// File paths for persistence
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
app.get('/api/polls/:id/stream', (req, res) => {
  const pollId = req.params.id;
  const poll = polls[pollId];
  
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
    savePolls();
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
app.get('/api/polls', (req, res) => {
  let changed = false;
  Object.values(polls).forEach((poll) => {
    if (checkPollExpiry(poll)) {
      changed = true;
    }
  });
  if (changed) {
    savePolls();
  }
  res.json(Object.values(polls));
});

// GET poll details
app.get('/api/polls/:id', (req, res) => {
  const poll = polls[req.params.id];
  if (!poll) {
    res.status(404).json({ error: 'Poll not found' });
    return;
  }
  if (checkPollExpiry(poll)) {
    savePolls();
    broadcastPollUpdate(poll.id, poll);
  }
  res.json(poll);
});

// CREATE a new poll
app.post('/api/polls', (req, res) => {
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

  polls[pollId] = newPoll;
  savePolls();
  res.status(201).json(newPoll);
});

// START / LAUNCH a poll (begins the countdown)
app.post('/api/polls/:id/launch', (req, res) => {
  const poll = polls[req.params.id];
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
  savePolls();
  broadcastPollUpdate(poll.id, poll);
  res.json(poll);
});

// RESET a poll to let visitors vote again (resets votes and resets to draft/clean status)
app.post('/api/polls/:id/reset', (req, res) => {
  const poll = polls[req.params.id];
  if (!poll) {
    res.status(404).json({ error: 'Poll not found' });
    return;
  }

  poll.status = 'draft';
  poll.expiresAt = null;
  poll.votes = [];
  savePolls();
  broadcastPollUpdate(poll.id, poll);
  res.json(poll);
});

// RECORD a new vote
app.post('/api/polls/:id/vote', (req, res) => {
  const pollId = req.params.id;
  const poll = polls[pollId];
  if (!poll) {
    res.status(404).json({ error: 'Poll not found' });
    return;
  }

  if (checkPollExpiry(poll)) {
    savePolls();
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
  savePolls();
  
  // Instantly broadcast the update to active listeners!
  broadcastPollUpdate(pollId, poll);
  
  res.status(201).json({ success: true, poll });
});

// DELETE a poll
app.delete('/api/polls/:id', (req, res) => {
  const pollId = req.params.id;
  if (!polls[pollId]) {
    res.status(404).json({ error: 'Poll not found' });
    return;
  }
  delete polls[pollId];
  savePolls();
  res.json({ success: true, message: 'Poll deleted successfully' });
});

// GET dynamic templates
app.get('/api/templates', (req, res) => {
  res.json(Object.values(templates));
});

// SAVE poll as template
app.post('/api/templates', (req, res) => {
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

  templates[templateId] = newTemplate;
  saveTemplates();
  res.status(201).json(newTemplate);
});

// Clean up finished streams checker
setInterval(() => {
  let changed = false;
  Object.values(polls).forEach((poll) => {
    if (checkPollExpiry(poll)) {
      changed = true;
      broadcastPollUpdate(poll.id, poll);
    }
  });
  if (changed) {
    savePolls();
  }
}, 2000);


// START DEV & PROD SERVERS SETUP
async function startServer() {
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

startServer();
