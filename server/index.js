import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const port = Number(process.env.PORT ?? 3001);

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY ?? "",
});

app.use(cors());
app.use(express.json());

function extractJsonBlock(text) {
  if (!text) return null;
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

function normalizeGeminiResponse(payload) {
  const rawScore = Number(payload?.scam_likelihood_score ?? 0);
  const scamLikelihoodScore = Math.max(0, Math.min(100, Number.isFinite(rawScore) ? rawScore : 0));

  const criticalIndicators = Array.isArray(payload?.critical_indicators)
    ? payload.critical_indicators.filter((item) => typeof item === "string" && item.trim().length > 0)
    : [];

  const reasoningSummary =
    typeof payload?.reasoning_summary === "string" && payload.reasoning_summary.trim().length > 0
      ? payload.reasoning_summary.trim()
      : "No reasoning summary provided.";

  return {
    scam_likelihood_score: scamLikelihoodScore,
    critical_indicators: criticalIndicators,
    reasoning_summary: reasoningSummary,
  };
}

async function analyzeWithGemini(transcript) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing in server/.env");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text:
                "You are an expert fraud investigator. Analyze phone call transcripts for signs of social engineering, phishing, or financial scams. Provide a likelihood score from 1 (Safe) to 100 (Definite Scam) and extract specific text segments that serve as red flags.",
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: `Analyze the following transcript:\n\n${transcript}` }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            required: ["scam_likelihood_score", "critical_indicators", "reasoning_summary"],
            properties: {
              scam_likelihood_score: { type: "INTEGER" },
              critical_indicators: {
                type: "ARRAY",
                items: { type: "STRING" },
              },
              reasoning_summary: { type: "STRING" },
            },
          },
        },
      }),
    },
  );

  const raw = await response.json();
  if (!response.ok) {
    throw new Error(`Gemini request failed (${response.status}): ${JSON.stringify(raw)}`);
  }

  const candidateText =
    raw?.candidates?.[0]?.content?.parts
      ?.map((part) => (typeof part?.text === "string" ? part.text : ""))
      .join("") ?? "";

  const jsonText = extractJsonBlock(candidateText);
  if (!jsonText) {
    throw new Error("Gemini response did not include JSON content.");
  }

  const parsed = JSON.parse(jsonText);
  return normalizeGeminiResponse(parsed);
}

app.get("/scribe-token", async (_req, res) => {
  try {
    if (!process.env.ELEVENLABS_API_KEY) {
      res.status(500).json({ error: "ELEVENLABS_API_KEY is missing in server/.env" });
      return;
    }

    const tokenResponse = await elevenlabs.tokens.singleUse.create("realtime_scribe");
    const token = typeof tokenResponse?.token === "string" ? tokenResponse.token : "";

    if (!token) {
      res.status(502).json({ error: "ElevenLabs did not return a valid realtime token." });
      return;
    }

    res.json({ token });
  } catch (error) {
    console.error("Token error:", error);
    res.status(500).json({ error: String(error) });
  }
});

app.post("/api/analyze", async (req, res) => {
  try {
    const transcript = typeof req.body?.transcript === "string" ? req.body.transcript.trim() : "";
    if (!transcript) {
      res.status(400).json({ error: "Missing or empty 'transcript' in request body." });
      return;
    }

    const result = await analyzeWithGemini(transcript);
    res.json(result);
  } catch (error) {
    console.error("Analyze error:", error);
    res.status(500).json({ error: String(error) });
  }
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use((_req, res) => {
  res.status(404).send("Not found");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});