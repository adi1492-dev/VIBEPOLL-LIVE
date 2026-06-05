# Vercel Deployment Debugging Prompt

**User:**
```
it is giving me server err 500 and its log 2026-06-05 05:06:45.568 [error] Error: Cannot find module @rollup/rollup-linux-x64-gnu. npm has a bug related to optional dependencies (https://github.com/npm/cli/issues/4828). Please try `npm i` again after removing both package-lock.json and node_modules directory.
    at requireWithFriendlyError (/var/task/node_modules/rollup/dist/native.js:115:9)
    at Object.<anonymous> (/var/task/node_modules/rollup/dist/native.js:124:76)
    [Stack trace truncated...]
  [cause]: Error: Cannot find module '@rollup/rollup-linux-x64-gnu'
```

**Context:**
When deploying to Vercel, the serverless function crashed on boot due to a missing native Rollup binary dependency pulled in indirectly by `vite`. 
The AI successfully identified that native dev-dependencies (`vite`) should not be statically imported at the top level in a Vercel production serverless function. It refactored `server.ts` to dynamically import `vite` *only* if the environment is explicitly set to development and `process.env.VERCEL !== '1'`.
