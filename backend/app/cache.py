"""
Txilms Backend - Sistema de Caché con Supabase (REST directo)
===============================================================
Caché en Supabase (PostgreSQL) para los datos unificados de películas.
Cada entrada tiene un TTL de 7 días.

Usa llamadas REST directas a la API PostgREST de Supabase con httpx,
evitando el SDK pesado (que trae dependencias con extensiones C).
"""

import json
import time
import logging
from typing import Optional, Dict, Any

import httpx

from app.config import CACHE_TTL_SECONDS, SUPABASE_URL, SUPABASE_KEY

logger = logging.getLogger("txilms.cache")

# ── Headers base para PostgREST ──────────────────────────
_TABLE = "score_cache"


def _headers(*, prefer: str = "") -> dict:
    """Construye headers para la API REST de Supabase."""
    h = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    if prefer:
        h["Prefer"] = prefer
    return h


def _rest_url(query_params: str = "") -> str:
    """Construye la URL REST para la tabla de caché."""
    base = f"{SUPABASE_URL}/rest/v1/{_TABLE}"
    if query_params:
        return f"{base}?{query_params}"
    return base


def _is_configured() -> bool:
    if not SUPABASE_URL or not SUPABASE_KEY:
        return False
    return True


def cache_get(key: str) -> Optional[Dict[str, Any]]:
    """
    Obtiene un valor de la caché si existe y no ha expirado.
    Retorna None si no existe o si expiró.
    """
    if not _is_configured():
        return None

    try:
        url = _rest_url(f"cache_key=eq.{key}&select=data,created_at")
        resp = httpx.get(url, headers=_headers(), timeout=10)
        resp.raise_for_status()

        rows = resp.json()
        if not rows:
            return None

        row = rows[0]
        created_at = float(row["created_at"])
        age = time.time() - created_at

        if age > CACHE_TTL_SECONDS:
            cache_delete(key)
            return None

        data = row["data"]
        if isinstance(data, str):
            return json.loads(data)
        return data

    except Exception as e:
        logger.error(f"Error leyendo caché para '{key}': {e}")
        return None


def cache_set(key: str, data: Dict[str, Any]) -> None:
    """Guarda o actualiza un valor en la caché (upsert)."""
    if not _is_configured():
        return

    try:
        row = {
            "cache_key": key,
            "data": json.dumps(data, ensure_ascii=False),
            "created_at": time.time(),
        }
        url = _rest_url()
        resp = httpx.post(
            url,
            json=row,
            headers=_headers(prefer="resolution=merge-duplicates"),
            timeout=10,
        )
        resp.raise_for_status()
    except Exception as e:
        logger.error(f"Error guardando caché para '{key}': {e}")


def cache_delete(key: str) -> None:
    """Elimina una entrada de la caché."""
    if not _is_configured():
        return

    try:
        url = _rest_url(f"cache_key=eq.{key}")
        resp = httpx.delete(url, headers=_headers(), timeout=10)
        resp.raise_for_status()
    except Exception as e:
        logger.error(f"Error eliminando caché para '{key}': {e}")


def cache_cleanup() -> int:
    """Elimina todas las entradas expiradas. Devuelve la cantidad eliminada."""
    if not _is_configured():
        return 0

    try:
        cutoff = time.time() - CACHE_TTL_SECONDS
        url = _rest_url(f"created_at=lt.{cutoff}")
        resp = httpx.delete(
            url,
            headers=_headers(prefer="return=representation"),
            timeout=15,
        )
        resp.raise_for_status()
        deleted = len(resp.json()) if resp.text else 0
        if deleted:
            logger.info(f"🧹 Limpieza de caché: {deleted} entradas expiradas.")
        return deleted
    except Exception as e:
        logger.error(f"Error en limpieza de caché: {e}")
        return 0
