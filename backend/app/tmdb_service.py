"""
Txilms Backend - Servicio TMDB
===============================
Todas las interacciones con la API de TMDB:
  - Búsqueda de películas/series
  - Detalle completo
  - Tendencias (populares)
  - Proveedores de streaming por región
"""

import httpx
from typing import Any, Dict, List, Optional

from app.config import TMDB_API_KEY, TMDB_BASE_URL, TMDB_IMAGE_BASE

# ── Cliente HTTP reutilizable ──────────────────────────────
_client = httpx.AsyncClient(timeout=15.0)


def _params(**extra: Any) -> Dict[str, Any]:
    """Genera los parámetros base para cualquier petición a TMDB."""
    base = {"api_key": TMDB_API_KEY, "language": "es-ES"}
    base.update(extra)
    return base


def _poster_url(path: Optional[str], size: str = "w500") -> Optional[str]:
    """Construye la URL completa del póster."""
    if not path:
        return None
    return f"{TMDB_IMAGE_BASE}/{size}{path}"


def _backdrop_url(path: Optional[str], size: str = "w1280") -> Optional[str]:
    """Construye la URL completa del backdrop."""
    if not path:
        return None
    return f"{TMDB_IMAGE_BASE}/{size}{path}"


# ── Búsqueda ───────────────────────────────────────────────
async def search_movies(query: str, page: int = 1) -> Dict[str, Any]:
    """
    Busca películas en TMDB por texto.
    Devuelve la lista de resultados simplificados.
    """
    resp = await _client.get(
        f"{TMDB_BASE_URL}/search/movie",
        params=_params(query=query, page=page, include_adult=False),
    )
    resp.raise_for_status()
    data = resp.json()

    results = []
    for item in data.get("results", []):
        results.append({
            "tmdb_id": item["id"],
            "title": item.get("title", ""),
            "original_title": item.get("original_title", ""),
            "year": (item.get("release_date") or "")[:4],
            "overview": item.get("overview", ""),
            "poster": _poster_url(item.get("poster_path")),
            "backdrop": _backdrop_url(item.get("backdrop_path")),
            "vote_average": item.get("vote_average", 0),
        })

    return {
        "page": data.get("page", 1),
        "total_pages": data.get("total_pages", 1),
        "total_results": data.get("total_results", 0),
        "results": results,
    }


# ── Detalle completo ──────────────────────────────────────
async def get_movie_detail(tmdb_id: int) -> Dict[str, Any]:
    """
    Obtiene los datos completos de una película desde TMDB,
    incluyendo el IMDb ID a través de external_ids.
    """
    # Petición principal + external_ids en una sola llamada
    resp = await _client.get(
        f"{TMDB_BASE_URL}/movie/{tmdb_id}",
        params=_params(append_to_response="external_ids,credits,videos"),
    )
    resp.raise_for_status()
    data = resp.json()

    # Extraer géneros
    genres = [g["name"] for g in data.get("genres", [])]

    # Extraer director del crew
    director = ""
    credits = data.get("credits", {})
    for person in credits.get("crew", []):
        if person.get("job") == "Director":
            director = person.get("name", "")
            break

    # Extraer reparto principal (top 10)
    cast = []
    for person in credits.get("cast", [])[:10]:
        cast.append({
            "name": person.get("name", ""),
            "character": person.get("character", ""),
            "profile_image": _poster_url(person.get("profile_path"), "w185"),
        })

    external = data.get("external_ids", {})

    # Extraer videos/tráilers (preferir YouTube, preferir tráiler oficial en español, luego en inglés)
    videos = []
    for v in data.get("videos", {}).get("results", []):
        if v.get("site") == "YouTube" and v.get("type") in ("Trailer", "Teaser"):
            videos.append({
                "key": v["key"],
                "name": v.get("name", ""),
                "type": v.get("type", ""),
                "lang": v.get("iso_639_1", ""),
            })
    # Sort: Spanish trailers first, then trailers before teasers
    videos.sort(key=lambda v: (v["lang"] != "es", v["type"] != "Trailer"))

    return {
        "tmdb_id": data["id"],
        "imdb_id": external.get("imdb_id"),
        "title": data.get("title", ""),
        "original_title": data.get("original_title", ""),
        "year": (data.get("release_date") or "")[:4],
        "release_date": data.get("release_date"),
        "runtime": data.get("runtime"),
        "overview": data.get("overview", ""),
        "genres": genres,
        "director": director,
        "cast": cast,
        "poster": _poster_url(data.get("poster_path")),
        "backdrop": _backdrop_url(data.get("backdrop_path")),
        "vote_average_tmdb": round(data.get("vote_average", 0), 1),
        "vote_count_tmdb": data.get("vote_count", 0),
        "videos": videos[:5],  # Top 5 trailers/teasers
        "genre_ids": [g["id"] for g in data.get("genres", [])],
    }


