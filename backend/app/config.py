"""
Txilms Backend - Configuración Central
=======================================
Carga variables de entorno y define constantes globales.
Compatible con Vercel (variables de entorno del dashboard)
y desarrollo local (.env).
"""

import os
from dotenv import load_dotenv

# En local carga .env; en Vercel las env vars ya están inyectadas
load_dotenv()

# ── Claves de API ──────────────────────────────────────────
TMDB_API_KEY: str = os.getenv("TMDB_API_KEY", "")
OMDB_API_KEY: str = os.getenv("OMDB_API_KEY", "")

# ── Supabase ──────────────────────────────────────────────
SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")  # service_role key

# ── TMDB ──────────────────────────────────────────────────
TMDB_BASE_URL = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p"

# ── Scraping ──────────────────────────────────────────────
FILMAFFINITY_SEARCH_URL = "https://www.filmaffinity.com/es/search.php"

# ── Caché ─────────────────────────────────────────────────
CACHE_TTL_SECONDS: int = 7 * 24 * 60 * 60  # 7 días

# ── Headers comunes para no ser bloqueado fácilmente ──────
DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
}
