from fastapi.testclient import TestClient


REGISTER_URL = "/auth/register"
LOGIN_URL = "/auth/login"
WORKSPACE_URL = "/workspaces/"

PRIMARY_USER = {
    "username": "workspaceuser",
    "email": "workspace@example.com",
    "password": "SecurePassword123!",
}

SECONDARY_USER = {
    "username": "otherworkspaceuser",
    "email": "otherworkspace@example.com",
    "password": "SecurePassword123!",
}


def register_and_login(
    client: TestClient,
    user_data: dict,
) -> dict[str, str]:
    register_response = client.post(
        REGISTER_URL,
        json=user_data,
    )

    assert register_response.status_code == 200

    login_response = client.post(
        LOGIN_URL,
        data={
            "username": user_data["email"],
            "password": user_data["password"],
        },
    )

    assert login_response.status_code == 200

    token = login_response.json()["access_token"]

    return {
        "Authorization": f"Bearer {token}",
    }


def create_workspace(
    client: TestClient,
    headers: dict[str, str],
    name: str = "Test Workspace",
    description: str | None = "Workspace used for testing",
):
    return client.post(
        WORKSPACE_URL,
        json={
            "name": name,
            "description": description,
        },
        headers=headers,
    )


def test_create_workspace_successfully(client: TestClient):
    headers = register_and_login(client, PRIMARY_USER)

    response = create_workspace(client, headers)

    assert response.status_code == 200

    response_data = response.json()

    assert response_data["name"] == "Test Workspace"
    assert response_data["description"] == "Workspace used for testing"
    assert "id" in response_data
    assert "owner_id" in response_data


def test_create_workspace_without_description(client: TestClient):
    headers = register_and_login(client, PRIMARY_USER)

    response = create_workspace(
        client,
        headers,
        name="Workspace Without Description",
        description=None,
    )

    assert response.status_code == 200

    response_data = response.json()

    assert response_data["name"] == "Workspace Without Description"
    assert response_data["description"] is None


def test_create_workspace_without_authentication(client: TestClient):
    response = client.post(
        WORKSPACE_URL,
        json={
            "name": "Unauthorized Workspace",
            "description": "Should not be created",
        },
    )

    assert response.status_code == 401


