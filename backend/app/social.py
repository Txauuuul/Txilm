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


# ── Logros y badges ───────────────────────────────────────

async def get_user_achievements(user_id: str) -> Dict:
    """Calcula los logros/badges de un usuario basándose en su actividad."""
    lists = await get_user_lists(user_id)
    following = await get_following(user_id)

    watched = [i for i in lists if i["list_type"] == "watched"]
    favorites = [i for i in lists if i["list_type"] == "favorite"]
    ratings = [i["rating"] for i in watched if i.get("rating")]
    reviews = [i for i in watched if i.get("review")]
    avg_rating = sum(ratings) / len(ratings) if ratings else 0

    # Genre diversity
    genre_set = set()
    for item in watched:
        gids = item.get("genre_ids") or ""
        for gid in gids.split(","):
            gid = gid.strip()
            if gid:
                genre_set.add(gid)

    # Streak calculation
    from datetime import datetime, timezone, timedelta
    watch_dates = set()
    daily_counts = {}
    for item in watched:
        try:
            dt = datetime.fromisoformat(item["created_at"].replace("Z", "+00:00"))
            d = dt.date()
            watch_dates.add(d)
            daily_counts[d] = daily_counts.get(d, 0) + 1
        except:
            pass

    max_streak = 0
    if watch_dates:
        sorted_dates = sorted(watch_dates)
        streak = 1
        for i in range(1, len(sorted_dates)):
            if (sorted_dates[i] - sorted_dates[i-1]).days == 1:
                streak += 1
                max_streak = max(max_streak, streak)
            else:
                streak = 1
        max_streak = max(max_streak, streak)

    max_daily = max(daily_counts.values()) if daily_counts else 0

    # Genre distribution check
    genre_counts = {}
    for item in watched:
        gids = item.get("genre_ids") or ""
        for gid in gids.split(","):
            gid = gid.strip()
            if gid:
                genre_counts[gid] = genre_counts.get(gid, 0) + 1
    is_diversified = True
    if genre_counts and len(watched) > 10:
        max_pct = max(genre_counts.values()) / len(watched)
        is_diversified = max_pct <= 0.30

    all_achievements = [
        {"id": "primera_peli", "emoji": "🎥", "name": "Primera película", "desc": "Ver tu primera película", "req": len(watched) >= 1},
        {"id": "cinefilo_10", "emoji": "🎬", "name": "Cinéfilo novato", "desc": "Ver 10 películas", "req": len(watched) >= 10},
        {"id": "cinefilo_50", "emoji": "🎬", "name": "Cinéfilo avanzado", "desc": "Ver 50 películas", "req": len(watched) >= 50},
        {"id": "cinefilo_100", "emoji": "🎬", "name": "Cinéfilo experto", "desc": "Ver 100 películas", "req": len(watched) >= 100},
        {"id": "cinefilo_250", "emoji": "🎬", "name": "Cinéfilo legendario", "desc": "Ver 250 películas", "req": len(watched) >= 250},
        {"id": "critico_exigente", "emoji": "⭐", "name": "Crítico exigente", "desc": "Media de rating menor a 5", "req": len(ratings) >= 10 and avg_rating < 5},
        {"id": "generoso", "emoji": "⭐", "name": "Generoso con las estrellas", "desc": "Media de rating mayor a 8", "req": len(ratings) >= 10 and avg_rating > 8},
        {"id": "racha_3", "emoji": "🔥", "name": "En racha", "desc": "Racha de 3 días seguidos", "req": max_streak >= 3},
        {"id": "racha_7", "emoji": "🔥", "name": "Semana cinéfila", "desc": "Racha de 7 días seguidos", "req": max_streak >= 7},
        {"id": "racha_30", "emoji": "🔥", "name": "Mes imparable", "desc": "Racha de 30 días seguidos", "req": max_streak >= 30},
        {"id": "explorador", "emoji": "🎭", "name": "Explorador de géneros", "desc": "Ver películas de 8+ géneros", "req": len(genre_set) >= 8},
        {"id": "primera_resena", "emoji": "✏️", "name": "Primera reseña", "desc": "Escribir tu primera reseña", "req": len(reviews) >= 1},
        {"id": "critico_literario", "emoji": "📝", "name": "Crítico literario", "desc": "Escribir 10+ reseñas", "req": len(reviews) >= 10},
        {"id": "primer_fav", "emoji": "💕", "name": "Primera favorita", "desc": "Añadir tu primera favorita", "req": len(favorites) >= 1},
        {"id": "coleccionista", "emoji": "❤️", "name": "Coleccionista", "desc": "Tener 20+ favoritas", "req": len(favorites) >= 20},
        {"id": "social", "emoji": "👥", "name": "Social", "desc": "Seguir a 5+ usuarios", "req": len(following) >= 5},
        {"id": "maratonista", "emoji": "🌙", "name": "Maratonista", "desc": "Ver 3+ películas en un día", "req": max_daily >= 3},
        {"id": "diversificado", "emoji": "📊", "name": "Diversificado", "desc": "Ningún género supera el 30%", "req": is_diversified and len(watched) > 10},
    ]

    unlocked = [a for a in all_achievements if a["req"]]
    locked = [a for a in all_achievements if not a["req"]]
    for a in unlocked + locked:
        del a["req"]

    return {
        "unlocked": unlocked,
        "locked": locked,
        "total": len(all_achievements),
        "unlocked_count": len(unlocked),
    }


