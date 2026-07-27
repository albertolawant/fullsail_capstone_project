from fastapi.testclient import TestClient

from app.api.auth import (
    create_access_token,
    hash_password,
    verify_password,
)


REGISTER_URL = "/auth/register"
LOGIN_URL = "/auth/login"
CURRENT_USER_URL = "/auth/me"
LOGOUT_URL = "/auth/logout"

TEST_USER = {
    "username": "testuser",
    "email": "testuser@example.com",
    "password": "SecurePassword123!",
}


def register_test_user(client: TestClient, user_data: dict | None = None):
    payload = user_data or TEST_USER

    return client.post(
        REGISTER_URL,
        json=payload,
    )


def login_test_user(
    client: TestClient,
    email: str = TEST_USER["email"],
    password: str = TEST_USER["password"],
):
    return client.post(
        LOGIN_URL,
        data={
            "username": email,
            "password": password,
        },
    )


def test_hash_password_creates_different_value():
    plain_password = "SecurePassword123!"

    hashed_password = hash_password(plain_password)

    assert hashed_password != plain_password
    assert isinstance(hashed_password, str)
    assert len(hashed_password) > 0


def test_verify_password_accepts_correct_password():
    plain_password = "SecurePassword123!"
    hashed_password = hash_password(plain_password)

    assert verify_password(plain_password, hashed_password) is True


def test_verify_password_rejects_incorrect_password():
    hashed_password = hash_password("CorrectPassword123!")

    assert verify_password("WrongPassword123!", hashed_password) is False


def test_create_access_token_returns_token():
    token = create_access_token(
        data={"sub": TEST_USER["email"]}
    )

    assert isinstance(token, str)
    assert len(token) > 0


def test_register_user_successfully(client: TestClient):
    response = register_test_user(client)

    assert response.status_code == 200

    response_data = response.json()

    assert response_data["username"] == TEST_USER["username"]
    assert response_data["email"] == TEST_USER["email"]
    assert response_data["is_active"] is True
    assert "id" in response_data
    assert "password" not in response_data
    assert "hashed_password" not in response_data


def test_register_duplicate_email_returns_error(client: TestClient):
    first_response = register_test_user(client)
    second_response = register_test_user(
        client,
        {
            "username": "differentusername",
            "email": TEST_USER["email"],
            "password": "AnotherPassword123!",
        },
    )

    assert first_response.status_code == 200
    assert second_response.status_code == 400
    assert second_response.json()["detail"] == "Email already registered"


def test_register_invalid_email_returns_validation_error(client: TestClient):
    response = register_test_user(
        client,
        {
            "username": "invalidemailuser",
            "email": "not-an-email",
            "password": "SecurePassword123!",
        },
    )

    assert response.status_code == 422


def test_login_successfully(client: TestClient):
    register_response = register_test_user(client)
    login_response = login_test_user(client)

    assert register_response.status_code == 200
    assert login_response.status_code == 200

    response_data = login_response.json()

    assert "access_token" in response_data
    assert response_data["token_type"] == "bearer"
    assert isinstance(response_data["access_token"], str)
    assert len(response_data["access_token"]) > 0


def test_login_with_incorrect_password_returns_error(client: TestClient):
    register_test_user(client)

    response = login_test_user(
        client,
        password="WrongPassword123!",
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"


def test_login_with_unregistered_email_returns_error(client: TestClient):
    response = login_test_user(
        client,
        email="missing@example.com",
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"


def test_get_current_user_with_valid_token(client: TestClient):
    register_test_user(client)
    login_response = login_test_user(client)

    access_token = login_response.json()["access_token"]

    response = client.get(
        CURRENT_USER_URL,
        headers={
            "Authorization": f"Bearer {access_token}",
        },
    )

    assert response.status_code == 200

    response_data = response.json()

    assert response_data["username"] == TEST_USER["username"]
    assert response_data["email"] == TEST_USER["email"]
    assert response_data["is_active"] is True


def test_get_current_user_without_token_returns_error(client: TestClient):
    response = client.get(CURRENT_USER_URL)

    assert response.status_code == 401


def test_get_current_user_with_invalid_token_returns_error(
    client: TestClient,
):
    response = client.get(
        CURRENT_USER_URL,
        headers={
            "Authorization": "Bearer invalid-token",
        },
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Could not validate credentials"


def test_get_current_user_when_token_user_does_not_exist(
    client: TestClient,
):
    access_token = create_access_token(
        data={"sub": "missing@example.com"}
    )

    response = client.get(
        CURRENT_USER_URL,
        headers={
            "Authorization": f"Bearer {access_token}",
        },
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Could not validate credentials"


def test_logout_returns_success_message(client: TestClient):
    response = client.post(LOGOUT_URL)

    assert response.status_code == 200
    assert response.json() == {
        "message": "Successfully logged out"
    }