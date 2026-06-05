# Multi-User Authentication Request

**User:**
```
create a simple login page and admin palen for poll admin and dont show current live poll on landing page to everyone

i mean create a register or login page for all user to create a poll and track 
```

**Context:**
The user evolved the requirements from a single-admin password (where the creator was a single global entity) to a full multi-user SaaS architecture. 
The AI planned and executed a significant database schema overhaul: adding a `users` table, a `user_id` foreign key on the `polls` table, robust cryptographic password hashing endpoints, and modifying the frontend state to secure requests with `Authorization: Bearer` tokens.
