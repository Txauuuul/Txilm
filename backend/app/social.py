"""
Txilms Backend - Módulo Social
================================
Funciones para gestionar listas de usuario, envíos de películas,
notificaciones y actividad de amigos. Todo en Supabase via REST.
"""

import logging
import secrets
import string
from typing import Dict, Any, List, Optional

import httpx

from app.config import SUPABASE_URL, SUPABASE_KEY

logger = logging.getLogger("txilms.social")

_REST_URL = f"{SUPABASE_URL}/rest/v1"


def _headers(*, prefer: str = "") -> dict:
    h = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    if prefer:
        h["Prefer"] = prefer
    return h


# ── Listas de usuario ────────────────────────────────────

async def get_user_lists(user_id: str, list_type: Optional[str] = None) -> List[Dict]:
    """Obtiene todas las listas de un usuario."""
    url = f"{_REST_URL}/user_lists?user_id=eq.{user_id}&order=created_at.desc"
    if list_type:
        url += f"&list_type=eq.{list_type}"

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, headers=_headers())
        return resp.json() if resp.status_code == 200 else []


async def add_to_list(
    user_id: str, tmdb_id: int, list_type: str,
    movie_title: str, movie_poster: str = None,
    movie_year: str = None, rating: int = None,
) -> Dict:
    """Añade una película a la lista de un usuario."""
    body = {
        "user_id": user_id,
        "tmdb_id": tmdb_id,
        "list_type": list_type,
        "movie_title": movie_title,
        "movie_poster": movie_poster,
        "movie_year": movie_year,
    }
    if rating is not None and list_type == "watched":
        body["rating"] = rating

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"{_REST_URL}/user_lists",
            headers=_headers(prefer="return=representation"),
            json=body,
        )
        if resp.status_code in (200, 201):
            data = resp.json()
            return data[0] if isinstance(data, list) else data

        # Si ya existe (UNIQUE constraint), actualizar
        if resp.status_code == 409:
            resp2 = await client.patch(
                f"{_REST_URL}/user_lists?user_id=eq.{user_id}&tmdb_id=eq.{tmdb_id}&list_type=eq.{list_type}",
                headers=_headers(prefer="return=representation"),
                json=body,
            )
            data = resp2.json()
            return data[0] if isinstance(data, list) and data else {}

        logger.error(f"Error añadiendo a lista: {resp.status_code} {resp.text}")
        return {}


async def remove_from_list(user_id: str, tmdb_id: int, list_type: str) -> bool:
    """Elimina una película de la lista de un usuario."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.delete(
            f"{_REST_URL}/user_lists?user_id=eq.{user_id}&tmdb_id=eq.{tmdb_id}&list_type=eq.{list_type}",
            headers=_headers(),
        )
        return resp.status_code in (200, 204)


async def update_rating(user_id: str, tmdb_id: int, rating: int) -> Dict:
    """Actualiza la puntuación de una película vista."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.patch(
            f"{_REST_URL}/user_lists?user_id=eq.{user_id}&tmdb_id=eq.{tmdb_id}&list_type=eq.watched",
            headers=_headers(prefer="return=representation"),
            json={"rating": rating},
        )
        data = resp.json()
        return data[0] if isinstance(data, list) and data else {}


async def get_movie_ratings(tmdb_id: int) -> List[Dict]:
    """Obtiene todas las puntuaciones de usuarios para una película."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{_REST_URL}/user_lists?tmdb_id=eq.{tmdb_id}&list_type=eq.watched&rating=not.is.null&select=user_id,rating,created_at",
            headers=_headers(),
        )
        if resp.status_code != 200:
            return []

        ratings = resp.json()

        # Enriquecer con nombres de usuario
        if ratings:
            user_ids = list(set(r["user_id"] for r in ratings))
            ids_str = ",".join(user_ids)
            profiles_resp = await client.get(
                f"{_REST_URL}/profiles?id=in.({ids_str})&select=id,username,avatar_url",
                headers=_headers(),
            )
            profiles = {}
            if profiles_resp.status_code == 200:
                profiles = {p["id"]: p for p in profiles_resp.json()}

            for r in ratings:
                profile = profiles.get(r["user_id"], {})
                r["username"] = profile.get("username", "???")
                r["avatar_url"] = profile.get("avatar_url")

        return ratings


# ── Envío de películas ────────────────────────────────────

async def share_movie(
    from_user_id: str, to_user_id: str, tmdb_id: int,
    movie_title: str, movie_poster: str = None, message: str = None,
) -> Dict:
    """Envía una película a otro usuario."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        # Crear envío
        resp = await client.post(
            f"{_REST_URL}/movie_shares",
            headers=_headers(prefer="return=representation"),
            json={
                "from_user_id": from_user_id,
                "to_user_id": to_user_id,
                "tmdb_id": tmdb_id,
                "movie_title": movie_title,
                "movie_poster": movie_poster,
                "message": message,
            },
        )
        share_data = {}
        if resp.status_code in (200, 201):
            d = resp.json()
            share_data = d[0] if isinstance(d, list) else d

        # Obtener nombre del remitente
        from_resp = await client.get(
            f"{_REST_URL}/profiles?id=eq.{from_user_id}&select=username",
            headers=_headers(),
        )
        from_name = "Alguien"
        if from_resp.status_code == 200 and from_resp.json():
            from_name = from_resp.json()[0].get("username", "Alguien")

        # Crear notificación
        await client.post(
            f"{_REST_URL}/notifications",
            headers=_headers(),
            json={
                "user_id": to_user_id,
                "type": "movie_shared",
                "from_user_id": from_user_id,
                "data": {
                    "tmdb_id": tmdb_id,
                    "movie_title": movie_title,
                    "movie_poster": movie_poster,
                    "message": message,
                    "from_username": from_name,
                },
            },
        )

        return share_data


