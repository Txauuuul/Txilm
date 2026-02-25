"""
Txilms Backend - API Principal (FastAPI)
=========================================
Servidor que expone los endpoints de búsqueda y detalle de películas,
combinando datos de TMDB + OMDb + FilmAffinity.

Flujo de datos:
  1. TMDB  → Póster, sinopsis, reparto, IMDb ID, streaming
  2. OMDb  → Puntuaciones IMDb y Rotten Tomatoes (API oficial)
  3. FA    → Puntuación FilmAffinity (scraping)

Despliegue:
  - Local:  uvicorn main:app --reload --host 0.0.0.0 --port 8000
  - Vercel: se despliega automáticamente via vercel.json
"""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Dict, List, Optional

from app.config import TMDB_API_KEY, OMDB_API_KEY, SUPABASE_URL
from app.tmdb_service import (
    search_movies,
    get_movie_detail,
    get_watch_providers,
    get_trending,
)
from app.omdb_service import get_omdb_ratings
from app.scraper_fa import get_filmaffinity_score
from app.cache import cache_get, cache_set, cache_cleanup

# ── Logging ────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(name)s │ %(levelname)s │ %(message)s",
)
logger = logging.getLogger("txilms")


# ── Lifecycle ──────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Acciones al iniciar y cerrar la aplicación."""
    # Startup
    if not TMDB_API_KEY:
        logger.warning(
            "⚠️  TMDB_API_KEY no configurada. Copia .env.example a .env "
            "y añade tu clave de TMDB."
        )
    else:
        logger.info("✅ TMDB_API_KEY cargada correctamente.")
    if OMDB_API_KEY:
        logger.info("\u2705 OMDB_API_KEY cargada correctamente.")
    else:
        logger.warning("\u26a0\ufe0f  OMDB_API_KEY no configurada. Notas IMDb/RT no disponibles.")
    cleaned = cache_cleanup()
    if cleaned:
        logger.info(f"🧹 Limpieza de caché: {cleaned} entradas expiradas eliminadas.")

    yield

    # Shutdown
    logger.info("Cerrando Txilms API...")


# ── App FastAPI ────────────────────────────────────────────
app = FastAPI(
    title="Txilms API",
    description="API de agregación de críticas de cine y series",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS (permitir la app de Expo en desarrollo) ──────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, restringir a dominios específicos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Modelos de Respuesta ──────────────────────────────────
class SearchResult(BaseModel):
    tmdb_id: int
    title: str
    original_title: str
    year: str
    overview: str
    poster: Optional[str]
    backdrop: Optional[str]
    vote_average: float


class SearchResponse(BaseModel):
    page: int
    total_pages: int
    total_results: int
    results: List[SearchResult]


class ScoreIMDb(BaseModel):
    score: Optional[float] = None
    votes: Optional[str] = None
    source: str = "OMDb"


class ScoreRT(BaseModel):
    score: Optional[int] = None
    source: str = "OMDb"


class ScoreFA(BaseModel):
    score: Optional[float] = None
    votes: Optional[str] = None
    url: Optional[str] = None


class Provider(BaseModel):
    provider_id: Optional[int]
    provider_name: str
    logo: Optional[str]


class WatchProviders(BaseModel):
    link: Optional[str]
    flatrate: List[Provider] = []
    rent: List[Provider] = []
    buy: List[Provider] = []


class CastMember(BaseModel):
    name: str
    character: str
    profile_image: Optional[str]


class MovieDetailResponse(BaseModel):
    tmdb_id: int
    imdb_id: Optional[str]
    title: str
    original_title: str
    year: str
    release_date: Optional[str]
    runtime: Optional[int]
    overview: str
    genres: List[str]
    director: str
    cast: List[CastMember]
    poster: Optional[str]
    backdrop: Optional[str]
    scores: Dict[str, Any]
    watch_providers: WatchProviders


class TrendingItem(BaseModel):
    tmdb_id: int
    title: str
    original_title: str
    year: str
    poster: Optional[str]
    backdrop: Optional[str]
    vote_average: float


# ── Endpoints ──────────────────────────────────────────────


@app.get("/", tags=["Root"])
async def root():
    """Endpoint raíz - Health check."""
    return {
        "app": "Txilms API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/search", response_model=SearchResponse, tags=["Búsqueda"])
async def search(
    query: str = Query(..., min_length=1, description="Texto de búsqueda"),
    region: str = Query("ES", description="Código de país ISO 3166-1"),
    page: int = Query(1, ge=1, le=500, description="Página de resultados"),
):
    """
    Busca películas por texto.
    Devuelve una lista paginada de resultados desde TMDB.
    """
    if not TMDB_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="TMDB_API_KEY no configurada en el servidor.",
        )

    try:
        data = await search_movies(query=query, page=page)
        return data
    except Exception as e:
        logger.error(f"Error en búsqueda: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error al buscar películas.")


