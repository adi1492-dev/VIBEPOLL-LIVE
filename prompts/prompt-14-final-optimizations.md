# Final Polish and Optimization Prompt

**User:**
```
We are getting ready to deploy. Can you review the React components and wrap expensive calculations—like finding the 'leader' option, or mapping the vote counts into percentages—inside `useMemo` hooks? Also, ensure that intervals and SSE connections are properly cleared in the `useEffect` cleanup functions so we don't leak memory if someone clicks around rapidly.
```

**Context:**
This imaginary prompt represents the final code review phase. The AI would systematically review the codebase, adding `useMemo` to the analytics computations in `PollPresenter.tsx` and ensuring strict `clearInterval` and `eventSource.close()` calls are present across the unmount hooks.
