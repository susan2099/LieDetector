# LieDetector

Real-time call transcription with ElevenLabs + scam likelihood analysis using Gemini.

## Project Structure

- `server/`: Node.js backend (token generation + Gemini analysis)
- `client/`: Vite React frontend
- `client/src/`: frontend source code

## Server Setup

1. Copy `server/.env.example` to `server/.env`
2. Fill in:
	- `ELEVENLABS_API_KEY`
	- `GEMINI_API_KEY`
	- optional `PORT` (default `3001`)
3. Install dependencies and run:

```bash
cd server
npm install
npm run dev
```

## Client Setup

```bash
cd client
npm install
npm run dev
```

Vite proxies `/scribe-token` and `/api/*` requests to `http://localhost:3001`.
