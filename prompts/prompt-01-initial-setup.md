# Initial Setup Prompt

**User:**
```
Overview
Build a live polling platform where anyone can create a poll, share it via QR code or link, and watch results animate in real-time. Think of it as a supercharged, gamified alternative to Mentimeter or Slido — perfect for classrooms, conferences, or party games.

Users create polls with multiple choice options, set a timer, and launch. Voters scan a QR code or open the link and vote. Results update in REAL TIME — bar charts grow, pie charts rotate, and when the timer hits zero, confetti explodes and the winner is revealed with a dramatic animation.

Include a "Speaker View" mode for presenters (large text, full-screen charts), mobile-first voting experience (no login required to vote), and poll analytics (response times, demographics via custom fields). Polls can be saved as templates.

Requirements
What you need to build
• Poll creation with multiple choice options, image support, and timer
• Real-time results update using WebSockets or Server-Sent Events
• Animated chart components (bar, pie, donut) with smooth transitions
• QR code generation per poll for easy sharing
• Confetti/particle animation on poll reveal
• Speaker View: full-screen, large text, presenter-friendly display
• Mobile-first voting experience — no account required to vote
• Poll analytics: response timeline, voter count, completion rate

Constraints
• Support 500+ concurrent voters on a single poll
• Results must reflect new votes within 1 second
• Polls auto-expire and become read-only after timer ends
• One vote per device (fingerprint-based, no auth required)

Bonus Features (Optional)
★ Quiz mode with correct answers and scoring
★ Word cloud visualization for open-ended responses
★ Custom themes and branding for enterprise polls
```

**Context:**
This was the very first prompt used to define the core capabilities of the platform. The AI designed a unified React interface with SSE (Server-Sent Events) for real-time syncing. It implemented fingerprinting, animated charts, and QR codes directly based on these requirements.