@app.get(
    "/movie/{tmdb_id}",
    tags=["Detalle"],
)
async def movie_detail(
    tmdb_id: int,
    region: str = Query("ES", description="Código de país para streaming"),
):
    """
    Obtiene el detalle completo de una película:
      1. TMDB  → Datos base + IMDb ID + streaming
      2. OMDb  → Puntuaciones IMDb y Rotten Tomatoes (API oficial)
      3. FA    → Puntuación FilmAffinity (scraping)
    El resultado unificado se cachea 7 días en Supabase.
    """
    if not TMDB_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="TMDB_API_KEY no configurada en el servidor.",
        )

    # ── Comprobar caché del objeto completo ──
    cache_key = f"movie:{tmdb_id}:{region}"
    cached = cache_get(cache_key)
    if cached is not None:
        logger.info(f"Cache hit: {cache_key}")
        return cached

    # ── PASO 1: Obtener datos de TMDB ──
    try:
        tmdb_data = await get_movie_detail(tmdb_id)
    except Exception as e:
        logger.error(f"Error obteniendo datos TMDB para {tmdb_id}: {e}")
        raise HTTPException(
            status_code=404,
            detail=f"No se encontró la película con ID {tmdb_id}.",
        )

    imdb_id = tmdb_data.get("imdb_id") or ""
    title = tmdb_data["original_title"] or tmdb_data["title"]
    year = tmdb_data["year"]

    # ── PASO 2 y 3: OMDb + FA + Providers en paralelo ──
    omdb_task = asyncio.create_task(get_omdb_ratings(imdb_id))
    fa_task = asyncio.create_task(
        get_filmaffinity_score(
            title=tmdb_data["title"],
            year=year,
            original_title=title,
        )
    )
    providers_task = asyncio.create_task(
        get_watch_providers(tmdb_id=tmdb_id, region=region)
    )

    omdb_data, fa_data, providers_data = await asyncio.gather(
        omdb_task, fa_task, providers_task, return_exceptions=True
    )

    # ── Manejar excepciones individuales ──
    if isinstance(omdb_data, Exception):
        logger.error(f"Error OMDb: {omdb_data}")
        omdb_data = {
            "imdb_score": None, "imdb_votes": None,
            "rt_score": None, "metascore": None,
            "rated": None, "source": "OMDb",
        }

    if isinstance(fa_data, Exception):
        logger.error(f"Error scraping FA: {fa_data}")
        fa_data = {"score": None, "votes": None, "url": None}

    if isinstance(providers_data, Exception):
        logger.error(f"Error obteniendo providers: {providers_data}")
        providers_data = {"link": None, "flatrate": [], "rent": [], "buy": []}

    # ── Construir puntuaciones ──
    # IMDb: preferir OMDb, fallback a TMDB vote_average
    imdb_score = omdb_data.get("imdb_score")
    if imdb_score is None:
        imdb_score = tmdb_data.get("vote_average_tmdb")

    scores = {
        "imdb": {
            "score": imdb_score,
            "votes": omdb_data.get("imdb_votes"),
            "source": "OMDb" if omdb_data.get("imdb_score") else "TMDB",
        },
        "rotten_tomatoes": {
            "score": omdb_data.get("rt_score"),
            "source": "OMDb",
        },
        "filmaffinity": fa_data,
        "metascore": omdb_data.get("metascore"),
    }

    # ── Construir respuesta unificada ──
    response = {
        "tmdb_id": tmdb_data["tmdb_id"],
        "imdb_id": tmdb_data.get("imdb_id"),
        "title": tmdb_data["title"],
        "original_title": tmdb_data["original_title"],
        "year": tmdb_data["year"],
        "release_date": tmdb_data.get("release_date"),
        "runtime": tmdb_data.get("runtime"),
        "overview": tmdb_data["overview"],
        "genres": tmdb_data["genres"],
        "director": tmdb_data["director"],
        "cast": tmdb_data["cast"],
        "poster": tmdb_data["poster"],
        "backdrop": tmdb_data["backdrop"],
        "rated": omdb_data.get("rated"),
        "scores": scores,
        "watch_providers": providers_data,
    }

    # ── Guardar en caché el objeto completo ──
    cache_set(cache_key, response)
    logger.info(f"Cached: {cache_key}")

    return response


@app.get("/trending", response_model=List[TrendingItem], tags=["Tendencias"])
async def trending(
    time_window: str = Query(
        "week",
        pattern="^(day|week)$",
        description="Ventana temporal: 'day' o 'week'",
    ),
    page: int = Query(1, ge=1, le=20),
):
    """
    Obtiene las películas en tendencia (populares).
    Perfecto para el carrusel de la pantalla de inicio.
    """
    if not TMDB_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="TMDB_API_KEY no configurada.",
        )

    try:
        data = await get_trending(time_window=time_window, page=page)
        return data
    except Exception as e:
        logger.error(f"Error obteniendo tendencias: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener tendencias.")


@app.get("/health", tags=["Root"])
async def health_check():
    """Health check para monitoreo."""
    return {
        "status": "healthy",
        "tmdb_configured": bool(TMDB_API_KEY),
        "omdb_configured": bool(OMDB_API_KEY),
        "supabase_configured": bool(SUPABASE_URL),
    }