# ── Estadísticas Wrapped (anuales) ───────────────────────

async def get_wrapped_stats(user_id: str, year: int) -> Dict:
    """Genera estadísticas anuales tipo Spotify Wrapped."""
    lists = await get_user_lists(user_id)
    from datetime import datetime, timedelta

    genre_map = {
        "28": "Acción", "16": "Animación", "12": "Aventura", "35": "Comedia",
        "80": "Crimen", "99": "Documental", "18": "Drama", "14": "Fantasía",
        "27": "Terror", "10749": "Romance", "878": "Sci-Fi", "53": "Suspense",
        "10751": "Familia", "36": "Historia", "10402": "Música", "9648": "Misterio",
        "10752": "Bélica", "37": "Western", "10770": "TV Movie",
    }

    year_watched = []
    for item in lists:
        if item["list_type"] != "watched":
            continue
        try:
            dt = datetime.fromisoformat(item["created_at"].replace("Z", "+00:00"))
            if dt.year == year:
                year_watched.append(item)
        except:
            pass

    if not year_watched:
        return {"year": year, "total_movies": 0, "empty": True}

    ratings = [i["rating"] for i in year_watched if i.get("rating")]
    avg_rating = round(sum(ratings) / len(ratings), 1) if ratings else None

    rated_movies = sorted([i for i in year_watched if i.get("rating")], key=lambda x: x["rating"], reverse=True)
    best_movie = rated_movies[0] if rated_movies else None
    worst_movie = rated_movies[-1] if len(rated_movies) > 1 else None

    monthly = {}
    for item in year_watched:
        try:
            dt = datetime.fromisoformat(item["created_at"].replace("Z", "+00:00"))
            monthly[dt.month] = monthly.get(dt.month, 0) + 1
        except:
            pass

    month_names = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
    monthly_data = [{"month": month_names[i], "count": monthly.get(i + 1, 0)} for i in range(12)]
    busiest_month = max(monthly.items(), key=lambda x: x[1]) if monthly else (1, 0)

    genre_counts = {}
    for item in year_watched:
        gids = item.get("genre_ids") or ""
        for gid in gids.split(","):
            gid = gid.strip()
            if gid and gid in genre_map:
                genre_counts[genre_map[gid]] = genre_counts.get(genre_map[gid], 0) + 1

    top_genres = sorted(genre_counts.items(), key=lambda x: -x[1])[:5]
    top_genre = top_genres[0][0] if top_genres else "N/A"

    reviews_count = len([i for i in year_watched if i.get("review")])
    estimated_hours = len(year_watched) * 2

    watch_dates = set()
    for item in year_watched:
        try:
            dt = datetime.fromisoformat(item["created_at"].replace("Z", "+00:00"))
            watch_dates.add(dt.date())
        except:
            pass

    max_streak = 0
    if watch_dates:
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
        "year": year,
        "empty": False,
        "total_movies": len(year_watched),
        "estimated_hours": estimated_hours,
        "avg_rating": avg_rating,
        "total_ratings": len(ratings),
        "total_reviews": reviews_count,
        "top_genre": top_genre,
        "top_genres": [{"genre": g, "count": c} for g, c in top_genres],
        "busiest_month": month_names[busiest_month[0] - 1],
        "busiest_month_count": busiest_month[1],
        "monthly_data": monthly_data,
        "best_movie": {"title": best_movie.get("movie_title", ""), "poster": best_movie.get("movie_poster"), "rating": best_movie.get("rating"), "tmdb_id": best_movie.get("tmdb_id")} if best_movie else None,
        "worst_movie": {"title": worst_movie.get("movie_title", ""), "poster": worst_movie.get("movie_poster"), "rating": worst_movie.get("rating"), "tmdb_id": worst_movie.get("tmdb_id")} if worst_movie else None,
        "max_streak": max_streak,
    }


