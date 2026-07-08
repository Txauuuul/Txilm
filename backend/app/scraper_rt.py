"""
Txilms Backend - Scraping de Rotten Tomatoes
=============================================
Extrae la puntuación (Tomatometer y Audience Score)
de Rotten Tomatoes buscando por título y año.

NOTA: El scraping depende de la estructura HTML actual.
Si RT cambia su frontend, se deben actualizar los selectores.
"""

import re
import httpx
from typing import Any, Dict, Optional
from urllib.parse import quote_plus
from bs4 import BeautifulSoup

from app.config import DEFAULT_HEADERS
from app.cache import cache_get, cache_set

import logging

logger = logging.getLogger("txilms.scraper.rt")

_client = httpx.AsyncClient(
    timeout=15.0,
    headers=DEFAULT_HEADERS,
    follow_redirects=True,
)


def _cache_key(title: str, year: str) -> str:
    return f"rt:{title.lower().strip()}:{year}"


async def get_rotten_tomatoes_score(
    title: str,
    year: str = "",
    imdb_id: str = "",
) -> Dict[str, Any]:
    """
    Busca la película en Rotten Tomatoes y extrae las puntuaciones.

    Estrategia:
      1. Buscar en la API de búsqueda de RT.
      2. Acceder a la página de la película.
      3. Parsear el Tomatometer y el Audience Score del HTML.

    Retorna:
      {
        "tomatometer": 85,          # Puntuación críticos (0-100) o None
        "audience_score": 90,       # Puntuación audiencia (0-100) o None
        "tomatometer_state": "fresh", # fresh, certified_fresh, rotten
        "url": "https://..."
      }
    """
    key = _cache_key(title, year)

    # ── Intentar caché primero ──
    cached = cache_get(key)
    if cached is not None:
        logger.info(f"RT cache hit: {key}")
        return cached

    result: Dict[str, Any] = {
        "tomatometer": None,
        "audience_score": None,
        "tomatometer_state": None,
        "url": None,
    }

    try:
        # ── Paso 1: Buscar la película ──
        search_url = f"https://www.rottentomatoes.com/search?search={quote_plus(title)}"
        resp = await _client.get(search_url)
        resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "lxml")

        # Buscar el primer enlace a una película en los resultados
        movie_url = _find_movie_url(soup, title, year)

        if not movie_url:
            # Intentar con la API JSON de búsqueda de RT
            movie_url = await _search_rt_api(title, year)

        if not movie_url:
            logger.warning(f"RT: No se encontró '{title}' ({year})")
            cache_set(key, result)
            return result

        # ── Paso 2: Acceder a la página de la película ──
        if not movie_url.startswith("http"):
            movie_url = f"https://www.rottentomatoes.com{movie_url}"

        result["url"] = movie_url

        detail_resp = await _client.get(movie_url)
        detail_resp.raise_for_status()

        detail_soup = BeautifulSoup(detail_resp.text, "lxml")

        # ── Paso 3: Extraer puntuaciones ──
        result = _parse_scores(detail_soup, result)

    except httpx.HTTPStatusError as e:
        logger.error(f"RT HTTP error: {e.response.status_code} para '{title}'")
    except httpx.RequestError as e:
        logger.error(f"RT request error: {e} para '{title}'")
    except Exception as e:
        logger.error(f"RT error inesperado: {e} para '{title}'", exc_info=True)

    # Guardar en caché (incluso si no se encontró, para no reintentar)
    cache_set(key, result)
    return result


def _find_movie_url(soup: BeautifulSoup, title: str, year: str) -> Optional[str]:
    """
    Busca la URL de la película en la página de resultados de RT.
    Intenta múltiples selectores por si la estructura cambia.
    """
    # Selector moderno: search-page-media-row
    rows = soup.select("search-page-media-row")
    for row in rows:
        # Verificar que es tipo película
        if row.get("data-qa") == "data-row" or True:
            link = row.select_one("a[href*='/m/']")
            if link:
                row_year = row.get("releaseyear", "")
                href = link.get("href", "")

                # Si tenemos año, comprobar coincidencia
                if year and row_year and row_year.strip() == year.strip():
                    return href
                elif not year:
                    return href

    # Fallback: buscar cualquier enlace /m/ en la página
    for link in soup.select("a[href*='/m/']"):
        href = link.get("href", "")
        if "/m/" in href and "review" not in href:
            return href

    return None


async def _search_rt_api(title: str, year: str) -> Optional[str]:
    """
    Intenta usar el endpoint JSON interno de búsqueda de RT.
    """
    try:
        api_url = f"https://www.rottentomatoes.com/api/private/v2.0/search/?q={quote_plus(title)}&limit=5"
        resp = await _client.get(api_url)
        if resp.status_code == 200:
            data = resp.json()
            movies = data.get("movies", [])
            for movie in movies:
                movie_year = str(movie.get("year", ""))
                if year and movie_year == year:
                    return movie.get("url")
            # Si no coincide por año, devolver el primero
            if movies:
                return movies[0].get("url")
    except Exception as e:
        logger.debug(f"RT API search fallback failed: {e}")

    return None


def _parse_scores(soup: BeautifulSoup, result: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extrae Tomatometer y Audience Score del HTML de la página de detalle.
    Maneja múltiples estructuras HTML posibles.
    """
    # ── Tomatometer (puntuación de críticos) ──
    # Método 1: score-board element
    score_board = soup.select_one("score-board")
    if score_board:
        tomatometer = score_board.get("tomatometerscore")
        audience = score_board.get("audiencescore")
        state = score_board.get("tomatometerstate")

        if tomatometer and tomatometer.isdigit():
            result["tomatometer"] = int(tomatometer)
        if audience and audience.isdigit():
            result["audience_score"] = int(audience)
        if state:
            result["tomatometer_state"] = state
        return result

    # Método 2: Buscar en score-icon-critics-deprecated o rt-button
    for selector in [
        "rt-button[slot='criticsScore']",
        "rt-text[slot='criticsScore']",
        "[data-qa='tomatometer']",
        ".mop-ratings-wrap__percentage",
    ]:
        elem = soup.select_one(selector)
        if elem:
            text = elem.get_text(strip=True)
            match = re.search(r"(\d{1,3})%?", text)
            if match:
                result["tomatometer"] = int(match.group(1))
                break

    # Audience Score
    for selector in [
        "rt-button[slot='audienceScore']",
        "rt-text[slot='audienceScore']",
        "[data-qa='audience-score']",
    ]:
        elem = soup.select_one(selector)
        if elem:
            text = elem.get_text(strip=True)
            match = re.search(r"(\d{1,3})%?", text)
            if match:
                result["audience_score"] = int(match.group(1))
                break

    # Tomatometer state
    for selector in [
        "[data-qa='tomatometer-state']",
        "score-icon-critics",
    ]:
        elem = soup.select_one(selector)
        if elem:
            state = elem.get("state") or elem.get("sentiment") or ""
            if state:
                result["tomatometer_state"] = state.lower()
                break

    # Método 3: Búsqueda genérica en el JSON-LD
    scripts = soup.select('script[type="application/ld+json"]')
    for script in scripts:
        try:
            import json
            ld_data = json.loads(script.string or "")
            if isinstance(ld_data, dict):
                rating = ld_data.get("aggregateRating", {})
                if rating and result["tomatometer"] is None:
                    val = rating.get("ratingValue")
                    if val is not None:
                        result["tomatometer"] = int(float(val))
        except (json.JSONDecodeError, ValueError):
            continue

    return result
