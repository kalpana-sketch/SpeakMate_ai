# SpeakMate AI — Submission Package

See the original submission package supplied with the project.


---

## Deployment-hardening update

The original MVP flow and visual language were preserved. The implementation is now structured for public testing:

- Frontend: `index.html`
- Serverless AI: `api/chat.js`
- Serverless events: `api/events.js`
- Serverless feedback: `api/feedback.js`
- Serverless Product Pulse aggregation: `api/analytics.js`
- Environment template: `.env.example`
- Database schema: `supabase.sql`

### Important validation rule
Product Pulse contains only real persisted tester data. Demo Mode is explicitly labeled and must not be presented as traction.

### Architecture
Browser → `/api/chat` → Google Gemini
Browser → `/api/events` → Supabase
Browser → `/api/feedback` → Supabase
Browser → `/api/analytics` → Supabase → Product Pulse

### Security
Google Gemini and Supabase service-role credentials are server-only. No conversation transcript is persisted to analytics.

### User-facing capabilities
Typed input always works. SpeechRecognition is optional. Browser speech synthesis is used for Maya where supported. AI/API failures fall back to Demo Mode.


---

## AI provider update

For the student MVP deployment, the AI layer uses **Google Gemini 2.5 Flash** instead of Anthropic Claude.

The AI request remains server-side:

Browser → `/api/chat` → Gemini API

The frontend never receives the Gemini API key.

The project is designed to work on Gemini's free API tier, subject to Google's current rate limits and free-tier terms. The product also retains automatic Demo Mode so the complete user journey remains demonstrable if the AI endpoint is unavailable.
