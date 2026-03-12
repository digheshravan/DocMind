import asyncio
import json
import logging
from typing import Any
from groq import Groq
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Groq client — free tier: 30 RPM, 14,400 RPD, 6,000 TPM
_client = Groq(api_key=settings.groq_api_key)
_MODEL = "llama-3.3-70b-versatile"


async def analyze(
    system_prompt: str,
    user_content: str,
    max_tokens: int = 4096,
    retries: int = 3,
) -> str:
    """
    Send a message to Groq (Llama 3.3 70B) and return the text response.
    Retries up to 3 times with exponential backoff.
    All callers must go through this function — never call Groq directly.
    """
    last_error = None

    for attempt in range(retries):
        try:
            response = await asyncio.to_thread(
                _client.chat.completions.create,
                model=_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content},
                ],
                max_tokens=max_tokens,
                temperature=0,
                seed = 42,
            )
            return response.choices[0].message.content
        except Exception as e:
            last_error = e
            error_str = str(e)
            if "rate_limit" in error_str.lower() or "429" in error_str:
                wait = 15 * (attempt + 1)
                logger.warning(f"Groq rate limited (attempt {attempt + 1}). Waiting {wait}s...")
            else:
                wait = 2 ** attempt
                logger.warning(f"Groq API attempt {attempt + 1} failed: {e}. Retrying in {wait}s...")
            await asyncio.sleep(wait)

    raise RuntimeError(f"Groq API failed after {retries} attempts: {last_error}")


async def analyze_json(
    system_prompt: str,
    user_content: str,
    max_tokens: int = 4096,
) -> Any:
    """
    Calls Groq and parses the response as JSON.
    Raises ValueError if JSON parsing fails.
    """
    raw = await analyze(system_prompt, user_content, max_tokens)
    # Strip markdown code fences if present
    text = raw.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [l for l in lines if not l.startswith("```")]
        text = "\n".join(lines).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Groq response as JSON: {e}\nRaw: {raw[:500]}")
        raise ValueError(f"Groq returned invalid JSON: {e}")
