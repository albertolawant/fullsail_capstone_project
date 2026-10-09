import json
from types import SimpleNamespace
from unittest.mock import Mock

import httpx
import pytest
from openai import (
    APIConnectionError,
    APIError,
    APITimeoutError,
    AuthenticationError,
    RateLimitError,
)

from app.api import learning_studio
from app.api.auth import get_current_user
from app.main import app


ENDPOINT = "/learning-studio/generate"

VALID_REQUEST = {
    "topic": "Python loops",
    "learning_goal": "Understand for and while loops.",
    "experience_level": "beginner",
    "output_type": "lesson",
}

VALID_CONTENT = {
    "lesson": {
        "title": "Python Loops",
        "introduction": "Loops repeat a block of code.",
        "learning_objectives": ["Understand a for loop."],
        "sections": [
            {
                "heading": "For Loops",
                "explanation": "A for loop iterates over a sequence.",
                "examples": [
                    {
                        "title": "Print Numbers",
                        "example": "for number in range(3):\n    print(number)",
                        "explanation": "This prints 0, 1, and 2.",
                    }
                ],
            }
        ],
        "summary": "Use loops to repeat actions.",
    },
    "flashcards": {
        "title": "Python Loop Flashcards",
        "cards": [
            {
                "question": "What does a loop do?",
                "answer": "It repeats a block of code.",
            }
        ],
    },
    "quiz": {
        "title": "Python Loop Quiz",
        "questions": [
            {
                "question": "How many times does range(3) iterate?",
                "choices": ["One", "Two", "Three", "Four"],
                "correct_answer_index": 2,
                "explanation": "range(3) produces 0, 1, and 2.",
            }
        ],
    },
}


@pytest.fixture
def mocked_ai(monkeypatch):
    fake_client = Mock()
    usage_logger = Mock()

    monkeypatch.setattr(
        learning_studio.settings,
        "OPENAI_API_KEY",
        "test-key-not-real",
    )
    monkeypatch.setattr(
        learning_studio,
        "create_openai_client",
        lambda: fake_client,
    )
    monkeypatch.setattr(
        learning_studio,
        "log_ai_usage",
        usage_logger,
    )

    return fake_client, usage_logger


@pytest.fixture
def authenticated_user():
    previous_override = app.dependency_overrides.get(get_current_user)

    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(
        id=123
    )

    yield

    if previous_override is None:
        app.dependency_overrides.pop(get_current_user, None)
    else:
        app.dependency_overrides[get_current_user] = previous_override


@pytest.mark.parametrize("output_type", ["lesson", "flashcards", "quiz"])
def test_valid_output(
    client,
    authenticated_user,
    mocked_ai,
    output_type,
):
    fake_client, usage_logger = mocked_ai
    content = VALID_CONTENT[output_type]

    fake_client.responses.create.return_value = SimpleNamespace(
        status="completed",
        output_text=json.dumps(content),
    )

    response = client.post(
        ENDPOINT,
        json={
            **VALID_REQUEST,
            "output_type": output_type,
        },
    )

    assert response.status_code == 200
    assert response.json()["output_type"] == output_type
    assert response.json()["content"] == content

    fake_client.responses.create.assert_called_once()
    usage_logger.assert_called_once()

    logged_arguments = usage_logger.call_args.kwargs
    assert logged_arguments["user_id"] == 123
    assert logged_arguments["project_id"] is None
    assert logged_arguments["content_type"] == output_type


@pytest.mark.parametrize(
    "changes",
    [
        {"topic": ""},
        {"topic": "   "},
        {"topic": "x" * 201},
        {"learning_goal": "x" * 1001},
        {"experience_level": "expert"},
        {"output_type": "video"},
    ],
)
def test_invalid_input(
    client,
    authenticated_user,
    mocked_ai,
    changes,
):
    fake_client, usage_logger = mocked_ai

    response = client.post(
        ENDPOINT,
        json={**VALID_REQUEST, **changes},
    )

    assert response.status_code == 422
    fake_client.responses.create.assert_not_called()
    usage_logger.assert_not_called()


def test_unauthenticated_request(client, mocked_ai):
    fake_client, usage_logger = mocked_ai

    response = client.post(
        ENDPOINT,
        json=VALID_REQUEST,
    )

    assert response.status_code == 401
    fake_client.responses.create.assert_not_called()
    usage_logger.assert_not_called()


