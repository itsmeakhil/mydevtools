import logging
import pytest
from app.core.email import send_invitation_email


@pytest.mark.asyncio
async def test_dev_mode_logs_when_key_missing(monkeypatch, caplog):
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    caplog.set_level(logging.INFO)
    await send_invitation_email(
        to="alice@example.com",
        token="tok-1",
        inviter_name="Bob",
        org_name="Acme",
        workspace_name="Prod",
    )
    assert any("alice@example.com" in r.message for r in caplog.records)
    assert any("tok-1" in r.message for r in caplog.records)
