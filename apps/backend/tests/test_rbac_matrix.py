from app.api.routes.workspaces.rbac import TOOL_PERMISSIONS, ENCRYPTED_TOOLS


def test_admin_has_all_permissions_on_every_tool():
    for tool, by_role in TOOL_PERMISSIONS.items():
        if tool not in ENCRYPTED_TOOLS:
            assert by_role["admin"] >= {"read", "write", "delete", "admin"}, tool


def test_viewer_can_only_read_plaintext_tools():
    for tool, by_role in TOOL_PERMISSIONS.items():
        if tool in ENCRYPTED_TOOLS:
            assert by_role["viewer"] == set()
            continue
        assert by_role["viewer"] == {"read"}


def test_developer_cannot_admin_plaintext_tools():
    for tool, by_role in TOOL_PERMISSIONS.items():
        if tool in ENCRYPTED_TOOLS:
            assert by_role["developer"] == set()
            continue
        assert "admin" not in by_role["developer"]
        assert by_role["developer"] >= {"read", "write", "delete"}


def test_encrypted_tools_are_gated_for_all_shared_roles():
    for tool in ENCRYPTED_TOOLS:
        for role in ("admin", "developer", "viewer"):
            assert TOOL_PERMISSIONS[tool][role] == set()