@pytest.mark.parametrize(
    "output_type, generated_text",
    [
        ("lesson", None),
        ("lesson", ""),
        ("lesson", "   "),
        ("lesson", "This is not JSON."),
        ("lesson", '{"title": "Incomplete Lesson"}'),
        ("lesson", "[]"),
        (
            "lesson",
            json.dumps({
                **VALID_CONTENT["lesson"],
                "sections": [],
            }),
        ),
        (
            "lesson",
            json.dumps({
                **VALID_CONTENT["lesson"],
                "sections": [
                    {
                        "heading": "Loops",
                        "explanation": "Loops repeat code.",
                        "examples": [],
                    }
                ],
            }),
        ),
        (
            "flashcards",
            '{"title": "Cards", "cards": [{"question": "What is a loop?"}]}',
        ),
        (
            "quiz",
            json.dumps({
                "title": "Quiz",
                "questions": [
                    {
                        "question": "How many iterations?",
                        "choices": ["One", "Two", "Three"],
                        "correct_answer_index": 2,
                        "explanation": "Three iterations.",
                    }
                ],
            }),
        ),
        (
            "quiz",
            json.dumps({
                "title": "Quiz",
                "questions": [
                    {
                        "question": "How many iterations?",
                        "choices": ["One", "Two", "Three", "Four"],
                        "correct_answer_index": 4,
                        "explanation": "Three iterations.",
                    }
                ],
            }),
        ),
        (
            "quiz",
            json.dumps({
                "title": "Quiz",
                "questions": [
                    {
                        "question": "How many iterations?",
                        "choices": ["One", "Two", "Three", "Three"],
                        "correct_answer_index": 2,
                        "explanation": "Three iterations.",
                    }
                ],
            }),
        ),
    ],
)
def test_malformed_ai_response(
    client,
    authenticated_user,
    mocked_ai,
    output_type,
    generated_text,
):
    fake_client, usage_logger = mocked_ai

    fake_client.responses.create.return_value = SimpleNamespace(
        status="completed",
        output_text=generated_text,
    )

    response = client.post(
        ENDPOINT,
        json={
            **VALID_REQUEST,
            "output_type": output_type,
        },
    )

    assert response.status_code == 502
    assert isinstance(response.json()["detail"], str)
    assert "content" not in response.json()
    usage_logger.assert_not_called()


def test_incomplete_ai_response(
    client,
    authenticated_user,
    mocked_ai,
):
    fake_client, usage_logger = mocked_ai

    fake_client.responses.create.return_value = SimpleNamespace(
        status="incomplete",
        output_text=json.dumps(VALID_CONTENT["lesson"]),
    )

    response = client.post(ENDPOINT, json=VALID_REQUEST)

    assert response.status_code == 502
    usage_logger.assert_not_called()


@pytest.mark.parametrize(
    "error_type, expected_status",
    [
        ("timeout", 504),
        ("connection", 503),
        ("rate_limit", 429),
        ("authentication", 503),
        ("api_error", 502),
        ("unexpected", 500),
    ],
)
def test_ai_failure(
    client,
    authenticated_user,
    mocked_ai,
    error_type,
    expected_status,
):
    fake_client, usage_logger = mocked_ai
    request = httpx.Request("POST", "https://example.com/test")

    if error_type == "timeout":
        error = APITimeoutError(request=request)
    elif error_type == "connection":
        error = APIConnectionError(request=request)
    elif error_type == "rate_limit":
        error = RateLimitError(
            "Private provider error",
            response=httpx.Response(429, request=request),
            body=None,
        )
    elif error_type == "authentication":
        error = AuthenticationError(
            "Private provider error",
            response=httpx.Response(401, request=request),
            body=None,
        )
    elif error_type == "api_error":
        error = APIError(
            "Private provider error",
            request=request,
            body=None,
        )
    else:
        error = RuntimeError("Private provider error")

    fake_client.responses.create.side_effect = error

    response = client.post(ENDPOINT, json=VALID_REQUEST)

    assert response.status_code == expected_status
    assert isinstance(response.json()["detail"], str)
    assert "Private provider error" not in response.text
    usage_logger.assert_not_called()


def test_missing_api_key(
    client,
    authenticated_user,
    mocked_ai,
    monkeypatch,
):
    fake_client, usage_logger = mocked_ai

    monkeypatch.setattr(
        learning_studio.settings,
        "OPENAI_API_KEY",
        "",
    )

    response = client.post(ENDPOINT, json=VALID_REQUEST)

    assert response.status_code == 503
    fake_client.responses.create.assert_not_called()
    usage_logger.assert_not_called()