# ── Predicción de rating ──────────────────────────────────

async def predict_rating(user_id: str, tmdb_id: int) -> Dict:
    """
    Predice nota usando collaborative filtering simple:
    busca usuarios similares que hayan visto esta película.
    """
    my_lists = await get_user_lists(user_id)
    my_watched = {i["tmdb_id"]: i.get("rating") for i in my_lists if i["list_type"] == "watched" and i.get("rating")}

    if not my_watched:
        return {"predicted_rating": None, "confidence": 0, "based_on": 0}

    if tmdb_id in my_watched:
        return {"predicted_rating": my_watched[tmdb_id], "confidence": 100, "based_on": 0, "already_rated": True}

    movie_ratings = await get_movie_ratings(tmdb_id)
    if not movie_ratings:
        return {"predicted_rating": None, "confidence": 0, "based_on": 0}

    weighted_sum = 0
    weight_total = 0

    for mr in movie_ratings:
        other_id = mr["user_id"]
        other_rating = mr.get("rating")
        if not other_rating or other_id == user_id:
            continue

        other_lists = await get_user_lists(other_id)
        other_watched = {i["tmdb_id"]: i.get("rating") for i in other_lists if i["list_type"] == "watched" and i.get("rating")}

        common = set(my_watched.keys()) & set(other_watched.keys())
        if len(common) < 2:
            continue

        total_diff = sum(abs(my_watched[tid] - other_watched[tid]) for tid in common)
        avg_diff = total_diff / len(common)
        similarity = max(0, 1 - avg_diff / 10)
        weight = similarity * min(len(common), 20) / 20
        weighted_sum += other_rating * weight
        weight_total += weight

    if weight_total == 0:
        all_r = [mr.get("rating") for mr in movie_ratings if mr.get("rating")]
        if all_r:
            return {"predicted_rating": round(sum(all_r) / len(all_r), 1), "confidence": 20, "based_on": len(all_r)}
        return {"predicted_rating": None, "confidence": 0, "based_on": 0}

    return {
        "predicted_rating": round(weighted_sum / weight_total, 1),
        "confidence": min(90, int(weight_total * 30)),
        "based_on": len([mr for mr in movie_ratings if mr["user_id"] != user_id]),
    }


# ── Feed de actividad (solo seguidos) ────────────────────

