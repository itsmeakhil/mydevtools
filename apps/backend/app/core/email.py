import asyncio
import logging
from urllib.parse import urlencode

from app.core.config import get_settings

log = logging.getLogger(__name__)


def _build_invite_url(token: str) -> str:
    settings = get_settings()
    qs = urlencode({"invite": token})
    return f"{settings.APP_PUBLIC_URL.rstrip('/')}/login?{qs}"


def _render_html(*, inviter_name: str, org_name: str, workspace_name: str | None, invite_url: str) -> str:
    target = f"{org_name} / {workspace_name}" if workspace_name else org_name
    return f"""
    <p>Hi,</p>
    <p>{inviter_name} invited you to join <strong>{target}</strong> on MyDevTools.</p>
    <p><a href="{invite_url}">Accept invitation</a></p>
    <p>This link is valid for 14 days.</p>
    """


async def send_invitation_email(
    *,
    to: str,
    token: str,
    inviter_name: str,
    org_name: str,
    workspace_name: str | None,
) -> None:
    invite_url = _build_invite_url(token)
    settings = get_settings()
    if not settings.RESEND_API_KEY:
        log.info(
            "DEV email: would send to=%s token=%s url=%s org=%s workspace=%s",
            to, token, invite_url, org_name, workspace_name,
        )
        return

    import resend

    resend.api_key = settings.RESEND_API_KEY
    html = _render_html(
        inviter_name=inviter_name,
        org_name=org_name,
        workspace_name=workspace_name,
        invite_url=invite_url,
    )
    target = f"{org_name}" + (f" / {workspace_name}" if workspace_name else "")

    # resend.Emails.send is sync, so wrap it with asyncio.to_thread
    await asyncio.to_thread(
        resend.Emails.send,
        {
            "from": settings.INVITATION_FROM_EMAIL,
            "to": [to],
            "subject": f"You're invited to {target} on MyDevTools",
            "html": html,
        },
    )
