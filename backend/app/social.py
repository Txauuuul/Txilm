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
    review: str = None, genre_ids: str = None,
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
    if review is not None and list_type == "watched":
        body["review"] = review
    if genre_ids:
        body["genre_ids"] = genre_ids

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


async def update_rating(user_id: str, tmdb_id: int, rating: int, review: str = None) -> Dict:
    """Actualiza la puntuación y/o reseña de una película vista."""
    body = {"rating": rating}
    if review is not None:
        body["review"] = review
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.patch(
            f"{_REST_URL}/user_lists?user_id=eq.{user_id}&tmdb_id=eq.{tmdb_id}&list_type=eq.watched",
            headers=_headers(prefer="return=representation"),
            json=body,
        )
        data = resp.json()
        return data[0] if isinstance(data, list) and data else {}


async def get_movie_ratings(tmdb_id: int) -> List[Dict]:
    """Obtiene todas las puntuaciones de usuarios para una película."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{_REST_URL}/user_lists?tmdb_id=eq.{tmdb_id}&list_type=eq.watched&rating=not.is.null&select=user_id,rating,review,created_at",
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


# ── Sistema de seguimiento (follows) ─────────────────────

async def follow_user(follower_id: str, following_id: str) -> Dict:
    """Seguir a un usuario."""
    if follower_id == following_id:
        return {"error": "No puedes seguirte a ti mismo"}

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"{_REST_URL}/follows",
            headers=_headers(prefer="return=representation"),
            json={"follower_id": follower_id, "following_id": following_id},
        )
        if resp.status_code in (200, 201):
            d = resp.json()
            return d[0] if isinstance(d, list) else d
        return {}


async def unfollow_user(follower_id: str, following_id: str) -> bool:
    """Dejar de seguir a un usuario."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.delete(
            f"{_REST_URL}/follows?follower_id=eq.{follower_id}&following_id=eq.{following_id}",
            headers=_headers(),
        )
        return resp.status_code in (200, 204)


async def get_following(user_id: str) -> List[str]:
    """IDs de usuarios que sigo."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{_REST_URL}/follows?follower_id=eq.{user_id}&select=following_id",
            headers=_headers(),
        )
        if resp.status_code == 200:
            return [r["following_id"] for r in resp.json()]
        return []


async def get_followers(user_id: str) -> List[str]:
    """IDs de usuarios que me siguen."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{_REST_URL}/follows?following_id=eq.{user_id}&select=follower_id",
            headers=_headers(),
        )
        if resp.status_code == 200:
            return [r["follower_id"] for r in resp.json()]
        return []


async def get_follow_counts(user_id: str) -> Dict:
    """Obtiene contadores de seguidores y seguidos."""
    following = await get_following(user_id)
    followers = await get_followers(user_id)
    return {"following": len(following), "followers": len(followers)}


# ── Listas personalizadas ────────────────────────────────

async def get_custom_lists(user_id: str) -> List[Dict]:
    """Obtiene las listas personalizadas de un usuario."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{_REST_URL}/custom_lists?user_id=eq.{user_id}&select=*&order=created_at.desc",
            headers=_headers(),
        )
        return resp.json() if resp.status_code == 200 else []


async def create_custom_list(user_id: str, name: str, description: str = None) -> Dict:
    """Crea una nueva lista personalizada."""
    body = {"user_id": user_id, "name": name}
    if description:
        body["description"] = description

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"{_REST_URL}/custom_lists",
            headers=_headers(prefer="return=representation"),
            json=body,
        )
        if resp.status_code in (200, 201):
            d = resp.json()
            return d[0] if isinstance(d, list) else d
        return {}


async def delete_custom_list(list_id: int, user_id: str) -> bool:
    """Elimina una lista personalizada y sus items."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        # Delete items first
        await client.delete(
            f"{_REST_URL}/custom_list_items?list_id=eq.{list_id}",
            headers=_headers(),
        )
        # Delete list
        resp = await client.delete(
            f"{_REST_URL}/custom_lists?id=eq.{list_id}&user_id=eq.{user_id}",
            headers=_headers(),
        )
        return resp.status_code in (200, 204)


