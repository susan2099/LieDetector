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

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


## Inspiration
Over 60 million Americans fall victim to phone scams annually. We were struck by how something as simple as answering a call could become a moment of vulnerability, especially for older adults and non-tech-savvy users. That realization drove us to build a solution that restores trust in everyday communication.

## What it does
Our app, BeSafeGrandma, is a call protection system that helps users detect and avoid scam calls instantly. It analyzes conversations and flags suspicious activity to advise a user throughout the call. BeSafeGrandma can identify scam patterns, provide real-time warnings, and guide users on how to respond, acting as a smart assistant that keeps them informed and safe.

Accessibility Features:

Offers multilingual support
Easy to read responsive UI
Easy to use for elderly/non-technical users
Live call transcription
High-contrast visuals for readability
Highlights detected trigger words/phrases
Analysis summary for easy explanation

## How we built it
We built BeSafeGrandma using React for the responsive frontend and Express to set up the server. The application displays live call transcripts and alerts in real time. For speech recognition, we integrated the ElevenLabs API to deliver high-quality, low-latency, near-realtime transcription so users can see exactly what’s being said during a call.

Server-side, we're using the Gemini API to run inference and analysis on the transcript text with the Gemini Flash 2.5 Lite model, which analyzes the conversation and detects potential scams through sentiment analysis and classification. A fallback is set up to use Gemma 4 E4B running locally on the machine at a different endpoint managed by Express. Both models support structured outputs, which ensure a valid JSON output that is streamed and parsed by the frontend.

This pipeline allows BeSafeGrandma to process audio, generate transcripts, and flag suspicious behavior almost instantly.

## Challenges we ran into
1. OS Restrictions
The original idea was to have a mobile application that listens in on the conversations live on the phone call. Due to several platform restrictions on Android and iOS, this could not be done. We then shifted our approach to make a proof of concept as an accessibility focussed webapp with UI polish!

2. Application Architecture
We had trouble settling on the architecture and debated whether to have a dedicated FastAPI backend hosting our endpoints and logic, and utilize the simplicity of using Python, or to go with a more verbose but faster Express-based server to handle our endpoints. Settling on the latter and having the client handle the WebSocket transaction with ElevenLabs, we reduced our api requests by half.

3. API Restrictions
Using Gemini API at the free tier for testing, we hit rate limits really fast while also dealing with the unavailability of the models due to high demand. We settled on using a locally run model, which helped us in two ways. We have the capability of wrapping a local model for on-device inference, cutting the latency even more, and proving that we could get the local AI capability and agents pre-installed on mobile devices integrated in our inference pipeline, removing the need to run a separate model.

## Accomplishments that we're proud of
We’re proud to have built a system that can identify high-risk calls in real time with strong accuracy. Even more importantly, we created an interface that's easy to use and understand at a glance. Our solution doesn’t just alert users to scams, it gives them the confidence to answer calls and use technology on their own, making digital safety more accessible and empowering all without relying on cloud inference.

## What we learned
We learned that trust is just as important as technology. Users need to understand why something is flagged, not just that it is. We also gained insight into how rapidly scam tactics evolve, reinforcing the importance of ways for non-technical users to fight against them. Finally, we saw firsthand how impactful a simple, easy design can be in high-stress situations.

## What's next for BeSafeGrandma
Next, we plan to find a way to turn this into a native, cross-platform mobile application and add features like automatic scam call blocking and an emergency alert feature to notify trusted contacts. Our goal is to make BeSafeGrandma a standard layer of protection, so answering a call never feels like a risk.

## Built With
elevenlabs
express.js
geminiapi
gemma
javascript
ollama
python
react
typescript
vite
websocket
