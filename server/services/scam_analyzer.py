from google import genai
from google.genai import types
from pydantic import BaseModel
from dotenv import load_dotenv
import os

load_dotenv("../.env")

# ---- Pydantic response model ----
class ScamAnalysis(BaseModel):
    scam_likelihood_score: int
    risk_level: str
    critical_indicators: list[str]
    reasoning_summary: str


# ---- Initialize client once (important) ----
_api_key = os.environ["GEMINI_API_KEY"]
_client = genai.Client(api_key=_api_key)


def analyze_transcript(transcript_text: str) -> ScamAnalysis:
    """Analyze a call transcript and return structured scam analysis"""

    response = _client.models.generate_content(
        model="gemini-2.5-flash-lite",
        config=types.GenerateContentConfig(
            system_instruction=(
                "You are an expert fraud investigator. Analyze phone call transcripts for signs of "
                "social engineering, phishing, or financial scams. Provide a likelihood score "
                "from 1 (Safe) to 100 (Definite Scam) and extract the specific text segments "
                "that serve as red flags."
            ),
            response_mime_type="application/json",
            response_schema=ScamAnalysis,
        ),
        contents=f"Analyze the following transcript:\n\n{transcript_text}",
    )

    # Parse structured response
    return ScamAnalysis.model_validate_json(response.text)