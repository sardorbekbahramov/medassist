import json
import os
from typing import Dict, Any

_locales: Dict[str, Dict[str, str]] = {}
_LOCALES_DIR = os.path.join(os.path.dirname(__file__), "../i18n")


def load_locales():
    """Load all locale JSON files into memory at startup."""
    global _locales
    for lang in ("en", "ru", "uz"):
        path = os.path.join(_LOCALES_DIR, f"{lang}.json")
        with open(path, encoding="utf-8") as f:
            _locales[lang] = json.load(f)


# def get_text(key: str, lang: str = "en", **kwargs: Any) -> str:
#     """Return translated string, fallback to English if key missing."""
#     locale = _locales.get(lang, _locales.get("en", {}))
#     text = locale.get(key) or _locales.get("en", {}).get(key, key)
#     if kwargs:
#         try:
#             text = text.format(**kwargs)
#         except KeyError:
#             pass
#     return text

def get_text(key: str, lang: str = "uz", **kwargs: Any) -> str:
    """Return translated string, fallback to Uzbek if key missing."""
    locale = _locales.get(lang, _locales.get("uz", {}))
    text = locale.get(key) or _locales.get("uz", {}).get(key, key)
    if kwargs:
        try:
            text = text.format(**kwargs)
        except KeyError:
            pass
    return text


def t(key: str, lang: str = "uz", **kwargs) -> str:
    return get_text(key, lang, **kwargs)


# Convenience alias
def t(key: str, lang: str = "en", **kwargs) -> str:
    return get_text(key, lang, **kwargs)
