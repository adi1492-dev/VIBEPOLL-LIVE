# Quiz Mode Feature Prompt

**User:**
```
Let's add a 'Quiz Mode' to the poll creator. Sometimes this is used for trivia instead of just opinions. If Quiz Mode is enabled, the creator should be able to select one of the options as the "correct" answer. While the poll is running, don't show what's correct. But the moment the timer hits zero, highlight the correct option in green and show the voters if they got it right or wrong on their devices.
```

**Context:**
This imaginary prompt represents the genesis of the `quizMode` feature. The AI would update the `Poll` interface, add the toggle to `PollCreate.tsx`, and inject the scoring logic into the end-of-poll calculations in both `PollVoter.tsx` and `PollPresenter.tsx`.
