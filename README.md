# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


Inspiration
Approximately 56 to 68 million Americans fall victim to phone scams annually. We were struck by how something as simple as answering a call could become a moment of vulnerability, especially for older adults and non-tech-savvy users. That realization drove us to build a solution that restores trust in everyday communication.

What it does
Our app, BeSafeGrandma, is a call protection system that helps users detect and avoid scam calls instantly. It analyzes conversations and flags suspicious activity to advise a user throughout the call. BeSafeGrandma can identify scam patterns, provide real-time warnings, and guide users on how to respond, acting as a smart assistant that keeps them informed and safe.

Accessibility Features:

Offers multilingual support
Easy to read UI
Easy to use for elderly/non-technical users
Live call transcription
High-contrast visuals for readability
How we built it
We built BeSafeGrandma using React for a responsive frontend that displays live call transcripts and alerts in real time. For speech recognition, we integrated the ElevenLabs API to deliver high-quality, low-latency transcription so users can see exactly what’s being said during a call.

On the backend, we used Python with RestAPI to handle real-time data processing and communication between services. The transcribed text is then sent to the Gemini API, which analyzes the conversation and detects potential scams using sentiment analysis and classification.

This pipeline allows BeSafeGrandma to process audio, generate transcripts, and flag suspicious behavior almost instantly.

Challenges we ran into
One major challenge was integrating the Gemini API. It was difficult to connect it reliably, perform accurate risk assessment, and make it work smoothly with our UI. We overcame this by refining our backend pipeline and iterating on our prompts to improve consistency and performance.

Accomplishments that we're proud of
We’re proud to have built a system that can identify high-risk calls in real time with strong accuracy. Even more importantly, we created an interface that's easy to use and understand at a glance. Our solution doesn’t just alert users to scams, it gives them the confidence to answer calls and use technology on their own, making digital safety more accessible and empowering.

What we learned
We learned that trust is just as important as technology. Users need to understand why something is flagged, not just that it is. We also gained insight into how rapidly scam tactics evolve, reinforcing the importance of ways for non-technical users to fight against them. Finally, we saw firsthand how impactful a simple, easy design can be in high-stress situations.

What's next for BeSafeGrandma
Next, we plan to add automatic scam call blocking and an emergency alert feature to notify trusted contacts. Our goal is to make BeSafeGrandma a standard layer of protection, so answering a call never feels like a risk.

Built With
deno
elevenlabs
geminiapi
javascript
python
react
typescript
vite
websocket
