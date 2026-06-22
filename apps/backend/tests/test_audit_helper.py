from app.utils.collection_name import AUDIT_LOG


def test_audit_log_collection_name():
    assert AUDIT_LOG == "audit_log"
