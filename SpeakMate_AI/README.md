# SpeakMate AI — Local Testing Version

This version is designed so you can test the complete MVP **without deploying it**.

## What works locally

- Landing page
- 4 scenarios
- Typed conversation
- Browser speech recognition where supported
- Maya avatar states
- Maya browser text-to-speech
- Gemini 2.5 Flash conversation
- Automatic Demo Mode if Gemini fails/unavailable
- Feedback report
- Post-session survey
- Supabase analytics
- Product Pulse

## 1. Install Node.js

Install the Node.js LTS version from https://nodejs.org/

## 2. Open this folder in Command Prompt

Example:

`E:\SpeakMate2\SpeakMate_AI_Local`

## 3. Install dependencies

Run:

`npm install`

## 4. Create `.env`

Copy `.env.example` and rename the copy to:

`.env`

Put your keys in it:

`GEMINI_API_KEY=your_gemini_key`
`SUPABASE_URL=your_supabase_url`
`SUPABASE_SERVICE_ROLE_KEY=your_supabase_secret`
`PORT=3000`

Do not upload `.env` to GitHub.

## 5. Start SpeakMate

Run:

`npm start`

You should see:

`SpeakMate is running at http://localhost:3000`

Open that address in Chrome.

## Testing order

### A. Test UI without any API key
Remove/leave `GEMINI_API_KEY` blank and start the app. The conversation should automatically use Demo Mode.

### B. Test real Gemini
Add your Gemini API key to `.env`, restart `npm start`, and start a new session. Maya should generate live responses.

### C. Test analytics
For real Product Pulse persistence, configure Supabase and run `supabase.sql` first. Complete a session and survey, then open Product Pulse.

### D. Test voice
Use Chrome. If microphone permission is unavailable, typed input remains available.

## Important

The Anthropic/Claude API is not required.

No public deployment is required for local testing. Deploy only after the full local flow works.

Do not commit `.env`, API keys, or Supabase secret keys.


## Voice troubleshooting

Use the latest Google Chrome or Microsoft Edge.

### Microphone
1. Open `http://localhost:3000`.
2. Click the lock/tune icon next to the address.
3. Set **Microphone** to **Allow**.
4. Refresh the page.
5. Click the 🎤 button.
6. Speak a complete sentence and wait for the result.

If the button says microphone is unavailable, the browser did not expose SpeechRecognition. Typed input still works.

### Maya voice
Use the **🔊 Test Maya Voice** button on the landing page.

If you cannot hear it:
- Make sure Windows/browser volume is not muted.
- Check Chrome's output device.
- Try Chrome or Edge.
- Refresh once so browser voices can load.
- The conversation still works in text if speech output is unavailable.

### Real Gemini
If `GEMINI_API_KEY` is blank, the app automatically falls back to Demo Mode. This is expected.
