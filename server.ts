// server.ts — run with: deno run -A server.ts
import { ElevenLabsClient } from "npm:@elevenlabs/elevenlabs-js";

const elevenlabs = new ElevenLabsClient({
  apiKey: Deno.env.get("ELEVENLABS_API_KEY") ?? "",
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

const riskKeywords = {
  critical: ["social security", "wire transfer", "gift card", "crypto", "bitcoin"],
  high: ["urgent", "bank account", "otp", "verification code", "password", "remote access"],
  medium: ["act now", "limited time", "confirm identity", "suspended", "payment failed"],
};

function scoreTranscript(transcript: string) {
  const text = transcript.toLowerCase();
  const flaggedWords = new Set<string>();
  let score = 10;

  for (const keyword of riskKeywords.medium) {
    if (text.includes(keyword)) {
      flaggedWords.add(keyword);
      score += 10;
    }
  }
  for (const keyword of riskKeywords.high) {
    if (text.includes(keyword)) {
      flaggedWords.add(keyword);
      score += 18;
    }
  }
  for (const keyword of riskKeywords.critical) {
    if (text.includes(keyword)) {
      flaggedWords.add(keyword);
      score += 25;
    }
  }

  const percentage = Math.max(0, Math.min(100, score));
  const riskLevel =
    percentage >= 85 ? "critical" :
    percentage >= 60 ? "high" :
    percentage >= 30 ? "medium" :
    "low";

  const summary =
    flaggedWords.size > 0
      ? `Potential scam signals detected: ${Array.from(flaggedWords).join(", ")}.`
      : "No obvious scam language detected in this transcript segment.";

  return {
    riskLevel,
    percentage,
    flaggedWords: Array.from(flaggedWords),
    summary,
  };
}

Deno.serve({ port: 3001 }, async (req) => {
  const url = new URL(req.url);

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Token endpoint
  if (url.pathname === "/scribe-token" && req.method === "GET") {
    try {
      const token = await elevenlabs.tokens.singleUse.create("realtime_scribe");
      return Response.json(token, {
        headers: corsHeaders,
      });
    } catch (e) {
      console.error("Token error:", e);
      return Response.json({ error: String(e) }, {
        status: 500,
        headers: corsHeaders,
      });
    }
  }

  // Transcript analysis endpoint (Gemini-ready response shape)
  if (url.pathname === "/api/analyze" && req.method === "POST") {
    try {
      const body = await req.json();
      const transcript = typeof body?.transcript === "string" ? body.transcript.trim() : "";

      if (!transcript) {
        return Response.json(
          { error: "Missing or empty 'transcript' in request body." },
          { status: 400, headers: corsHeaders },
        );
      }

      // TODO: Replace this heuristic scorer with a Gemini call.
      const result = scoreTranscript(transcript);
      return Response.json(result, { headers: corsHeaders });
    } catch (e) {
      console.error("Analyze error:", e);
      return Response.json({ error: String(e) }, {
        status: 500,
        headers: corsHeaders,
      });
    }
  }

  return new Response("Not found", { status: 404 });
});

console.log("Server running on http://localhost:3001");
