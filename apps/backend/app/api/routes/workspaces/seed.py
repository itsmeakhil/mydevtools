from app.api.routes.workspaces.repo import upsert_org

SYSTEM_ORG_NAME = "MyDevTools Cloud"
SYSTEM_ORG_SLUG = "mydevtools-cloud"


async def ensure_system_org() -> str:
    """Idempotently create the system org. Returns its id."""
    return await upsert_org(
        name=SYSTEM_ORG_NAME,
        slug=SYSTEM_ORG_SLUG,
        kind="system",
        owner_uid=None,
    )
