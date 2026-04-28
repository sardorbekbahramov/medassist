import base64
import logging
import aiohttp
from typing import Optional
from core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are MedAssist, a professional AI-powered medical information assistant.
Your role:
- Analyze health-related text logs (food, water, symptoms) and provide helpful, evidence-based insights
- Analyze images of medications (pills, packages) or injuries and describe what you observe
- Always remind users to consult a healthcare professional for medical decisions
- Be concise, clear, and compassionate
- Never diagnose, prescribe, or replace professional medical advice
- Respond in the same language the user is writing in"""

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"

_session: Optional[aiohttp.ClientSession] = None


async def get_session():
    global _session
    if _session is None or _session.closed:
        _session = aiohttp.ClientSession()
    return _session


async def analyze_text(user_message: str, lang: str = "en") -> str:
    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        "max_tokens": 1024,
        "temperature": 0.4,
    }
    return await _call_groq(payload)


async def analyze_vision(image_bytes: bytes, mime_type: str, lang: str = "en") -> str:
    image_b64 = base64.standard_b64encode(image_bytes).decode("utf-8")
    payload = {
        "model": "meta-llama/llama-4-scout-17b-16e-instruct",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime_type};base64,{image_b64}"},
                    },
                    {
                        "type": "text",
                        "text": (
                            "Please analyze this image. "
                            "If it shows medication, identify it and describe its general purpose. "
                            "If it shows an injury, describe what you observe and provide general first-aid guidance. "
                            "Always remind the user to seek professional medical care."
                        ),
                    },
                ],
            },
        ],
        "max_tokens": 1024,
        "temperature": 0.4,
    }
    return await _call_groq(payload)


async def _call_groq(payload: dict) -> str:
    session = await get_session()
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.gemini_api_key}",
    }
    try:
        async with session.post(
            GROQ_URL,
            json=payload,
            headers=headers,
            timeout=aiohttp.ClientTimeout(total=30),
        ) as resp:
            if resp.status == 429:
                raise RuntimeError("Rate limit reached. Please try again later.")
            if resp.status != 200:
                error_body = await resp.text()
                logger.error(f"Groq API Error {resp.status}: {error_body}")
                raise RuntimeError(f"AI API error: {resp.status}")
            data = await resp.json()
            return data["choices"][0]["message"]["content"]
    except Exception as e:
        logger.exception("AI Engine failure")
        raise e