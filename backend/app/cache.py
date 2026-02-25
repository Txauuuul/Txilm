"""
Txilms Backend - Sistema de Caché con Supabase
================================================
Caché en Supabase (PostgreSQL) para las puntuaciones scrapeadas.
Cada entrada tiene un TTL de 7 días para evitar baneos.

Reemplaza la versión anterior basada en SQLite, que no funciona
en entornos serverless como Vercel (filesystem efímero).
"""

import json
import time
import logging
from typing import Optional, Dict, Any

from app.config import CACHE_TTL_SECONDS, SUPABASE_URL, SUPABASE_KEY

logger = logging.getLogger("txilms.cache")

# ── Cliente Supabase (lazy init) ──────────────────────────
_supabase_client = None


def _get_client():
    """Inicializa el cliente de Supabase de forma perezosa."""
    global _supabase_client
    if _supabase_client is None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            logger.warning(
                "⚠️  SUPABASE_URL o SUPABASE_KEY no configuradas. "
                "La caché no funcionará."
            )
            return None
        try:
            from supabase import create_client
            _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
            logger.info("✅ Cliente Supabase inicializado.")
        except Exception as e:
            logger.error(f"Error inicializando Supabase: {e}")
            return None
    return _supabase_client


def cache_get(key: str) -> Optional[Dict[str, Any]]:
    """
    Obtiene un valor de la caché si existe y no ha expirado.
    Retorna None si no está o si expiró.
    """
    client = _get_client()
    if client is None:
        return None

    try:
        response = (
            client.table("score_cache")
            .select("data, created_at")
            .eq("cache_key", key)
            .execute()
        )

        if not response.data:
            return None

        row = response.data[0]
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
    """Guarda o actualiza un valor en la caché."""
    client = _get_client()
    if client is None:
        return

    try:
        row = {
            "cache_key": key,
            "data": json.dumps(data, ensure_ascii=False),
            "created_at": time.time(),
        }
        client.table("score_cache").upsert(
            row, on_conflict="cache_key"
        ).execute()
    except Exception as e:
        logger.error(f"Error guardando caché para '{key}': {e}")


def cache_delete(key: str) -> None:
    """Elimina una entrada de la caché."""
    client = _get_client()
    if client is None:
        return

    try:
        client.table("score_cache").delete().eq("cache_key", key).execute()
    except Exception as e:
        logger.error(f"Error eliminando caché para '{key}': {e}")


def cache_cleanup() -> int:
    """Elimina todas las entradas expiradas. Devuelve la cantidad eliminada."""
    client = _get_client()
    if client is None:
        return 0

    try:
        cutoff = time.time() - CACHE_TTL_SECONDS
        response = (
            client.table("score_cache")
            .delete()
            .lt("created_at", cutoff)
            .execute()
        )
        deleted = len(response.data) if response.data else 0
        if deleted:
            logger.info(f"🧹 Limpieza de caché: {deleted} entradas expiradas.")
        return deleted
    except Exception as e:
        logger.error(f"Error en limpieza de caché: {e}")
        return 0
