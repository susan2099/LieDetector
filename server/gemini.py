from google import genai
from google.genai import types
from pydantic import BaseModel
from dotenv import load_dotenv
import os

load_dotenv()

# Configure your API Key
api_key = os.environ["GEMINI_API_KEY"]
client = genai.Client(api_key=api_key)

# 1. Define the structure using Pydantic (required by new SDK for structured output)
class ScamAnalysis(BaseModel):
    scam_likelihood_score: int   # Scale of 1-100
    risk_level: str              # e.g., Low, Medium, High, Critical
    critical_indicators: list[str]  # Specific quotes or techniques identified
    reasoning_summary: str

def analyze_call_transcript(transcript_text: str):
    response = client.models.generate_content(
        model="gemini-2.5-flash-lite",
        config=types.GenerateContentConfig(
            system_instruction=(
                "You are an expert fraud investigator. Analyze phone call transcripts for signs of "
                "social engineering, phishing, or financial scams. Provide a likelihood score "
                "from 1 (Safe) to 100 (Definite Scam) and extract the specific text segments "
                "that serve as red flags (e.g., urgency, requests for OTP, impersonation)."
            ),
            response_mime_type="application/json",
            response_schema=ScamAnalysis,
        ),
        contents=f"Analyze the following transcript:\n\n{transcript_text}",
    )

    return response.text

# --- Example Usage ---
sample_transcript = """
Caller: Hello, this is Mark from the Bank Central Security Department. We've detected 
unauthorized access to your account from another state.
Receiver: Oh no, what should I do?
Caller: Don't worry, I can help. I just sent a 6-digit verification code to your phone 
to verify your identity. You need to read it back to me immediately or we will have 
to freeze all your assets for 48 hours.
"""

if __name__ == "__main__":
    result = analyze_call_transcript(sample_transcript)
    print(result)