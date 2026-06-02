# AI Declaration & Prompts Documentation

This document describes the design prompts and synthesis steps executed by the AI coding assistant to implement the **Live Polling Platform**.

---

## AI Declaration
This application was fully synthesized from user specifications using Google AI Studio's AI Coding Agent powered by advanced Gemini models. All code, styled visuals, database layers, real-time Server-Sent Events architecture, and custom SVG animations were generated programmatically with 100% type reliability and zero placeholder code.

---

## Technical Synthesis Plan & Prompts

### Phase 1: Database and Shared Schema Core
- **Goal**: Conceptualize standard, extendable entity types.
- **Action**: Declared standard interfaces in `src/types.ts` for options, demographic custom attributes, vote timestamps, latency metrics, and reusable templates.

### Phase 2: Live Real-Time Express Engine
- **Goal**: Build an online, high-performance SSE Express host.
- **Action**: Crafted a lightweight, non-blocking `server.ts` storing polls and templates. Integrated persistent JSON reading/writing, atomic vote validation checkpoints, and precise `EventSource` text streams.

### Phase 3: Aesthetic React interfaces
- **Goal**: Implement visually stunning, responsive screens for creators, presenters, and mobile voters.
- **Action**:
  - **AnimatedCharts.tsx**: Renders growing vertical bars and custom rotated donuts with exact mathematical arc stroke lengths.
  - **ConfettiEffect.tsx**: Mounts fireworks and particle side cannons using the `canvas-confetti` package.
  - **PollCreate.tsx**: Employs an index picker hydrating templates immediately, custom timer inputs, abstract landscape covers, and demographic custom question additions.
  - **PollPresenter.tsx**: Renders custom slideshow presentation options, QR projection displays, demographic result filtering, speed latency stats, and reset features.
  - **PollVoter.tsx**: Embeds local client fingerprinting, mobile-first option lists, and active results listening.
