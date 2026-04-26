import base64
from typing import Optional
import aiohttp
from core.config import settings

SYSTEM_PROMPT = """You are MedAssist, a professional AI-powered medical information assistant.
Your role:
- Analyze health-related text logs (food, water, symptoms) and provide helpful, evidence-based insights
- Analyze images of medications (pills, packages) or injuries and describe what you observe
- Always remind users to consult a healthcare professional for medical decisions
- Be concise, clear, and compassionate
- Never diagnose, prescribe, or replace professional medical advice
- Respond in the same language the user is writing in"""

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent"


async def analyze_text(user_message: str, lang: str = "en") -> str:
    """Analyze a text health log using Gemini. No history stored."""
    payload = {
        "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": [{"role": "user", "parts": [{"text": user_message}]}],
        "generationConfig": {"maxOutputTokens": 1024, "temperature": 0.4},
    }
    return await _call_gemini(payload)


async def analyze_vision(image_bytes: bytes, mime_type: str, lang: str = "en") -> str:
    """Analyze an image (pill, injury) using Gemini Vision. No history stored."""
    image_b64 = base64.standard_b64encode(image_bytes).decode("utf-8")
    payload = {
        "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"inline_data": {"mime_type": mime_type, "data": image_b64}},
                    {
                        "text": (
                            "Please analyze this image. "
                            "If it shows medication, identify it and describe its general purpose and common uses. "
                            "If it shows an injury or medical condition, describe what you observe and provide "
                            "general first-aid guidance. Always remind the user to seek professional medical care."
                        )
                    },
                ],
            }
        ],
        "generationConfig": {"maxOutputTokens": 1024, "temperature": 0.4},
    }
    return await _call_gemini(payload)


async def _call_gemini(payload: dict) -> str:
    """Shared HTTP call to Gemini API."""
    url = f"{GEMINI_URL}?key={settings.gemini_api_key}"
    async with aiohttp.ClientSession() as session:
        async with session.post(
            url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=aiohttp.ClientTimeout(total=30),
        ) as resp:
            if resp.status != 200:
                error = await resp.text()
                raise RuntimeError(f"Gemini API error {resp.status}: {error}")
            data = await resp.json()
    try:
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError) as e:
        raise RuntimeError(f"Unexpected Gemini response: {data}") from e