async def get_following_feed(user_id: str, limit: int = 30) -> List[Dict]:
    """Obtiene actividad reciente de los usuarios que sigo."""
    following_ids = await get_following(user_id)
    if not following_ids:
        return []

    ids_filter = ",".join(f'"{uid}"' for uid in following_ids)

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{_REST_URL}/user_lists?user_id=in.({ids_filter})"
            f"&order=created_at.desc&limit={limit}&select=*",
            headers=_headers(),
        )
        if resp.status_code != 200:
            return []

        items = resp.json()
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


# ── Listas colaborativas ─────────────────────────────────

async def toggle_collaborative(list_id: int, user_id: str, is_collaborative: bool) -> Dict:
    """Activa o desactiva modo colaborativo en una lista."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.patch(
            f"{_REST_URL}/custom_lists?id=eq.{list_id}&user_id=eq.{user_id}",
            headers=_headers(prefer="return=representation"),
            json={"is_collaborative": is_collaborative},
        )
        data = resp.json()
        return data[0] if isinstance(data, list) and data else {}


async def add_collaborative_editor(list_id: int, editor_user_id: str) -> Dict:
    """Añade un editor a una lista colaborativa."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"{_REST_URL}/collaborative_list_editors",
            headers=_headers(prefer="return=representation"),
            json={"list_id": list_id, "user_id": editor_user_id},
        )
        if resp.status_code in (200, 201):
            d = resp.json()
            return d[0] if isinstance(d, list) else d
        return {}


async def remove_collaborative_editor(list_id: int, editor_user_id: str) -> bool:
    """Elimina un editor de una lista colaborativa."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.delete(
            f"{_REST_URL}/collaborative_list_editors?list_id=eq.{list_id}&user_id=eq.{editor_user_id}",
            headers=_headers(),
        )
        return resp.status_code in (200, 204)


async def get_collaborative_editors(list_id: int) -> List[Dict]:
    """Obtiene los editores de una lista colaborativa."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{_REST_URL}/collaborative_list_editors?list_id=eq.{list_id}&select=user_id,added_at",
            headers=_headers(),
        )
        if resp.status_code != 200:
            return []
        editors = resp.json()
        if editors:
            user_ids = [e["user_id"] for e in editors]
            ids_str = ",".join(user_ids)
            profiles_resp = await client.get(
                f"{_REST_URL}/profiles?id=in.({ids_str})&select=id,username",
                headers=_headers(),
            )
            profiles = {}
            if profiles_resp.status_code == 200:
                profiles = {p["id"]: p for p in profiles_resp.json()}
            for e in editors:
                e["username"] = profiles.get(e["user_id"], {}).get("username", "???")
        return editors


async def get_collaborative_lists_for_user(user_id: str) -> List[Dict]:
    """Obtiene listas colaborativas donde el usuario es editor."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{_REST_URL}/collaborative_list_editors?user_id=eq.{user_id}&select=list_id",
            headers=_headers(),
        )
        if resp.status_code != 200:
            return []
        list_ids = [e["list_id"] for e in resp.json()]
        if not list_ids:
            return []

        ids_str = ",".join(str(lid) for lid in list_ids)
        resp2 = await client.get(
            f"{_REST_URL}/custom_lists?id=in.({ids_str})&select=*&order=created_at.desc",
            headers=_headers(),
        )
        if resp2.status_code != 200:
            return []

        lists = resp2.json()
        if lists:
            owner_ids = list(set(l["user_id"] for l in lists))
            ids_str2 = ",".join(owner_ids)
            profiles_resp = await client.get(
                f"{_REST_URL}/profiles?id=in.({ids_str2})&select=id,username",
                headers=_headers(),
            )
            profiles = {}
            if profiles_resp.status_code == 200:
                profiles = {p["id"]: p for p in profiles_resp.json()}
            for l in lists:
                l["owner_username"] = profiles.get(l["user_id"], {}).get("username", "???")
        return lists