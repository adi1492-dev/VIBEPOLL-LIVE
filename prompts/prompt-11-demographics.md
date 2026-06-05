# Demographics Custom Fields Prompt

**User:**
```
We want to use this for conferences. Add a feature in the poll creator called 'Audience Demographics'. The creator can add custom fields like 'Role' (Student, Professional) or 'Experience' (Junior, Senior). Voters must select their demographics before they can submit their vote. Finally, on the presenter screen, add a dropdown filter to slice the chart results by these demographic segments in real-time.
```

**Context:**
This imaginary prompt introduces the advanced analytics layer. The AI would update the backend schema to store `poll_demographics`, alter the voter form validation logic, and implement a `useMemo` filter in the Presenter view to recalculate chart percentages based on the selected segment.
