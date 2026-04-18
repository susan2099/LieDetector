from fastapi import FastAPI
from google import genai
from dotenv import load_dotenv
import pathlib

import os

_ENV_PATH = pathlib.Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_ENV_PATH)

# Create .env at project and do not upload to the github
api_key = os.getenv("API_KEY","")

app = FastAPI()

def test():
    client = genai.Client(api_key=api_key)
    chat = client.chats.create(model="gemini-2.0-flash")

    response = chat.send_message("Hello world!")
    print(response.text)

    response = chat.send_message("Explain to me how AI works")
    print(response.text)

    for message in chat.get_history():
        print(f'role - {message.role}',end=": ")
        print(message.parts[0].text)

@app.get("/test")
async def geminitest():
    test()
    return "ok"
