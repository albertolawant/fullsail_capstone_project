from fastapi import HTTPException
from pydantic import ValidationError

from app.schemas.learning_studio import (
    FlashcardsResponse,
    LessonResponse,
    QuizResponse,
)


LEARNING_STUDIO_CONTENT_TYPES = {
    "learning-studio-lesson": "lesson",
    "learning-studio-flashcards": "flashcards",
    "learning-studio-quiz": "quiz",
}

LEARNING_STUDIO_RESPONSE_MODELS = {
    "lesson": LessonResponse,
    "flashcards": FlashcardsResponse,
    "quiz": QuizResponse,
}


def is_learning_studio_content(content_type: str) -> bool:
    return content_type in LEARNING_STUDIO_CONTENT_TYPES


def validate_learning_studio_body(
    content_type: str,
    body: str,
) -> str:
    """
    Validate and normalize saved Learning Studio material.

    Other modules retain their existing text format.
    Learning Studio stores the complete response as JSON,
    including study settings and structured content.
    """
    output_type = LEARNING_STUDIO_CONTENT_TYPES.get(content_type)

    if output_type is None:
        return body

    response_model = LEARNING_STUDIO_RESPONSE_MODELS[output_type]

    try:
        material = response_model.model_validate_json(body)
    except ValidationError as error:
        messages = []

        for issue in error.errors()[:3]:
            field_path = ".".join(
                str(part) for part in issue["loc"]
            ) or "material"

            messages.append(
                f"{field_path}: {issue['msg']}"
            )

        raise HTTPException(
            status_code=422,
            detail=(
                "The learning material is invalid. "
                + " ".join(messages)
            ),
        ) from error

    if material.output_type != output_type:
        raise HTTPException(
            status_code=422,
            detail=(
                "The saved content type must match the "
                "learning material's output type."
            ),
        )

    return material.model_dump_json()


def validate_learning_studio_update(
    current_content_type: str,
    next_content_type: str,
    next_body: str,
) -> str:
    """
    Prevent learning material from bypassing validation
    by changing its content type to an ordinary text type.
    """
    if (
        is_learning_studio_content(current_content_type)
        and not is_learning_studio_content(next_content_type)
    ):
        raise HTTPException(
            status_code=422,
            detail=(
                "Learning Studio material must retain a "
                "Learning Studio content type."
            ),
        )

    return validate_learning_studio_body(
        next_content_type,
        next_body,
    )