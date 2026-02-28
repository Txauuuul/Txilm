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

from fastapi import FastAPI, Query, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Dict, List, Optional

from app.config import TMDB_API_KEY, OMDB_API_KEY, SUPABASE_URL
from app.auth import register_user, login_user, refresh_session, require_auth, require_admin, change_password
from app.social import (
    get_user_lists, add_to_list, remove_from_list, update_rating,
    get_movie_ratings, share_movie, get_notifications, get_unread_count,
    mark_notification_read, mark_all_notifications_read, get_profile,
    get_all_profiles, get_friend_activity, generate_invite_codes,
    get_available_codes, get_all_codes, notify_all_except,
    follow_user, unfollow_user, get_following, get_followers,
    get_follow_counts, get_custom_lists, create_custom_list,
    delete_custom_list, get_custom_list_items, add_to_custom_list,
    remove_from_custom_list, get_user_stats, compare_users,
    get_recent_reviews,
)
from app.tmdb_service import (
    search_movies,
    get_movie_detail,
    get_watch_providers,
    get_trending,
    discover_movies,
    get_top_rated,
    get_recommendations,
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
        "genre_ids": tmdb_data.get("genre_ids", []),
        "director": tmdb_data["director"],
        "cast": tmdb_data["cast"],
        "poster": tmdb_data["poster"],
        "backdrop": tmdb_data["backdrop"],
        "rated": omdb_data.get("rated"),
        "scores": scores,
        "watch_providers": providers_data,
        "videos": tmdb_data.get("videos", []),
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


@app.get("/discover", tags=["Descubrir"])
async def discover(
    sort_by: str = Query("popularity.desc", description="Criterio de ordenación"),
    with_genres: Optional[str] = Query(None, description="IDs de género separados por coma"),
    vote_count_gte: int = Query(100, description="Mínimo de votos"),
    vote_average_gte: Optional[float] = Query(None, description="Puntuación media mínima"),
    with_watch_providers: Optional[str] = Query(None, description="IDs de plataforma separados por |"),
    watch_region: Optional[str] = Query(None, description="País para plataformas (ej: ES)"),
    page: int = Query(1, ge=1, le=20),
):
    """
    Descubre películas por género, puntuación, plataformas y popularidad.
    Géneros populares: 16=Animación, 53=Suspense, 28=Acción, 35=Comedia, 18=Drama, 27=Terror.
    Plataformas: 8=Netflix, 337=Disney+, 119=Prime Video, 384=HBO Max, 2=Apple TV+.
    """
    if not TMDB_API_KEY:
        raise HTTPException(status_code=503, detail="TMDB_API_KEY no configurada.")

    try:
        data = await discover_movies(
            sort_by=sort_by,
            with_genres=with_genres,
            vote_count_gte=vote_count_gte,
            vote_average_gte=vote_average_gte,
            with_watch_providers=with_watch_providers,
            watch_region=watch_region,
            page=page,
        )
        return data
    except Exception as e:
        logger.error(f"Error en discover: {e}")
        raise HTTPException(status_code=500, detail="Error al descubrir películas.")


@app.get("/top-rated", response_model=List[TrendingItem], tags=["Descubrir"])
async def top_rated(
    page: int = Query(1, ge=1, le=20),
):
    """Obtiene las películas mejor valoradas de todos los tiempos."""
    if not TMDB_API_KEY:
        raise HTTPException(status_code=503, detail="TMDB_API_KEY no configurada.")

    try:
        data = await get_top_rated(page=page)
        return data
    except Exception as e:
        logger.error(f"Error en top rated: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener top rated.")


@app.get("/recommendations/{tmdb_id}", response_model=List[TrendingItem], tags=["Descubrir"])
async def recommendations(
    tmdb_id: int,
    page: int = Query(1, ge=1, le=20),
):
    """Obtiene recomendaciones basadas en una película."""
    if not TMDB_API_KEY:
        raise HTTPException(status_code=503, detail="TMDB_API_KEY no configurada.")

    try:
        data = await get_recommendations(tmdb_id=tmdb_id, page=page)
        return data
    except Exception as e:
        logger.error(f"Error en recomendaciones: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener recomendaciones.")


# ══════════════════════════════════════════════════════════
# SISTEMA SOCIAL - Autenticación, Listas, Envíos, Notif.
# ══════════════════════════════════════════════════════════

# ── Modelos de petición ──

class RegisterRequest(BaseModel):
    username: str
    password: str
    invite_code: str

class LoginRequest(BaseModel):
    username: str
    password: str

class AddToListRequest(BaseModel):
    tmdb_id: int
    list_type: str
    movie_title: str
    movie_poster: Optional[str] = None
    movie_year: Optional[str] = None
    rating: Optional[float] = None
    review: Optional[str] = None
    genre_ids: Optional[str] = None

class UpdateRatingRequest(BaseModel):
    rating: float
    review: Optional[str] = None

class ShareMovieRequest(BaseModel):
    to_user_id: str
    tmdb_id: int
    movie_title: str
    movie_poster: Optional[str] = None
    message: Optional[str] = None

class GenerateCodesRequest(BaseModel):
    count: int = 5

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class CreateCustomListRequest(BaseModel):
    name: str
    description: Optional[str] = None

class AddToCustomListRequest(BaseModel):
    tmdb_id: int
    movie_title: str
    movie_poster: Optional[str] = None
    movie_year: Optional[str] = None


# ── Auth Endpoints ──

@app.post("/auth/register", tags=["Auth"])
async def auth_register(body: RegisterRequest):
    """Registrar nuevo usuario con código de invitación."""
    return await register_user(body.username, body.password, body.invite_code)


@app.post("/auth/login", tags=["Auth"])
async def auth_login(body: LoginRequest):
    """Login con usuario y contraseña."""
    return await login_user(body.username, body.password)


@app.get("/auth/me", tags=["Auth"])
async def auth_me(request: Request):
    """Obtener perfil del usuario actual."""
    user = await require_auth(request)
    return user


class RefreshRequest(BaseModel):
    refresh_token: str


@app.post("/auth/refresh", tags=["Auth"])
async def auth_refresh(body: RefreshRequest):
    """Renovar tokens usando refresh_token. Mantiene la sesión activa."""
    return await refresh_session(body.refresh_token)


@app.post("/auth/change-password", tags=["Auth"])
async def auth_change_password(request: Request, body: ChangePasswordRequest):
    """Cambiar contraseña del usuario actual."""
    user = await require_auth(request)
    result = await change_password(user["id"], user["username"], body.old_password, body.new_password)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


# ── User Lists Endpoints ──

@app.get("/lists", tags=["Listas"])
async def get_my_lists(request: Request, list_type: Optional[str] = None):
    """Obtener mis listas de películas."""
    user = await require_auth(request)
    return await get_user_lists(user["id"], list_type)


@app.get("/lists/user/{user_id}", tags=["Listas"])
async def get_user_lists_endpoint(request: Request, user_id: str, list_type: Optional[str] = None):
    """Obtener listas de un amigo."""
    await require_auth(request)
    return await get_user_lists(user_id, list_type)


@app.post("/lists", tags=["Listas"])
async def add_to_list_endpoint(request: Request, body: AddToListRequest):
    """Añadir película a una lista."""
    user = await require_auth(request)
    result = await add_to_list(
        user_id=user["id"],
        tmdb_id=body.tmdb_id,
        list_type=body.list_type,
        movie_title=body.movie_title,
        movie_poster=body.movie_poster,
        movie_year=body.movie_year,
        rating=body.rating,
        review=body.review,
        genre_ids=body.genre_ids,
    )

    # Notificar a todos si el usuario puntuó una película
    if body.list_type == "watched" and body.rating:
        await notify_all_except(
            exclude_user_id=user["id"],
            notif_type="movie_rated",
            from_user_id=user["id"],
            data={
                "from_username": user.get("username", "???"),
                "tmdb_id": body.tmdb_id,
                "movie_title": body.movie_title,
                "movie_poster": body.movie_poster,
                "rating": body.rating,
            },
        )

    return result


@app.delete("/lists/{tmdb_id}/{list_type}", tags=["Listas"])
async def remove_from_list_endpoint(request: Request, tmdb_id: int, list_type: str):
    """Eliminar película de una lista."""
    user = await require_auth(request)
    success = await remove_from_list(user["id"], tmdb_id, list_type)
    if not success:
        raise HTTPException(status_code=404, detail="No encontrado")
    return {"ok": True}


@app.put("/lists/{tmdb_id}/rating", tags=["Listas"])
async def update_rating_endpoint(request: Request, tmdb_id: int, body: UpdateRatingRequest):
    """Actualizar puntuación de una película vista."""
    user = await require_auth(request)
    result = await update_rating(user["id"], tmdb_id, body.rating, body.review)
    return result


@app.get("/movie/{tmdb_id}/ratings", tags=["Listas"])
async def get_movie_ratings_endpoint(tmdb_id: int):
    """Obtener puntuaciones de amigos para una película."""
    return await get_movie_ratings(tmdb_id)


# ── Shares Endpoints ──

@app.post("/shares", tags=["Envíos"])
async def share_movie_endpoint(request: Request, body: ShareMovieRequest):
    """Enviar película a un amigo."""
    user = await require_auth(request)
    result = await share_movie(
        from_user_id=user["id"],
        to_user_id=body.to_user_id,
        tmdb_id=body.tmdb_id,
        movie_title=body.movie_title,
        movie_poster=body.movie_poster,
        message=body.message,
    )
    return result


# ── Notifications Endpoints ──

@app.get("/notifications", tags=["Notificaciones"])
async def get_notifications_endpoint(request: Request, unread_only: bool = False):
    """Obtener mis notificaciones."""
    user = await require_auth(request)
    return await get_notifications(user["id"], unread_only)


@app.get("/notifications/count", tags=["Notificaciones"])
async def get_notification_count(request: Request):
    """Obtener cantidad de notificaciones no leídas."""
    user = await require_auth(request)
    count = await get_unread_count(user["id"])
    return {"count": count}


@app.put("/notifications/{notif_id}/read", tags=["Notificaciones"])
async def mark_read_endpoint(request: Request, notif_id: int):
    """Marcar una notificación como leída."""
    user = await require_auth(request)
    await mark_notification_read(notif_id, user["id"])
    return {"ok": True}


@app.put("/notifications/read-all", tags=["Notificaciones"])
async def mark_all_read_endpoint(request: Request):
    """Marcar todas las notificaciones como leídas."""
    user = await require_auth(request)
    await mark_all_notifications_read(user["id"])
    return {"ok": True}


# ── Profiles Endpoints ──

@app.get("/profiles", tags=["Perfiles"])
async def get_profiles_endpoint(request: Request):
    """Obtener todos los perfiles de usuario."""
    await require_auth(request)
    return await get_all_profiles()


@app.get("/profiles/{user_id}", tags=["Perfiles"])
async def get_profile_endpoint(request: Request, user_id: str):
    """Obtener perfil de un usuario específico."""
    await require_auth(request)
    profile = await get_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    return profile


# ── Activity Endpoint ──

@app.get("/activity", tags=["Social"])
async def get_activity_endpoint(request: Request, limit: int = Query(20, ge=1, le=50)):
    """Obtener actividad reciente de amigos."""
    user = await require_auth(request)
    return await get_friend_activity(user["id"], limit)


# ── Admin: Invite Codes ──

@app.post("/admin/invite-codes", tags=["Admin"])
async def generate_codes_endpoint(request: Request, body: GenerateCodesRequest):
    """Generar nuevos códigos de invitación (solo admin)."""
    user = await require_admin(request)
    codes = await generate_invite_codes(body.count, user["id"])
    return {"codes": codes}


@app.get("/admin/invite-codes", tags=["Admin"])
async def get_codes_endpoint(request: Request):
    """Ver todos los códigos de invitación (solo admin)."""
    await require_admin(request)
    return await get_all_codes()


# ══════════════════════════════════════════════════════════
# SISTEMA DE SEGUIMIENTO (FOLLOWS)
# ══════════════════════════════════════════════════════════

@app.post("/follows/{user_id}", tags=["Follows"])
async def follow_endpoint(request: Request, user_id: str):
    """Seguir a un usuario."""
    me = await require_auth(request)
    result = await follow_user(me["id"], user_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@app.delete("/follows/{user_id}", tags=["Follows"])
async def unfollow_endpoint(request: Request, user_id: str):
    """Dejar de seguir a un usuario."""
    me = await require_auth(request)
    success = await unfollow_user(me["id"], user_id)
    if not success:
        raise HTTPException(status_code=404, detail="No encontrado")
    return {"ok": True}


@app.get("/follows/following", tags=["Follows"])
async def get_following_endpoint(request: Request):
    """Obtener lista de usuarios que sigo."""
    me = await require_auth(request)
    return await get_following(me["id"])


@app.get("/follows/followers", tags=["Follows"])
async def get_followers_endpoint(request: Request):
    """Obtener lista de mis seguidores."""
    me = await require_auth(request)
    return await get_followers(me["id"])


@app.get("/follows/counts/{user_id}", tags=["Follows"])
async def get_follow_counts_endpoint(request: Request, user_id: str):
    """Obtener contadores de seguidores/seguidos de un usuario."""
    await require_auth(request)
    return await get_follow_counts(user_id)


# ══════════════════════════════════════════════════════════
# LISTAS PERSONALIZADAS
# ══════════════════════════════════════════════════════════

@app.get("/custom-lists", tags=["Listas Personalizadas"])
async def get_custom_lists_endpoint(request: Request):
    """Obtener mis listas personalizadas."""
    user = await require_auth(request)
    return await get_custom_lists(user["id"])


@app.post("/custom-lists", tags=["Listas Personalizadas"])
async def create_custom_list_endpoint(request: Request, body: CreateCustomListRequest):
    """Crear una nueva lista personalizada."""
    user = await require_auth(request)
    return await create_custom_list(user["id"], body.name, body.description)


@app.delete("/custom-lists/{list_id}", tags=["Listas Personalizadas"])
async def delete_custom_list_endpoint(request: Request, list_id: int):
    """Eliminar una lista personalizada."""
    user = await require_auth(request)
    success = await delete_custom_list(list_id, user["id"])
    if not success:
        raise HTTPException(status_code=404, detail="Lista no encontrada")
    return {"ok": True}


@app.get("/custom-lists/{list_id}/items", tags=["Listas Personalizadas"])
async def get_custom_list_items_endpoint(request: Request, list_id: int):
    """Obtener items de una lista personalizada."""
    await require_auth(request)
    return await get_custom_list_items(list_id)


@app.post("/custom-lists/{list_id}/items", tags=["Listas Personalizadas"])
async def add_to_custom_list_endpoint(request: Request, list_id: int, body: AddToCustomListRequest):
    """Añadir película a una lista personalizada."""
    await require_auth(request)
    return await add_to_custom_list(
        list_id=list_id,
        tmdb_id=body.tmdb_id,
        movie_title=body.movie_title,
        movie_poster=body.movie_poster,
        movie_year=body.movie_year,
    )


@app.delete("/custom-lists/{list_id}/items/{tmdb_id}", tags=["Listas Personalizadas"])
async def remove_from_custom_list_endpoint(request: Request, list_id: int, tmdb_id: int):
    """Eliminar película de una lista personalizada."""
    await require_auth(request)
    success = await remove_from_custom_list(list_id, tmdb_id)
    if not success:
        raise HTTPException(status_code=404, detail="No encontrado")
    return {"ok": True}


# ══════════════════════════════════════════════════════════
# ESTADÍSTICAS DE PERFIL
# ══════════════════════════════════════════════════════════

@app.get("/stats/{user_id}", tags=["Estadísticas"])
async def get_stats_endpoint(request: Request, user_id: str):
    """Obtener estadísticas de un usuario."""
    await require_auth(request)
    return await get_user_stats(user_id)


@app.get("/stats", tags=["Estadísticas"])
async def get_my_stats_endpoint(request: Request):
    """Obtener mis estadísticas."""
    user = await require_auth(request)
    return await get_user_stats(user["id"])


# ══════════════════════════════════════════════════════════
# COMPARAR GUSTOS
# ══════════════════════════════════════════════════════════

@app.get("/compare/{user_id}", tags=["Social"])
async def compare_endpoint(request: Request, user_id: str):
    """Comparar mis puntuaciones con las de otro usuario."""
    user = await require_auth(request)
    return await compare_users(user["id"], user_id)


# ══════════════════════════════════════════════════════════
# RESEÑAS RECIENTES
# ══════════════════════════════════════════════════════════

@app.get("/reviews", tags=["Social"])
async def get_reviews_endpoint(request: Request, limit: int = Query(20, ge=1, le=50)):
    """Obtener reseñas recientes de todos los usuarios."""
    await require_auth(request)
    return await get_recent_reviews(limit)

