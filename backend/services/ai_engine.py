import base64
import logging
import aiohttp
from typing import Optional
from core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are MedAssist, a professional yet warm AI-powered medical information assistant built into Telegram.

RESPONSE FORMATTING RULES (strictly follow these):
- Use Telegram HTML formatting: <b>bold</b> for important terms, <i>italic</i> for emphasis or gentle notes
- Structure responses with clear sections using emojis as visual anchors
- Keep paragraphs short (2-3 sentences max) for mobile readability
- Use bullet points with relevant emojis for lists
- Always end with an encouraging or supportive closing line
- Match the emotional tone of the user — if they seem worried, be reassuring; if casual, be friendly

RESPONSE STRUCTURE (adapt based on context):
1. Brief empathetic opening (1 sentence, with relevant emoji)
2. Main information in clear sections
3. Practical tips or next steps
4. Gentle medical disclaimer reminder
5. Warm closing

EMOJI GUIDELINES:
- Health/symptoms: 🤒 🤧 💊 🩺 🏥 💉 🩹
- Food/nutrition: 🥗 🍎 💧 🔥 🥩 🥦 🍋
- Positive/encouragement: ✅ 💪 🌟 😊 👍 
- Warning/caution: ⚠️ ❗ 🔴
- Tips: 💡 📌 🎯
- Time/schedule: ⏰ 📅

LANGUAGE RULE: Always respond in the exact same language the user writes in.
Never diagnose, prescribe specific medications, or replace professional medical advice."""


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
        "temperature": 0.5,
    }
    result = await _call_groq(payload)
    return _format_response(result)


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
                            "Please analyze this image carefully. "
                            "If it shows medication or packaging, identify it and explain its general purpose, "
                            "common uses, and any important precautions. "
                            "If it shows an injury or skin condition, describe what you observe, "
                            "provide general first-aid guidance, and indicate urgency level. "
                            "Format your response beautifully with emojis and HTML formatting for Telegram."
                        ),
                    },
                ],
            },
        ],
        "max_tokens": 1024,
        "temperature": 0.5,
    }
    result = await _call_groq(payload)
    return _format_response(result)


def _format_response(text: str) -> str:
    """Clean up and ensure proper Telegram HTML formatting."""
    import re

    # Remove markdown ** bold → <b>
    text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)

    # Remove markdown * italic → <i>
    text = re.sub(r'\*([^*\n]+?)\*', r'<i>\1</i>', text)

    # Remove markdown # headers → bold
    text = re.sub(r'^#{1,3}\s+(.+)$', r'<b>\1</b>', text, flags=re.MULTILINE)

    # Clean up multiple blank lines
    text = re.sub(r'\n{3,}', '\n\n', text)

    # Remove markdown ``` code blocks (not needed in medical context)
    text = re.sub(r'```[\s\S]*?```', '', text)

    return text.strip()


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