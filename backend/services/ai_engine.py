# import base64
# from typing import Optional
# import aiohttp
# from core.config import settings

# SYSTEM_PROMPT = """You are MedAssist, a professional AI-powered medical information assistant.
# Your role:
# - Analyze health-related text logs (food, water, symptoms) and provide helpful, evidence-based insights
# - Analyze images of medications (pills, packages) or injuries and describe what you observe
# - Always remind users to consult a healthcare professional for medical decisions
# - Be concise, clear, and compassionate
# - Never diagnose, prescribe, or replace professional medical advice
# - Respond in the same language the user is writing in"""

# GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent"


# async def analyze_text(user_message: str, lang: str = "en") -> str:
#     """Analyze a text health log using Gemini. No history stored."""
#     payload = {
#         "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
#         "contents": [{"role": "user", "parts": [{"text": user_message}]}],
#         "generationConfig": {"maxOutputTokens": 1024, "temperature": 0.4},
#     }
#     return await _call_gemini(payload)


# async def analyze_vision(image_bytes: bytes, mime_type: str, lang: str = "en") -> str:
#     """Analyze an image (pill, injury) using Gemini Vision. No history stored."""
#     image_b64 = base64.standard_b64encode(image_bytes).decode("utf-8")
#     payload = {
#         "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
#         "contents": [
#             {
#                 "role": "user",
#                 "parts": [
#                     {"inline_data": {"mime_type": mime_type, "data": image_b64}},
#                     {
#                         "text": (
#                             "Please analyze this image. "
#                             "If it shows medication, identify it and describe its general purpose and common uses. "
#                             "If it shows an injury or medical condition, describe what you observe and provide "
#                             "general first-aid guidance. Always remind the user to seek professional medical care."
#                         )
#                     },
#                 ],
#             }
#         ],
#         "generationConfig": {"maxOutputTokens": 1024, "temperature": 0.4},
#     }
#     return await _call_gemini(payload)


# async def _call_gemini(payload: dict) -> str:
#     """Shared HTTP call to Gemini API."""
#     url = f"{GEMINI_URL}?key={settings.gemini_api_key}"
#     async with aiohttp.ClientSession() as session:
#         async with session.post(
#             url,
#             json=payload,
#             headers={"Content-Type": "application/json"},
#             timeout=aiohttp.ClientTimeout(total=30),
#         ) as resp:
#             if resp.status != 200:
#                 error = await resp.text()
#                 raise RuntimeError(f"Gemini API error {resp.status}: {error}")
#             data = await resp.json()
#     try:
#         return data["candidates"][0]["content"]["parts"][0]["text"]
#     except (KeyError, IndexError) as e:
#         raise RuntimeError(f"Unexpected Gemini response: {data}") from e

import base64
import logging
import aiohttp
from typing import Optional
from core.config import settings

# Xatolarni terminalda ko'rish uchun loggerni sozlaymiz
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

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent"

# Global session yaratamiz (bu so'rovlar tezligini keskin oshiradi)
_session: Optional[aiohttp.ClientSession] = None

async def get_session():
    global _session
    if _session is None or _session.closed:
        _session = aiohttp.ClientSession()
    return _session

async def analyze_text(user_message: str, lang: str = "en") -> str:
    """Analyze a text health log using Gemini."""
    payload = {
        "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": [{"role": "user", "parts": [{"text": user_message}]}],
        "generationConfig": {"maxOutputTokens": 1024, "temperature": 0.4},
    }
    return await _call_gemini(payload)

async def analyze_vision(image_bytes: bytes, mime_type: str, lang: str = "en") -> str:
    """Analyze an image using Gemini Vision."""
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
                            "If it shows medication, identify it and describe its general purpose. "
                            "If it shows an injury, describe what you observe and provide general first-aid guidance. "
                            "Always remind the user to seek professional medical care."
                        )
                    },
                ],
            }
        ],
        "generationConfig": {"maxOutputTokens": 1024, "temperature": 0.4},
    }
    return await _call_gemini(payload)

async def _call_gemini(payload: dict) -> str:
    """Shared HTTP call with Error Handling and Logging."""
    url = f"{GEMINI_URL}?key={settings.gemini_api_key}"
    session = await get_session()
    
    try:
        async with session.post(
            url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=aiohttp.ClientTimeout(total=30),
        ) as resp:
            # 429 xatosi - Limit tugaganini bildiradi
            if resp.status == 429:
                logger.error("Gemini API: Limit (Quota/Credit) tugadi!")
                raise RuntimeError("Analysis failed: API limit reached (Check your Google AI Studio quota/billing).")
            
            # Boshqa xatolar
            if resp.status != 200:
                error_body = await resp.text()
                logger.error(f"Gemini API Error {resp.status}: {error_body}")
                raise RuntimeError(f"Analysis failed: API returned status {resp.status}")

            data = await resp.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]
            
    except Exception as e:
        logger.exception("AI Engine failure")
        raise e