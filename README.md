<div align="center">
  <h1>⚡ VibePoll Live</h1>
  <p><strong>A Real-Time, Gamified Live Polling Platform Built for Scale</strong></p>

  [![React](https://img.shields.io/badge/React-18.x-61DAFB?style=flat&logo=react)](https://reactjs.org/)
  [![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=flat&logo=vite)](https://vitejs.dev/)
  [![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat&logo=node.js)](https://nodejs.org/)
  [![Turso](https://img.shields.io/badge/Database-Turso%20(LibSQL)-000000?style=flat)](https://turso.tech/)
  [![Vercel](https://img.shields.io/badge/Deployment-Vercel-000000?style=flat&logo=vercel)](https://vercel.com/)
</div>

<br />

## 📖 Overview

**VibePoll Live** is a premium, high-performance polling engine designed as a modern alternative to tools like Mentimeter or Slido. Whether you're hosting an interactive classroom lecture, a massive tech conference, or a fast-paced trivia party game, VibePoll delivers zero-latency results wrapped in a stunning "glassmorphism" aesthetic.

Organizers can rapidly build beautiful polls with custom image banners, custom demographic segmentations, and dynamic countdown timers. As audiences participate, results instantly reflect on-screen through smoothly animated charts and culminating particle effects.

---

## ✨ Key Features

### 🚀 **For Presenters & Organizers**
* **SaaS Architecture:** Full multi-user support with secure registration, hashed passwords, and personalized polling dashboards.
* **Speaker Projection Mode:** A highly optimized, distraction-free UI mode that maximizes chart sizes, countdown timers, and QR codes for projecting on large conference screens.
* **Trivia & Game Mode:** Mark options as correct answers! The system automatically scores correctness and visually reveals the winner when the timer expires.
* **Real-Time Demographics:** Require voters to select custom criteria (e.g., "Role" or "Experience Level"). Instantly slice and filter live charts based on those segments during your presentation.
* **Dynamic Styling:** 6 premium visual theme presets and custom landscape image banners ensure your poll matches your brand identity.
* **Instant Sharing:** Automatically generates high-resolution QR codes and click-to-copy short links for your audience.

### 📱 **For Voters & Audiences**
* **Frictionless Entry:** Absolutely **zero login required**. Voters join instantly via QR scan or URL.
* **Fingerprint Protection:** A local device fingerprinting strategy strictly prevents multiple votes per device without the overhead of user accounts.
* **Real-Time Reactivity:** Unidirectional Server-Sent Events (SSE) immediately push visual updates to voters' phones, keeping them engaged.

---

## 🛠️ Technology Stack & Architecture

VibePoll operates on a "monolithic SPA" architecture served by an Express backend, intricately configured to allow seamless deployment onto restrictive Serverless Edge environments (like Vercel).

- **Frontend:** React 18, Vite, TailwindCSS (for rapid fluid layouts), Lucide-React (icons).
- **Backend API:** Node.js, Express.
- **Database:** Turso Cloud SQLite (Edge DB) via `@libsql/client`.
- **Real-Time Data Sync:** Standard Server-Sent Events (SSE) wrapped with intelligent, graceful **Long-Polling Fallbacks** to ensure 100% uptime when deployed across ephemeral serverless functions.

*(For a deeper dive into the system design, connection resilience, and schema, please see [ARCHITECTURE.md](./ARCHITECTURE.md))*

---

## ⚙️ Local Setup & Installation

### Prerequisites
* Node.js v18.x or higher
* npm or yarn

### 1. Clone & Install
```bash
git clone https://github.com/yourusername/vibepoll-live.git
cd vibepoll-live
npm install
```

### 2. Environment Variables
Copy the template `.env.example` file to create your local `.env`:
```bash
cp .env.example .env
```
Open `.env` and configure your database credentials:
```env
# Optional: If omitted, the server utilizes a volatile in-memory dictionary for immediate testing
TURSO_DATABASE_URL=libsql://your-database-name.turso.io
TURSO_AUTH_TOKEN=your-turso-secure-auth-token
```

### 3. Start Development Server
```bash
npm run dev
```
> The application runs via Vite's middleware mode, simultaneously serving the React frontend and hot-reloading the Express API on port `5173`.

---

## 📦 Building for Production

To compile the application into an optimized, minified bundle:
```bash
npm run build
```
This script executes two concurrent processes:
1. `vite build` bundles the React frontend into static assets in `/dist`.
2. `esbuild` compiles `server.ts` into a CommonJS production-ready server binary (`/dist/server.cjs`).

You can preview the compiled production environment locally:
```bash
npm start
```

---

## ☁️ Deployment (Vercel Integration)

VibePoll is pre-configured for one-click Vercel deployments. The provided `vercel.json` and dynamic `import('vite')` statements in `server.ts` ensure the Express application cleanly wraps into Vercel Serverless Functions.

1. **Push your repository** to GitHub/GitLab/Bitbucket.
2. **Import the project** in your Vercel Dashboard.
3. Ensure the Framework Preset is recognized as **Vite**.
4. In the Environment Variables settings, configure:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
5. Click **Deploy**. Vercel will build the frontend and map the `/api/*` routes to the serverless Express instance automatically.

---

## 📂 Project Structure

```text
vibepoll-live/
├── server.ts                 # Express Server (SSE, API Routes, Turso DB Logic)
├── vercel.json               # Vercel Serverless Function configuration
├── src/                      # Frontend Application
│   ├── components/           # React UI Components
│   │   ├── AuthForm.tsx      # Secure login/registration module
│   │   ├── PollCreate.tsx    # Poll organizer form
│   │   ├── PollPresenter.tsx # Full-screen live dashboard / Speaker View
│   │   ├── PollVoter.tsx     # Mobile-first unauthenticated voting interface
│   │   ├── AnimatedCharts.tsx# SVG visualization logic
│   │   └── ConfettiEffect.tsx# End-of-poll particle rendering
│   ├── App.tsx               # Primary React Router & Session Controller
│   ├── types.ts              # Global TypeScript interfaces
│   ├── index.css             # Tailwind Directives & Custom Animations
│   └── main.tsx              # React DOM entry
├── prompts/                  # Documentation on AI Collaboration workflows
└── ARCHITECTURE.md           # Technical design and infrastructure documentation
```

---

<div align="center">
  <p>Built with ❤️ and AI.</p>
</div>
