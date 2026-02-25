"""
Txilms Backend - Scraping de FilmAffinity
==========================================
Extrae la puntuación media de FilmAffinity (España)
buscando por título original y año.

NOTA: El scraping depende de la estructura HTML actual de FA.
Si cambian su frontend, se deben actualizar los selectores.
"""

import re
import httpx
from typing import Any, Dict, Optional
from urllib.parse import quote_plus
from bs4 import BeautifulSoup

from app.config import DEFAULT_HEADERS, FILMAFFINITY_SEARCH_URL
from app.cache import cache_get, cache_set

import logging

logger = logging.getLogger("txilms.scraper.fa")

_client = httpx.AsyncClient(
    timeout=15.0,
    headers={
        **DEFAULT_HEADERS,
        "Referer": "https://www.filmaffinity.com/es/main.html",
    },
    follow_redirects=True,
)


def _cache_key(title: str, year: str) -> str:
    return f"fa:{title.lower().strip()}:{year}"


async def get_filmaffinity_score(
    title: str,
    year: str = "",
    original_title: str = "",
) -> Dict[str, Any]:
    """
    Busca la película en FilmAffinity y extrae la puntuación.

    Estrategia:
      1. Buscar usando el título original (o el español).
      2. Filtrar por año si está disponible.
      3. Acceder a la ficha y extraer la nota media.

    Retorna:
      {
        "score": 7.2,        # Nota media (0-10) o None
        "votes": "12.345",   # Número de votos como string o None
        "url": "https://..."
      }
    """
    # Usar título original si está disponible (más preciso en FA)
    search_title = original_title or title
    key = _cache_key(search_title, year)

    # ── Intentar caché primero ──
    cached = cache_get(key)
    if cached is not None:
        logger.info(f"FA cache hit: {key}")
        return cached

    result: Dict[str, Any] = {
        "score": None,
        "votes": None,
        "url": None,
    }

    try:
        # ── Paso 1: Búsqueda ──
        params = {"stext": search_title, "stype": "title"}
        resp = await _client.get(FILMAFFINITY_SEARCH_URL, params=params)
        resp.raise_for_status()

        # FilmAffinity puede redirigir directamente a la ficha si hay un solo resultado
        if "/film" in resp.url.path and resp.url.path != "/es/search.php":
            # Redirigido directamente a la ficha
            result["url"] = str(resp.url)
            result = _parse_movie_page(
                BeautifulSoup(resp.text, "lxml"), result
            )
        else:
            # Página de resultados múltiples
            soup = BeautifulSoup(resp.text, "lxml")
            movie_url = _find_movie_in_results(soup, search_title, year)

            if not movie_url:
                # Intentar con el título en español
                if original_title and title != original_title:
                    movie_url = await _retry_search_spanish(title, year)

            if movie_url:
                if not movie_url.startswith("http"):
                    movie_url = f"https://www.filmaffinity.com{movie_url}"

                result["url"] = movie_url

                detail_resp = await _client.get(movie_url)
                detail_resp.raise_for_status()

                detail_soup = BeautifulSoup(detail_resp.text, "lxml")
                result = _parse_movie_page(detail_soup, result)
            else:
                logger.warning(
                    f"FA: No se encontró '{search_title}' ({year})"
                )

    except httpx.HTTPStatusError as e:
        logger.error(f"FA HTTP error: {e.response.status_code} para '{search_title}'")
    except httpx.RequestError as e:
        logger.error(f"FA request error: {e} para '{search_title}'")
    except Exception as e:
        logger.error(
            f"FA error inesperado: {e} para '{search_title}'", exc_info=True
        )

    # Guardar en caché
    cache_set(key, result)
    return result


def _find_movie_in_results(
    soup: BeautifulSoup, title: str, year: str
) -> Optional[str]:
    """
    Filtra los resultados de búsqueda de FilmAffinity.
    Busca coincidencia por título y opcionalmente por año.
    """
    # Selector principal: elementos de resultado de búsqueda
    items = soup.select(".se-it")

    for item in items:
        # Extraer título del resultado
        title_elem = item.select_one(".mc-title a")
        if not title_elem:
            continue

        item_title = title_elem.get_text(strip=True)
        href = title_elem.get("href", "")

        # Extraer año
        year_elem = item.select_one(".ye-w")
        item_year = year_elem.get_text(strip=True) if year_elem else ""

        # Comparar: coincidencia por año si tenemos ambos
        if year and item_year:
            if item_year.strip() == year.strip():
                return href
        else:
            # Sin año, devolver el primer resultado
            return href

    # Fallback: buscar en estructura alternativa
    for link in soup.select("a[href*='/film']"):
        href = link.get("href", "")
        if "/film" in href and href.endswith(".html"):
            return href

    return None


async def _retry_search_spanish(title: str, year: str) -> Optional[str]:
    """Reintenta la búsqueda con el título en español."""
    try:
        params = {"stext": title, "stype": "title"}
        resp = await _client.get(FILMAFFINITY_SEARCH_URL, params=params)
        resp.raise_for_status()

        if "/film" in resp.url.path:
            return str(resp.url)

        soup = BeautifulSoup(resp.text, "lxml")
        return _find_movie_in_results(soup, title, year)
    except Exception as e:
        logger.debug(f"FA retry search failed: {e}")
        return None


def _parse_movie_page(
    soup: BeautifulSoup, result: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Extrae la puntuación media y el número de votos
    de la página de detalle de FilmAffinity.
    """
    # ── Puntuación media ──
    # Método 1: div#movie-rat-avg
    rating_elem = soup.select_one("#movie-rat-avg")
    if rating_elem:
        text = rating_elem.get_text(strip=True).replace(",", ".")
        match = re.search(r"(\d+\.?\d*)", text)
        if match:
            result["score"] = round(float(match.group(1)), 1)

    # Método 2: itemprop="ratingValue"
    if result["score"] is None:
        meta = soup.select_one('[itemprop="ratingValue"]')
        if meta:
            val = meta.get("content") or meta.get_text(strip=True)
            val = val.replace(",", ".")
            match = re.search(r"(\d+\.?\d*)", val)
            if match:
                result["score"] = round(float(match.group(1)), 1)

    # ── Número de votos ──
    votes_elem = soup.select_one("#movie-count-rat span")
    if votes_elem:
        result["votes"] = votes_elem.get_text(strip=True)
    else:
        meta_votes = soup.select_one('[itemprop="ratingCount"]')
        if meta_votes:
            result["votes"] = (
                meta_votes.get("content") or meta_votes.get_text(strip=True)
            )

    return result
