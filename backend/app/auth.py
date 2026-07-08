"""
Txilms Backend - Módulo de Autenticación
==========================================
Registro, login y validación de tokens usando Supabase Auth.
Los usuarios se registran con: nombre de usuario + contraseña + código de invitación.
Internamente usa email ficticio: username@txilms.app
"""

import logging
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List

import httpx
from fastapi import Request, HTTPException

from app.config import SUPABASE_URL, SUPABASE_KEY
from app.social import notify_all_except

logger = logging.getLogger("txilms.auth")

_AUTH_URL = f"{SUPABASE_URL}/auth/v1"
_REST_URL = f"{SUPABASE_URL}/rest/v1"


def _admin_headers(*, prefer: str = "") -> dict:
    """Headers con service_role key para operaciones admin."""
    h = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    if prefer:
        h["Prefer"] = prefer
    return h


def _email_for(username: str) -> str:
    """Genera email ficticio a partir del username."""
    return f"{username.lower().strip()}@txilms.app"


async def validate_invite_code(code: str) -> bool:
    """Comprueba si un código de invitación es válido y no ha sido usado."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{_REST_URL}/invite_codes?code=eq.{code}&used_by=is.null&select=id",
            headers=_admin_headers(),
        )
        data = resp.json()
        return isinstance(data, list) and len(data) > 0


async def register_user(username: str, password: str, invite_code: str) -> Dict[str, Any]:
    """
    Registra un nuevo usuario:
    1. Valida código de invitación
    2. Comprueba disponibilidad del username
    3. Crea usuario en Supabase Auth
    4. Crea perfil en tabla profiles
    5. Marca código como usado
    6. Devuelve tokens + perfil
    """
    username = username.strip()

    if len(username) < 2 or len(username) > 20:
        raise HTTPException(status_code=400, detail="El nombre debe tener entre 2 y 20 caracteres")
    if len(password) < 4:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 4 caracteres")

    # 1. Validar código
    if not await validate_invite_code(invite_code.strip()):
        raise HTTPException(status_code=400, detail="Código de invitación inválido o ya usado")

    # 2. Comprobar username
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{_REST_URL}/profiles?username=eq.{username}&select=id",
            headers=_admin_headers(),
        )
        if resp.json():
            raise HTTPException(status_code=400, detail="El nombre de usuario ya existe")

    email = _email_for(username)

    # 3. Crear usuario en Supabase Auth
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"{_AUTH_URL}/admin/users",
            headers=_admin_headers(),
            json={
                "email": email,
                "password": password,
                "email_confirm": True,
                "user_metadata": {"username": username},
            },
        )
        if resp.status_code != 200:
            logger.error(f"Error creando auth user: {resp.text}")
            raise HTTPException(status_code=500, detail="Error al crear usuario")

        user_data = resp.json()
        user_id = user_data["id"]

    # 4. Comprobar si es el primer usuario (será admin)
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{_REST_URL}/profiles?select=id&limit=1",
            headers=_admin_headers(),
        )
        is_first = len(resp.json()) == 0

    # 5. Crear perfil
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"{_REST_URL}/profiles",
            headers=_admin_headers(prefer="return=representation"),
            json={
                "id": user_id,
                "username": username,
                "is_admin": is_first,
            },
        )
        if resp.status_code not in (200, 201):
            logger.error(f"Error creando perfil: {resp.text}")
            # Rollback: borrar usuario auth
            await client.delete(
                f"{_AUTH_URL}/admin/users/{user_id}",
                headers=_admin_headers(),
            )
            raise HTTPException(status_code=500, detail="Error al crear perfil")

    # 6. Marcar código como usado
    async with httpx.AsyncClient(timeout=10.0) as client:
        await client.patch(
            f"{_REST_URL}/invite_codes?code=eq.{invite_code.strip()}&used_by=is.null",
            headers=_admin_headers(),
            json={
                "used_by": user_id,
                "used_at": datetime.now(timezone.utc).isoformat(),
            },
        )

    # 7. Notificar a todos los usuarios existentes
    await notify_all_except(
        exclude_user_id=user_id,
        notif_type="new_user",
        from_user_id=user_id,
        data={
            "username": username,
        },
    )

    # 8. Login automático
    return await login_user(username, password)


async def login_user(username: str, password: str) -> Dict[str, Any]:
    """Login con username + password. Devuelve tokens + perfil."""
    email = _email_for(username.strip())

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"{_AUTH_URL}/token?grant_type=password",
            headers={"apikey": SUPABASE_KEY, "Content-Type": "application/json"},
            json={"email": email, "password": password},
        )

        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")

        auth_data = resp.json()
        user_id = auth_data["user"]["id"]

    # Obtener perfil
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{_REST_URL}/profiles?id=eq.{user_id}&select=*",
            headers=_admin_headers(),
        )
        profiles = resp.json()
        profile = profiles[0] if profiles else None

    return {
        "access_token": auth_data["access_token"],
        "refresh_token": auth_data.get("refresh_token"),
        "user": profile,
    }


async def get_current_user(request: Request) -> Optional[Dict[str, Any]]:
    """Valida token y devuelve perfil del usuario actual. None si no está autenticado."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header.replace("Bearer ", "")

    # Validar con Supabase
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{_AUTH_URL}/user",
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {token}",
            },
        )

        if resp.status_code != 200:
            return None

        user_data = resp.json()
        user_id = user_data["id"]

    # Obtener perfil
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{_REST_URL}/profiles?id=eq.{user_id}&select=*",
            headers=_admin_headers(),
        )
        profiles = resp.json()
        return profiles[0] if profiles else None


