"""
Auth dependency
---------------
Extracts and validates the Supabase JWT from the Authorization header.
Use `Depends(get_current_user)` in any router that requires authentication.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from services.supabase_client import get_supabase

bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """
    Validates the Bearer token with Supabase and returns the user dict.
    Raises 401 if the token is missing, invalid, or expired.
    """
    token = credentials.credentials
    supabase = get_supabase()

    try:
        response = supabase.auth.get_user(token)
        if response is None or response.user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token.",
            )
        return response.user
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials.",
        )
