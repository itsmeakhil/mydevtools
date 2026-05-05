from fastapi import APIRouter

from app.api.routes.auth.api import router as auth_router
from app.api.routes.health import router as health_router
from app.api.routes.bookmarks.api import router as bookmarks_router
from app.api.routes.tasks.api import router as tasks_router
from app.api.routes.passwords.api import router as passwords_router
from app.api.routes.environment_manager.api import router as environment_manager_router
from app.api.routes.notes.api import router as notes_router
from app.api.routes.nosql.api import router as nosql_router
from app.api.routes.user_preferences.api import router as user_preferences_router
from app.api.routes.api_client.api import router as api_client_router
from app.api.routes.json_formatter.api import router as json_formatter_router
from app.api.routes.analytics.api import router as analytics_router
from app.api.routes.code_snippets.api import router as code_snippets_router
from app.api.routes.sql_client.api import router as sql_client_router
from app.api.routes.game_scores.api import router as game_scores_router
from app.api.routes.users.api import router as users_router
from app.api.routes.s3_drive.api import router as s3_drive_router
from app.api.routes.feedback.api import router as feedback_router
from app.api.routes.redis_commander.api import router as redis_commander_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(tasks_router)
api_router.include_router(bookmarks_router)
api_router.include_router(passwords_router)
api_router.include_router(environment_manager_router)
api_router.include_router(notes_router)
api_router.include_router(nosql_router)
api_router.include_router(user_preferences_router)
api_router.include_router(api_client_router)
api_router.include_router(json_formatter_router)
api_router.include_router(analytics_router)
api_router.include_router(code_snippets_router)
api_router.include_router(sql_client_router)
api_router.include_router(game_scores_router)
api_router.include_router(users_router)
api_router.include_router(s3_drive_router)
api_router.include_router(feedback_router)
api_router.include_router(redis_commander_router)
