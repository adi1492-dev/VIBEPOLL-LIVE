# SSE Reconnection Logic Prompt

**User:**
```
I noticed that if a user's phone goes to sleep and wakes back up, the SSE connection sometimes silently drops and they stop seeing live updates. Can you refactor the EventSource connection in the `usePoll` hook or the components to automatically detect disconnects and fall back to polling the `/api/polls/:id` endpoint every 2.5 seconds until it can recover?
```

**Context:**
This imaginary prompt captures the user working with the AI to improve system resilience. The AI would implement the `onerror` handler in the EventSource initialization to gracefully transition the client to a fallback `setInterval` polling mechanism.
