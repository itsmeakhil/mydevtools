from fastapi import APIRouter, Depends

from app.api.routes.auth.services import get_current_uid
from app.api.routes.user_preferences.schema import UserPreferencesOut, UserPreferencesUpdate
from app.api.routes.user_preferences import services as pref_svc


router = APIRouter(prefix="/user-preferences", tags=["user-preferences"])


@router.get("", response_model=UserPreferencesOut, summary="Get user preferences")
def get_prefs(uid: str = Depends(get_current_uid)) -> UserPreferencesOut:
    return pref_svc.get_preferences(uid)


@router.patch("", response_model=UserPreferencesOut, summary="Update user preferences (partial)")
def patch_prefs(body: UserPreferencesUpdate, uid: str = Depends(get_current_uid)) -> UserPreferencesOut:
    return pref_svc.patch_preferences(uid, body)

