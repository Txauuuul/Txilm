"""
Txilms Backend - Servicio OMDb
===============================
Consulta la API oficial de OMDb para obtener:
  - Puntuación IMDb (del array "Ratings")
  - Puntuación Rotten Tomatoes (del array "Ratings")

Esto reemplaza el scraping de Rotten Tomatoes y proporciona
datos más fiables y estables que el web scraping.

Endpoint: http://www.omdbapi.com/?i={imdb_id}&apikey={key}
"""

import httpx
import logging
from typing import Any, Dict, Optional

from app.config import OMDB_API_KEY

logger = logging.getLogger("txilms.omdb")

_client = httpx.AsyncClient(timeout=15.0)

OMDB_BASE_URL = "http://www.omdbapi.com/"


async def get_omdb_ratings(imdb_id: str) -> Dict[str, Any]:
    """
    Consulta OMDb con un IMDb ID (ej: tt0468569) y extrae
    las puntuaciones de IMDb y Rotten Tomatoes del array "Ratings".

    Retorna:
      {
        "imdb_score": 9.0,           # Nota IMDb (0-10) o None
        "imdb_votes": "2,845,245",   # Votos como string o None
        "rt_score": 94,              # Tomatometer (0-100) o None
        "metascore": 84,             # Metascore (0-100) o None
        "rated": "PG-13",            # Clasificación por edad
        "source": "OMDb"
      }
    """
    result: Dict[str, Any] = {
        "imdb_score": None,
        "imdb_votes": None,
        "rt_score": None,
        "metascore": None,
        "rated": None,
        "source": "OMDb",
    }

    if not OMDB_API_KEY:
        logger.warning("⚠️  OMDB_API_KEY no configurada. Puntuaciones IMDb/RT no disponibles.")
        return result

    if not imdb_id:
        logger.warning("No se proporcionó imdb_id para consultar OMDb.")
        return result

    try:
        resp = await _client.get(
            OMDB_BASE_URL,
            params={
                "i": imdb_id,
                "apikey": OMDB_API_KEY,
                "plot": "short",
            },
        )
        resp.raise_for_status()
        data = resp.json()

        # ── Verificar que la respuesta es válida ──
        if data.get("Response") == "False":
            logger.warning(f"OMDb no encontró {imdb_id}: {data.get('Error', 'Unknown')}")
            return result

        # ── Extraer clasificación ──
        result["rated"] = data.get("Rated") if data.get("Rated") != "N/A" else None

        # ── Extraer votos de IMDb ──
        imdb_votes = data.get("imdbVotes", "N/A")
        if imdb_votes and imdb_votes != "N/A":
            result["imdb_votes"] = imdb_votes

        # ── Extraer Metascore ──
        metascore = data.get("Metascore", "N/A")
        if metascore and metascore != "N/A":
            try:
                result["metascore"] = int(metascore)
            except (ValueError, TypeError):
                pass

        # ── Parsear el array "Ratings" ──
        ratings = data.get("Ratings", [])
        for rating in ratings:
            source = rating.get("Source", "")
            value = rating.get("Value", "")

            if source == "Internet Movie Database":
                # Formato: "9.0/10"
                result["imdb_score"] = _parse_imdb_rating(value)

            elif source == "Rotten Tomatoes":
                # Formato: "94%"
                result["rt_score"] = _parse_rt_rating(value)

        # ── Fallback: si IMDb no está en Ratings, usar imdbRating ──
        if result["imdb_score"] is None:
            imdb_rating = data.get("imdbRating", "N/A")
            if imdb_rating and imdb_rating != "N/A":
                try:
                    result["imdb_score"] = round(float(imdb_rating), 1)
                except (ValueError, TypeError):
                    pass

        logger.info(
            f"OMDb {imdb_id}: IMDb={result['imdb_score']}, "
            f"RT={result['rt_score']}, Meta={result['metascore']}"
        )

    except httpx.HTTPStatusError as e:
        logger.error(f"OMDb HTTP error: {e.response.status_code} para {imdb_id}")
    except httpx.RequestError as e:
        logger.error(f"OMDb request error: {e} para {imdb_id}")
    except Exception as e:
        logger.error(f"OMDb error inesperado: {e} para {imdb_id}", exc_info=True)

    return result


def _parse_imdb_rating(value: str) -> Optional[float]:
    """Parsea '9.0/10' → 9.0"""
    try:
        if "/" in value:
            return round(float(value.split("/")[0]), 1)
        return round(float(value), 1)
    except (ValueError, TypeError, IndexError):
        return None


def _parse_rt_rating(value: str) -> Optional[int]:
    """Parsea '94%' → 94"""
    try:
        return int(value.replace("%", "").strip())
    except (ValueError, TypeError):
        return None