# ── Proveedores de streaming ─────────────────────────────
async def get_watch_providers(tmdb_id: int, region: str = "ES") -> Dict[str, Any]:
    """
    Obtiene las plataformas de streaming disponibles para una película,
    filtradas por país/región.
    """
    resp = await _client.get(
        f"{TMDB_BASE_URL}/movie/{tmdb_id}/watch/providers",
        params=_params(),
    )
    resp.raise_for_status()
    data = resp.json()

    region_upper = region.upper()
    region_data = data.get("results", {}).get(region_upper, {})

    providers = {
        "link": region_data.get("link"),
        "flatrate": [],   # Suscripción
        "rent": [],        # Alquiler
        "buy": [],         # Compra
    }

    for category in ["flatrate", "rent", "buy"]:
        for p in region_data.get(category, []):
            providers[category].append({
                "provider_id": p.get("provider_id"),
                "provider_name": p.get("provider_name", ""),
                "logo": _poster_url(p.get("logo_path"), "w92"),
            })

    return providers


# ── Tendencias / Populares ────────────────────────────────
async def get_trending(time_window: str = "week", page: int = 1) -> List[Dict[str, Any]]:
    """
    Obtiene las películas en tendencia (día o semana).
    """
    resp = await _client.get(
        f"{TMDB_BASE_URL}/trending/movie/{time_window}",
        params=_params(page=page),
    )
    resp.raise_for_status()
    data = resp.json()

    results = []
    for item in data.get("results", []):
        results.append({
            "tmdb_id": item["id"],
            "title": item.get("title", ""),
            "original_title": item.get("original_title", ""),
            "year": (item.get("release_date") or "")[:4],
            "poster": _poster_url(item.get("poster_path")),
            "backdrop": _backdrop_url(item.get("backdrop_path")),
        })

    return results


# ── Discover (categorías) ─────────────────────────────────
async def discover_movies(
    sort_by: str = "popularity.desc",
    with_genres: str = None,
    vote_count_gte: int = 100,
    vote_average_gte: float = None,
    page: int = 1,
) -> List[Dict[str, Any]]:
    """
    Descubre películas por criterios: género, puntuación mínima, etc.
    Ideal para secciones como 'Mejores de animación', 'Mejores de suspense', etc.
    """
    extra = {"sort_by": sort_by, "page": page, "vote_count.gte": vote_count_gte}
    if with_genres:
        extra["with_genres"] = with_genres
    if vote_average_gte is not None:
        extra["vote_average.gte"] = vote_average_gte

    resp = await _client.get(
        f"{TMDB_BASE_URL}/discover/movie",
        params=_params(**extra),
    )
    resp.raise_for_status()
    data = resp.json()

    results = []
    for item in data.get("results", []):
        results.append({
            "tmdb_id": item["id"],
            "title": item.get("title", ""),
            "original_title": item.get("original_title", ""),
            "year": (item.get("release_date") or "")[:4],
            "poster": _poster_url(item.get("poster_path")),
            "backdrop": _backdrop_url(item.get("backdrop_path")),
        })

    return results


# ── Top Rated ─────────────────────────────────────────────
async def get_top_rated(page: int = 1) -> List[Dict[str, Any]]:
    """
    Obtiene las películas mejor valoradas de todos los tiempos en TMDB.
    """
    resp = await _client.get(
        f"{TMDB_BASE_URL}/movie/top_rated",
        params=_params(page=page),
    )
    resp.raise_for_status()
    data = resp.json()

    results = []
    for item in data.get("results", []):
        results.append({
            "tmdb_id": item["id"],
            "title": item.get("title", ""),
            "original_title": item.get("original_title", ""),
            "year": (item.get("release_date") or "")[:4],
            "poster": _poster_url(item.get("poster_path")),
            "backdrop": _backdrop_url(item.get("backdrop_path")),
        })

    return results


# ── Recomendaciones ───────────────────────────────────────
async def get_recommendations(tmdb_id: int, page: int = 1) -> List[Dict[str, Any]]:
    """
    Obtiene recomendaciones basadas en una película específica.
    """
    resp = await _client.get(
        f"{TMDB_BASE_URL}/movie/{tmdb_id}/recommendations",
        params=_params(page=page),
    )
    resp.raise_for_status()
    data = resp.json()

    results = []
    for item in data.get("results", []):
        results.append({
            "tmdb_id": item["id"],
            "title": item.get("title", ""),
            "original_title": item.get("original_title", ""),
            "year": (item.get("release_date") or "")[:4],
            "poster": _poster_url(item.get("poster_path")),
            "backdrop": _backdrop_url(item.get("backdrop_path")),
        })

    return results
