from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

REGISTER_URL = "/auth/register"
LOGIN_URL = "/auth/login"

WORKSPACE_URL = "/workspaces/"
PROJECT_URL = "/projects/"
CONTENT_URL = "/content/"


def create_logged_in_user():
    register_data = {
        "username": "dashboarduser",
        "email": "dashboard@example.com",
        "password": "password123",
    }

    client.post(REGISTER_URL, json=register_data)

    login_response = client.post(
        LOGIN_URL,
        data={
            "username": register_data["email"],
            "password": register_data["password"],
        },
    )

    token = login_response.json()["access_token"]

    return {
        "Authorization": f"Bearer {token}"
    }


def test_dashboard_workspaces_empty():
    headers = create_logged_in_user()

    response = client.get(
        WORKSPACE_URL,
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json() == []


def test_dashboard_create_workspace():
    headers = create_logged_in_user()

    workspace = {
        "name": "Dashboard Workspace",
        "description": "Testing dashboard"
    }

    client.post(
        WORKSPACE_URL,
        json=workspace,
        headers=headers,
    )

    response = client.get(
        WORKSPACE_URL,
        headers=headers,
    )

    assert response.status_code == 200
    assert len(response.json()) >= 1


def test_dashboard_requires_auth_for_workspaces():
    response = client.get(WORKSPACE_URL)

    assert response.status_code == 401


def test_dashboard_projects_empty():
    headers = create_logged_in_user()

    response = client.get(
        PROJECT_URL,
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json() == []


def test_dashboard_create_project():
    headers = create_logged_in_user()

    workspace_response = client.post(
        WORKSPACE_URL,
        json={
            "name": "Workspace",
            "description": "Test"
        },
        headers=headers,
    )

    workspace_id = workspace_response.json()["id"]

    project = {
        "title": "Dashboard Project",
        "description": "Testing",
        "workspace_id": workspace_id,
    }

    client.post(
        PROJECT_URL,
        json=project,
        headers=headers,
    )

    response = client.get(
        PROJECT_URL,
        headers=headers,
    )

    assert response.status_code == 200
    assert len(response.json()) >= 1


def test_dashboard_requires_auth_for_projects():
    response = client.get(PROJECT_URL)

    assert response.status_code == 401


def test_dashboard_content_not_found():
    headers = create_logged_in_user()

    response = client.get(
        f"{CONTENT_URL}999999",
        headers=headers,
    )

    assert response.status_code == 404


def test_dashboard_create_content():
    headers = create_logged_in_user()

    workspace = client.post(
        WORKSPACE_URL,
        json={
            "name": "Workspace",
            "description": "Testing"
        },
        headers=headers,
    )

    workspace_id = workspace.json()["id"]

    project = client.post(
        PROJECT_URL,
        json={
            "title": "Project",
            "description": "Testing",
            "workspace_id": workspace_id,
        },
        headers=headers,
    )

    project_id = project.json()["id"]

    content = {
        "title": "NPC",
        "content_type": "npc",
        "body": "Goblin Warrior",
        "project_id": project_id,
    }

    create_response = client.post(
        CONTENT_URL,
        json=content,
        headers=headers,
    )

    assert create_response.status_code == 200

    content_id = create_response.json()["id"]

    response = client.get(
        f"{CONTENT_URL}{content_id}",
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json()["title"] == "NPC"


def test_dashboard_requires_auth_for_content():
    response = client.get(f"{CONTENT_URL}1")

    assert response.status_code == 401


def test_dashboard_content_not_owned():
    headers_one = create_logged_in_user()

    workspace = client.post(
        WORKSPACE_URL,
        json={
            "name": "Workspace",
            "description": "Testing"
        },
        headers=headers_one,
    )

    workspace_id = workspace.json()["id"]

    project = client.post(
        PROJECT_URL,
        json={
            "title": "Project",
            "description": "Testing",
            "workspace_id": workspace_id,
        },
        headers=headers_one,
    )

    project_id = project.json()["id"]

    content = client.post(
        CONTENT_URL,
        json={
            "title": "Secret",
            "content_type": "npc",
            "body": "Hidden",
            "project_id": project_id,
        },
        headers=headers_one,
    )

    content_id = content.json()["id"]

    register = {
        "username": "anotheruser",
        "email": "another@example.com",
        "password": "password123",
    }

    client.post(
        REGISTER_URL,
        json=register,
    )

    login = client.post(
        LOGIN_URL,
        data={
            "username": register["email"],
            "password": register["password"],
        },
    )

    token = login.json()["access_token"]

    headers_two = {
        "Authorization": f"Bearer {token}"
    }

    response = client.get(
        f"{CONTENT_URL}{content_id}",
        headers=headers_two,
    )

    assert response.status_code == 403