from collections.abc import Sequence

from fastapi import HTTPException


def validate_ai_response(
    generated_text: str | None,
    content_label: str,
    required_sections: Sequence[str],
    minimum_length: int = 100,
) -> str:
    """
    Validate AI-generated text before it is returned to the frontend.

    Checks that:
    - a response exists
    - the response is not empty
    - the response is long enough to be useful
    - required sections are present
    - the AI did not return a common refusal/error response
    """
    if generated_text is None:
        raise HTTPException(
            status_code=502,
            detail=f"The AI did not return any {content_label}. Please try again.",
        )

    cleaned_text = generated_text.strip()

    if not cleaned_text:
        raise HTTPException(
            status_code=502,
            detail=f"The AI returned empty {content_label}. Please try again.",
        )

    if len(cleaned_text) < minimum_length:
        raise HTTPException(
            status_code=502,
            detail=(
                f"The generated {content_label} was incomplete. "
                "Please try generating it again."
            ),
        )

    normalized_text = cleaned_text.lower()

    refusal_phrases = (
        "i'm sorry",
        "i am sorry",
        "i cannot help",
        "i can't help",
        "unable to generate",
        "as an ai language model",
    )

    if any(phrase in normalized_text for phrase in refusal_phrases):
        raise HTTPException(
            status_code=502,
            detail=(
                f"The AI could not generate valid {content_label}. "
                "Please adjust the description and try again."
            ),
        )

    missing_sections = [
        section
        for section in required_sections
        if section.lower() not in normalized_text
    ]

    if missing_sections:
        raise HTTPException(
            status_code=502,
            detail=(
                f"The generated {content_label} was missing required sections. "
                "Please try generating it again."
            ),
        )

    return cleaned_text