def test_get_empty_workspace_list(client: TestClient):
    headers = register_and_login(client, PRIMARY_USER)

    response = client.get(
        WORKSPACE_URL,
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json() == []


def test_get_workspace_list(client: TestClient):
    headers = register_and_login(client, PRIMARY_USER)

    create_workspace(
        client,
        headers,
        name="First Workspace",
        description="First description",
    )

    create_workspace(
        client,
        headers,
        name="Second Workspace",
        description="Second description",
    )

    response = client.get(
        WORKSPACE_URL,
        headers=headers,
    )

    assert response.status_code == 200

    response_data = response.json()

    assert len(response_data) == 2
    assert response_data[0]["name"] == "First Workspace"
    assert response_data[1]["name"] == "Second Workspace"


def test_workspace_list_only_returns_current_users_workspaces(
    client: TestClient,
):
    primary_headers = register_and_login(client, PRIMARY_USER)

    create_workspace(
        client,
        primary_headers,
        name="Primary User Workspace",
    )

    secondary_headers = register_and_login(client, SECONDARY_USER)

    create_workspace(
        client,
        secondary_headers,
        name="Secondary User Workspace",
    )

    primary_response = client.get(
        WORKSPACE_URL,
        headers=primary_headers,
    )

    secondary_response = client.get(
        WORKSPACE_URL,
        headers=secondary_headers,
    )

    assert primary_response.status_code == 200
    assert secondary_response.status_code == 200

    primary_workspaces = primary_response.json()
    secondary_workspaces = secondary_response.json()

    assert len(primary_workspaces) == 1
    assert primary_workspaces[0]["name"] == "Primary User Workspace"

    assert len(secondary_workspaces) == 1
    assert secondary_workspaces[0]["name"] == "Secondary User Workspace"


def test_get_workspace_by_id(client: TestClient):
    headers = register_and_login(client, PRIMARY_USER)

    create_response = create_workspace(client, headers)
    workspace_id = create_response.json()["id"]

    response = client.get(
        f"{WORKSPACE_URL}{workspace_id}",
        headers=headers,
    )

    assert response.status_code == 200

    response_data = response.json()

    assert response_data["id"] == workspace_id
    assert response_data["name"] == "Test Workspace"


def test_get_nonexistent_workspace_returns_404(client: TestClient):
    headers = register_and_login(client, PRIMARY_USER)

    response = client.get(
        f"{WORKSPACE_URL}999999",
        headers=headers,
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Workspace not found"


def test_user_cannot_get_another_users_workspace(client: TestClient):
    primary_headers = register_and_login(client, PRIMARY_USER)

    create_response = create_workspace(
        client,
        primary_headers,
        name="Private Workspace",
    )

    workspace_id = create_response.json()["id"]

    secondary_headers = register_and_login(client, SECONDARY_USER)

    response = client.get(
        f"{WORKSPACE_URL}{workspace_id}",
        headers=secondary_headers,
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Workspace not found"


def test_update_workspace_successfully(client: TestClient):
    headers = register_and_login(client, PRIMARY_USER)

    create_response = create_workspace(client, headers)
    workspace_id = create_response.json()["id"]

    response = client.put(
        f"{WORKSPACE_URL}{workspace_id}",
        json={
            "name": "Updated Workspace",
            "description": "Updated description",
        },
        headers=headers,
    )

    assert response.status_code == 200

    response_data = response.json()

    assert response_data["name"] == "Updated Workspace"
    assert response_data["description"] == "Updated description"


def test_partially_update_workspace(client: TestClient):
    headers = register_and_login(client, PRIMARY_USER)

    create_response = create_workspace(
        client,
        headers,
        name="Original Workspace",
        description="Original description",
    )

    workspace_id = create_response.json()["id"]

    response = client.put(
        f"{WORKSPACE_URL}{workspace_id}",
        json={
            "name": "Renamed Workspace",
        },
        headers=headers,
    )

    assert response.status_code == 200

    response_data = response.json()

    assert response_data["name"] == "Renamed Workspace"
    assert response_data["description"] == "Original description"


def test_user_cannot_update_another_users_workspace(
    client: TestClient,
):
    primary_headers = register_and_login(client, PRIMARY_USER)

    create_response = create_workspace(
        client,
        primary_headers,
        name="Primary Workspace",
    )

    workspace_id = create_response.json()["id"]

    secondary_headers = register_and_login(client, SECONDARY_USER)

    response = client.put(
        f"{WORKSPACE_URL}{workspace_id}",
        json={
            "name": "Unauthorized Update",
        },
        headers=secondary_headers,
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Workspace not found"


def test_update_nonexistent_workspace_returns_404(client: TestClient):
    headers = register_and_login(client, PRIMARY_USER)

    response = client.put(
        f"{WORKSPACE_URL}999999",
        json={
            "name": "Missing Workspace",
        },
        headers=headers,
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Workspace not found"


def test_delete_workspace_successfully(client: TestClient):
    headers = register_and_login(client, PRIMARY_USER)

    create_response = create_workspace(client, headers)
    workspace_id = create_response.json()["id"]

    delete_response = client.delete(
        f"{WORKSPACE_URL}{workspace_id}",
        headers=headers,
    )

    assert delete_response.status_code == 200
    assert delete_response.json() == {
        "message": "Workspace deleted successfully",
    }

    get_response = client.get(
        f"{WORKSPACE_URL}{workspace_id}",
        headers=headers,
    )

    assert get_response.status_code == 404


def test_user_cannot_delete_another_users_workspace(
    client: TestClient,
):
    primary_headers = register_and_login(client, PRIMARY_USER)

    create_response = create_workspace(
        client,
        primary_headers,
        name="Protected Workspace",
    )

    workspace_id = create_response.json()["id"]

    secondary_headers = register_and_login(client, SECONDARY_USER)

    response = client.delete(
        f"{WORKSPACE_URL}{workspace_id}",
        headers=secondary_headers,
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Workspace not found"


def test_delete_nonexistent_workspace_returns_404(client: TestClient):
    headers = register_and_login(client, PRIMARY_USER)

    response = client.delete(
        f"{WORKSPACE_URL}999999",
        headers=headers,
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Workspace not found"


def test_workspace_routes_require_authentication(client: TestClient):
    list_response = client.get(WORKSPACE_URL)
    get_response = client.get(f"{WORKSPACE_URL}1")
    update_response = client.put(
        f"{WORKSPACE_URL}1",
        json={"name": "Unauthorized"},
    )
    delete_response = client.delete(f"{WORKSPACE_URL}1")

    assert list_response.status_code == 401
    assert get_response.status_code == 401
    assert update_response.status_code == 401
    assert delete_response.status_code == 401