async def refresh_session(refresh_token: str) -> Dict[str, Any]:
    """Renueva la sesión usando el refresh_token. Devuelve nuevos tokens + perfil."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"{_AUTH_URL}/token?grant_type=refresh_token",
            headers={"apikey": SUPABASE_KEY, "Content-Type": "application/json"},
            json={"refresh_token": refresh_token},
        )

        if resp.status_code != 200:
            logger.warning(f"Refresh token inválido o expirado: {resp.status_code}")
            raise HTTPException(status_code=401, detail="Sesión expirada, inicia sesión de nuevo")

        auth_data = resp.json()
        user_id = auth_data["user"]["id"]

    # Obtener perfil
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{_REST_URL}/profiles?id=eq.{user_id}&select=*",
            headers=_admin_headers(),
        )
        profiles = resp.json()
        profile = profiles[0] if profiles else None

    return {
        "access_token": auth_data["access_token"],
        "refresh_token": auth_data.get("refresh_token", refresh_token),
        "user": profile,
    }


async def require_auth(request: Request) -> Dict[str, Any]:
    """Requiere autenticación. Lanza 401 si no está autenticado."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="No autenticado")
    return user


async def require_admin(request: Request) -> Dict[str, Any]:
    """Requiere autenticación de administrador."""
    user = await require_auth(request)
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="No tienes permisos de administrador")
    return user


async def generate_reset_code(target_username: str, admin_user_id: str, hours_valid: int = 24) -> Dict[str, Any]:
    """Genera un código temporal para que un usuario pueda resetear su contraseña."""
    target_username = target_username.strip().lower()

    # Verificar que el usuario existe
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{_REST_URL}/profiles?username=eq.{target_username}&select=id,username",
            headers=_admin_headers(),
        )
        profiles = resp.json()
        if not profiles:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Generar código aleatorio de 8 caracteres (letras+números, fácil de copiar)
    code = secrets.token_hex(4).upper()  # e.g. "A3F2B1C9"

    expires_at = (datetime.now(timezone.utc) + timedelta(hours=hours_valid)).isoformat()

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"{_REST_URL}/password_reset_codes",
            headers=_admin_headers(prefer="return=representation"),
            json={
                "code": code,
                "target_user": target_username,
                "created_by": admin_user_id,
                "expires_at": expires_at,
            },
        )
        if resp.status_code not in (200, 201):
            logger.error(f"Error creando reset code: {resp.text}")
            raise HTTPException(status_code=500, detail="Error al crear código de recuperación")

    return {
        "code": code,
        "target_user": target_username,
        "expires_at": expires_at,
    }


async def get_reset_codes() -> List[Dict[str, Any]]:
    """Obtiene todos los códigos de recuperación (para admin)."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{_REST_URL}/password_reset_codes?select=*&order=created_at.desc",
            headers=_admin_headers(),
        )
        return resp.json() if resp.status_code == 200 else []


async def reset_password_with_code(username: str, code: str, new_password: str) -> Dict[str, Any]:
    """Resetea la contraseña usando un código temporal válido."""
    username = username.strip().lower()
    code = code.strip().upper()

    if len(new_password) < 4:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 4 caracteres")

    # 1. Buscar código válido (no usado, no expirado, para ese usuario)
    now_iso = datetime.now(timezone.utc).isoformat()
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{_REST_URL}/password_reset_codes"
            f"?code=eq.{code}&target_user=eq.{username}&used_at=is.null"
            f"&expires_at=gt.{now_iso}&select=id",
            headers=_admin_headers(),
        )
        codes = resp.json()
        if not codes:
            raise HTTPException(status_code=400, detail="Código inválido, expirado o ya usado")

        reset_id = codes[0]["id"]

    # 2. Buscar user_id del usuario
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{_REST_URL}/profiles?username=eq.{username}&select=id",
            headers=_admin_headers(),
        )
        profiles = resp.json()
        if not profiles:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        user_id = profiles[0]["id"]

    # 3. Cambiar contraseña via admin API
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.put(
            f"{_AUTH_URL}/admin/users/{user_id}",
            headers=_admin_headers(),
            json={"password": new_password},
        )
        if resp.status_code != 200:
            logger.error(f"Error resetting password: {resp.text}")
            raise HTTPException(status_code=500, detail="Error al cambiar la contraseña")

    # 4. Marcar código como usado
    async with httpx.AsyncClient(timeout=10.0) as client:
        await client.patch(
            f"{_REST_URL}/password_reset_codes?id=eq.{reset_id}",
            headers=_admin_headers(),
            json={"used_at": datetime.now(timezone.utc).isoformat()},
        )

    return {"ok": True, "message": "Contraseña restablecida correctamente"}


async def change_password(user_id: str, old_password: str, new_password: str, username: str) -> Dict[str, Any]:
    """Cambia la contraseña de un usuario verificando la antigua."""
    if len(new_password) < 4:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 4 caracteres")

    email = _email_for(username)

    # Verify old password by attempting login
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"{_AUTH_URL}/token?grant_type=password",
            headers={"apikey": SUPABASE_KEY, "Content-Type": "application/json"},
            json={"email": email, "password": old_password},
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Contraseña actual incorrecta")

    # Update password via admin API
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.put(
            f"{_AUTH_URL}/admin/users/{user_id}",
            headers=_admin_headers(),
            json={"password": new_password},
        )
        if resp.status_code != 200:
            logger.error(f"Error changing password: {resp.text}")
            raise HTTPException(status_code=500, detail="Error al cambiar la contraseña")

    return {"ok": True, "message": "Contraseña actualizada correctamente"}
