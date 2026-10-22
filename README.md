# AI Study Assistant

A clean, beginner-friendly web application for students to understand academic concepts easily and test their knowledge with 5-question quizzes powered by Google Gemini 3.8 Flash.

---

## Features

- **Topic Explanations**: Generates clear, plain-language study breakdowns with an overview, key concepts, everyday analogies, and practical examples.
- **5-Question Practice Quizzes**: Generates 5 structured multiple-choice questions with real-time grading, score summaries, and answer explanations.
- **Encouraging, Modern UI**: Built with React, Tailwind CSS, and Lucide icons. Fully responsive and accessible.
- **Secure Architecture**: Server-side proxy with Express keeps `GEMINI_API_KEY` protected on the backend. No keys are ever exposed in client code.
- **Graceful Error Handling**: Validates empty inputs and reports AI/network issues with recovery actions.

---

## Prerequisites

- [Node.js](https://nodejs.org/) (version 18 or higher recommended)
- A Google AI Studio API key (`GEMINI_API_KEY`)

---

## Getting Started (Local Development)

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure your environment variable**:
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   Add your Gemini API key inside `.env`:
   ```env
   GEMINI_API_KEY="your-google-gemini-api-key"
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.
   The development server runs Express with Vite middleware on port 3000.

---

## Production Build & Deployment

1. **Build the frontend bundle**:
   ```bash
   npm run build
   ```
   This compiles the React application into the `dist` directory.

2. **Run the production server**:
   ```bash
   npm start
   ```
   In production, Express automatically serves static assets from `dist` while handling `/api/explain` and `/api/quiz` endpoints.

---

## Security & Best Practices

- The `@google/genai` SDK is run exclusively on the server (`server.ts`).
- The client communicates only via internal `/api/*` endpoints.
- API keys are never bundled or transmitted to the browser.
