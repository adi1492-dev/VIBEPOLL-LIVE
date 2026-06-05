# Turso & Vercel Migration Prompt

**User:**
```
i want to add turso sqlite db and want to publish on vercle 
```

**Context:**
The application originally utilized an ephemeral, in-memory state dictionary for tracking polls. The user requested to migrate this robustly into a persistent Turso SQLite cloud database. 
Additionally, the user requested Vercel support. The AI handled this by modifying `server.ts` to implement `@libsql/client` while adding an elegant fallback check. It also wrapped the Express server to export itself as a module for Vercel Serverless Function compatibility.