# ── Notificaciones ────────────────────────────────────────

async def get_notifications(user_id: str, unread_only: bool = False) -> List[Dict]:
    """Obtiene notificaciones de un usuario."""
    url = f"{_REST_URL}/notifications?user_id=eq.{user_id}&order=created_at.desc&limit=50"
    if unread_only:
        url += "&is_read=eq.false"

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, headers=_headers())
        return resp.json() if resp.status_code == 200 else []


async def get_unread_count(user_id: str) -> int:
    """Cuenta notificaciones no leídas."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{_REST_URL}/notifications?user_id=eq.{user_id}&is_read=eq.false&select=id",
            headers=_headers(),
        )
        return len(resp.json()) if resp.status_code == 200 else 0


async def mark_notification_read(notification_id: int, user_id: str) -> bool:
    """Marca una notificación como leída."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.patch(
            f"{_REST_URL}/notifications?id=eq.{notification_id}&user_id=eq.{user_id}",
            headers=_headers(),
            json={"is_read": True},
        )
        return resp.status_code in (200, 204)


async def mark_all_notifications_read(user_id: str) -> bool:
    """Marca todas las notificaciones como leídas."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.patch(
            f"{_REST_URL}/notifications?user_id=eq.{user_id}&is_read=eq.false",
            headers=_headers(),
            json={"is_read": True},
        )
        return resp.status_code in (200, 204)


# ── Perfiles ──────────────────────────────────────────────

async def get_profile(user_id: str) -> Optional[Dict]:
    """Obtiene perfil de un usuario por ID."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{_REST_URL}/profiles?id=eq.{user_id}&select=*",
            headers=_headers(),
        )
        data = resp.json()
        return data[0] if data else None


async def get_all_profiles() -> List[Dict]:
    """Obtiene todos los perfiles de usuario."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{_REST_URL}/profiles?select=*&order=created_at.asc",
            headers=_headers(),
        )
        return resp.json() if resp.status_code == 200 else []


async def notify_all_except(
    exclude_user_id: str, notif_type: str,
    from_user_id: str = None, data: Dict = None,
) -> None:
    """Envía una notificación a todos los usuarios excepto el indicado."""
    profiles = await get_all_profiles()
    async with httpx.AsyncClient(timeout=10.0) as client:
        for p in profiles:
            if p["id"] == exclude_user_id:
                continue
            body = {
                "user_id": p["id"],
                "type": notif_type,
                "data": data or {},
            }
            if from_user_id:
                body["from_user_id"] = from_user_id
            await client.post(
                f"{_REST_URL}/notifications",
                headers=_headers(),
                json=body,
            )


async def get_friend_activity(user_id: str, limit: int = 20) -> List[Dict]:
    """Obtiene actividad reciente de todos los usuarios excepto el actual."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{_REST_URL}/user_lists?user_id=neq.{user_id}&order=created_at.desc&limit={limit}&select=*",
            headers=_headers(),
        )
        if resp.status_code != 200:
            return []

        items = resp.json()

        # Enriquecer con nombres de usuario
        if items:
            user_ids = list(set(i["user_id"] for i in items))
            ids_str = ",".join(user_ids)
            profiles_resp = await client.get(
                f"{_REST_URL}/profiles?id=in.({ids_str})&select=id,username,avatar_url",
                headers=_headers(),
            )
            profiles = {}
            if profiles_resp.status_code == 200:
                profiles = {p["id"]: p for p in profiles_resp.json()}

            for item in items:
                profile = profiles.get(item["user_id"], {})
                item["username"] = profile.get("username", "???")
                item["avatar_url"] = profile.get("avatar_url")

        return items


# ── Códigos de invitación ─────────────────────────────────

def _generate_code() -> str:
    """Genera un código de invitación aleatorio."""
    chars = string.ascii_uppercase + string.digits
    random_part = "".join(secrets.choice(chars) for _ in range(6))
    return f"TXILMS-{random_part}"


async def generate_invite_codes(count: int = 5, created_by: str = None) -> List[str]:
    """Genera nuevos códigos de invitación."""
    codes = [_generate_code() for _ in range(count)]

    async with httpx.AsyncClient(timeout=10.0) as client:
        for code in codes:
            body = {"code": code}
            if created_by:
                body["created_by"] = created_by
            await client.post(
                f"{_REST_URL}/invite_codes",
                headers=_headers(),
                json=body,
            )

    return codes


async def get_available_codes() -> List[Dict]:
    """Obtiene códigos disponibles (no usados)."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{_REST_URL}/invite_codes?used_by=is.null&select=id,code,created_at&order=created_at.desc",
            headers=_headers(),
        )
        return resp.json() if resp.status_code == 200 else []


async def get_all_codes() -> List[Dict]:
    """Obtiene todos los códigos (admin)."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{_REST_URL}/invite_codes?select=*&order=created_at.desc",
            headers=_headers(),
        )
        return resp.json() if resp.status_code == 200 else []