async def get_custom_list_items(list_id: int) -> List[Dict]:
    """Obtiene los items de una lista personalizada."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{_REST_URL}/custom_list_items?list_id=eq.{list_id}&select=*&order=created_at.desc",
            headers=_headers(),
        )
        return resp.json() if resp.status_code == 200 else []


async def add_to_custom_list(
    list_id: int, tmdb_id: int, movie_title: str,
    movie_poster: str = None, movie_year: str = None,
) -> Dict:
    """Añade una película a una lista personalizada."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"{_REST_URL}/custom_list_items",
            headers=_headers(prefer="return=representation"),
            json={
                "list_id": list_id,
                "tmdb_id": tmdb_id,
                "movie_title": movie_title,
                "movie_poster": movie_poster,
                "movie_year": movie_year,
            },
        )
        if resp.status_code in (200, 201):
            d = resp.json()
            return d[0] if isinstance(d, list) else d
        return {}


async def remove_from_custom_list(list_id: int, tmdb_id: int) -> bool:
    """Elimina una película de una lista personalizada."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.delete(
            f"{_REST_URL}/custom_list_items?list_id=eq.{list_id}&tmdb_id=eq.{tmdb_id}",
            headers=_headers(),
        )
        return resp.status_code in (200, 204)


# ── Estadísticas de perfil ────────────────────────────────

async def get_user_stats(user_id: str) -> Dict:
    """Calcula estadísticas del perfil de un usuario."""
    lists = await get_user_lists(user_id)

    watched = [i for i in lists if i["list_type"] == "watched"]
    favorites = [i for i in lists if i["list_type"] == "favorite"]
    watchlist_items = [i for i in lists if i["list_type"] == "watchlist"]

    ratings = [i["rating"] for i in watched if i.get("rating")]
    avg_rating = round(sum(ratings) / len(ratings), 1) if ratings else None

    # Movies per month (last 6 months)
    from datetime import datetime, timezone, timedelta
    now = datetime.now(timezone.utc)
    monthly = {}
    for item in watched:
        try:
            dt = datetime.fromisoformat(item["created_at"].replace("Z", "+00:00"))
            key = dt.strftime("%Y-%m")
            monthly[key] = monthly.get(key, 0) + 1
        except:
            pass

    # Last 6 months
    months_data = []
    for i in range(5, -1, -1):
        d = now - timedelta(days=30 * i)
        key = d.strftime("%Y-%m")
        label = d.strftime("%b")
        months_data.append({"month": label, "count": monthly.get(key, 0)})

    # Rating distribution
    rating_dist = {str(i): 0 for i in range(1, 11)}
    for r in ratings:
        key = str(int(r)) if isinstance(r, (int, float)) else str(r)
        rating_dist[key] = rating_dist.get(key, 0) + 1

    # Genre breakdown from genre_ids field
    genre_map = {
        "28": "Acción", "16": "Animación", "12": "Aventura", "35": "Comedia",
        "80": "Crimen", "99": "Documental", "18": "Drama", "14": "Fantasía",
        "27": "Terror", "10749": "Romance", "878": "Sci-Fi", "53": "Suspense",
        "10751": "Familia", "36": "Historia", "10402": "Música", "9648": "Misterio",
        "10752": "Bélica", "37": "Western", "10770": "TV Movie",
    }
    genre_counts = {}
    for item in watched:
        gids = item.get("genre_ids") or ""
        for gid in gids.split(","):
            gid = gid.strip()
            if gid and gid in genre_map:
                name = genre_map[gid]
                genre_counts[name] = genre_counts.get(name, 0) + 1
    # Sort by count descending
    top_genres = sorted(genre_counts.items(), key=lambda x: -x[1])[:8]

    # Watch streak (consecutive days with movies watched)
    watch_dates = set()
    for item in watched:
        try:
            dt = datetime.fromisoformat(item["created_at"].replace("Z", "+00:00"))
            watch_dates.add(dt.date())
        except:
            pass
    current_streak = 0
    max_streak = 0
    if watch_dates:
        d = now.date()
        streak = 0
        while d in watch_dates:
            streak += 1
            d -= timedelta(days=1)
        current_streak = streak
        # Also compute max streak
        sorted_dates = sorted(watch_dates)
        streak = 1
        for i in range(1, len(sorted_dates)):
            if (sorted_dates[i] - sorted_dates[i-1]).days == 1:
                streak += 1
                max_streak = max(max_streak, streak)
            else:
                streak = 1
        max_streak = max(max_streak, streak)

    return {
        "total_watched": len(watched),
        "total_favorites": len(favorites),
        "total_watchlist": len(watchlist_items),
        "total_rated": len(ratings),
        "avg_rating": avg_rating,
        "monthly_watched": months_data,
        "rating_distribution": rating_dist,
        "top_genres": [{"genre": g, "count": c} for g, c in top_genres],
        "current_streak": current_streak,
        "max_streak": max_streak,
    }


async def compare_users(user_id_a: str, user_id_b: str) -> Dict:
    """Compara las puntuaciones de dos usuarios en películas que ambos han visto."""
    lists_a = await get_user_lists(user_id_a)
    lists_b = await get_user_lists(user_id_b)

    watched_a = {i["tmdb_id"]: i for i in lists_a if i["list_type"] == "watched" and i.get("rating")}
    watched_b = {i["tmdb_id"]: i for i in lists_b if i["list_type"] == "watched" and i.get("rating")}

    common_ids = set(watched_a.keys()) & set(watched_b.keys())
    common = []
    total_diff = 0
    agreements = 0

    for tmdb_id in common_ids:
        a = watched_a[tmdb_id]
        b = watched_b[tmdb_id]
        diff = abs((a.get("rating") or 0) - (b.get("rating") or 0))
        total_diff += diff
        if diff <= 1:
            agreements += 1
        common.append({
            "tmdb_id": tmdb_id,
            "movie_title": a.get("movie_title", ""),
            "movie_poster": a.get("movie_poster"),
            "movie_year": a.get("movie_year"),
            "rating_a": a.get("rating"),
            "rating_b": b.get("rating"),
            "review_a": a.get("review"),
            "review_b": b.get("review"),
            "diff": diff,
        })

    # Sort by biggest disagreement first
    common.sort(key=lambda x: -x["diff"])

    compatibility = round((agreements / len(common)) * 100) if common else 0
    avg_diff = round(total_diff / len(common), 1) if common else 0

    # Unique to each user
    only_a = len(set(watched_a.keys()) - set(watched_b.keys()))
    only_b = len(set(watched_b.keys()) - set(watched_a.keys()))

    return {
        "common_count": len(common),
        "compatibility": compatibility,
        "avg_diff": avg_diff,
        "common_movies": common[:20],  # limit to 20
        "only_a": only_a,
        "only_b": only_b,
    }


async def get_recent_reviews(limit: int = 20) -> List[Dict]:
    """Obtiene las reseñas más recientes de todos los usuarios."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{_REST_URL}/user_lists?list_type=eq.watched&review=not.is.null"
            f"&review=neq.&select=user_id,tmdb_id,movie_title,movie_poster,movie_year,rating,review,created_at"
            f"&order=created_at.desc&limit={limit}",
            headers=_headers(),
        )
        if resp.status_code != 200:
            return []

        items = resp.json()

        # Enrich with usernames
        if items:
            user_ids = list(set(i["user_id"] for i in items))
            ids_str = ",".join(user_ids)
            profiles_resp = await client.get(
                f"{_REST_URL}/profiles?id=in.({ids_str})&select=id,username",
                headers=_headers(),
            )
            profiles = {}
            if profiles_resp.status_code == 200:
                profiles = {p["id"]: p for p in profiles_resp.json()}

            for item in items:
                profile = profiles.get(item["user_id"], {})
                item["username"] = profile.get("username", "???")

        return items
