# Architecture & System Design

This document details the thought process, structural decisions, and data flows engineered for VibePoll Live.

## 1. High-Level Architecture Overview

VibePoll utilizes a "monolithic SPA" architecture served by an Express backend, designed to gracefully deploy to restrictive environments like Vercel Serverless Functions.

- **Client**: A React Single Page Application (SPA) providing separate experiences for the landing page, voter application, and the authenticated organizer dashboard.
- **API/Server**: An Express.js backend handling REST mutations (Create, Vote, Delete) and real-time streams.
- **Database**: Turso (Cloud edge SQLite) to persist users, polls, options, and vote records.

## 2. Real-Time Update Approach

The core requirement of the application is sub-second synchronization of votes across hundreds of clients. 

### Why Server-Sent Events (SSE)?
While WebSockets allow bidirectional real-time communication, they require persistent stateful socket connections. Polling systems only require **unidirectional** updates (Server -> Client). SSE uses standard HTTP, making it significantly easier to proxy through CDNs, firewalls, and requires less infrastructure overhead than a WebSocket fleet.

**The Workflow:**
1. A Presenter opens `/api/polls/:id/stream`. The Express server holds the connection open (`Connection: keep-alive`) and adds the response stream to a memory mapping.
2. A Voter submits an HTTP POST to `/api/polls/:id/vote`.
3. The Express server writes the vote to the Turso database.
4. Instantly, the Express server iterates through all active SSE response streams mapped to that `pollId` and writes the updated JSON state.
5. The React clients receive the JSON payload and re-render the Animated Charts.

### Dealing with Serverless Constraints (Vercel)
Vercel's serverless functions strictly kill connections after a timeout (often 10-60s) and do not support long-lived persistent streaming connections globally.
To bypass this constraint seamlessly:
1. The frontend attempts to establish the SSE stream.
2. If the connection drops or the browser throws an `onerror` on the `EventSource`, the frontend catches this failure.
3. It immediately gracefully falls back to **Smart Long-Polling**, executing a standard HTTP GET `/api/polls/:id` every 2.5 seconds.
This guarantees the app remains perfectly real-time during local dev or stateful hosting (Render, Heroku), but still functions flawlessly on aggressive serverless hosts like Vercel.

## 3. Storage and Data Model

Turso (LibSQL edge SQLite) was chosen because it allows rapid local development with zero setup, but scales gracefully to edge nodes globally for fast-read operations during massive simultaneous voting.

**Database Entities:**
- `users`: Hashed passwords and secure auth tokens for organizers.
- `polls`: Contains timer metadata, themes, and configuration flags. Relates to `users` via `user_id`.
- `options`: 1-to-many relationship tracking the individual text answers available for a poll.
- `votes`: 1-to-many relationship mapping voter fingerprints to option choices. Also records the ms response time latency and JSON serialized demographic configurations.
- `poll_demographics`: Stores custom fields the organizer requires before a voter can submit.

## 4. Concurrency and Rate Limits

To support 500+ concurrent voters:
1. **Device Fingerprinting**: Voters are prevented from voting twice via a locally generated unique fingerprint (`localStorage`). This bypasses the need for an expensive global authentication check. 
2. **Conflict Avoidance**: The database executes fast inserts on the `votes` table. The aggregate charting is computed on the frontend client (offloading computation away from the server). The server simply serializes the raw DB rows and ships them via SSE.
3. **Database Fallback**: If the system detects a missing `TURSO_DATABASE_URL`, the server will gracefully fallback to an ephemeral in-memory dictionary. This prevents application crashes on misconfigured edge deployments.
