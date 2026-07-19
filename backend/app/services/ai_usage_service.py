from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.ai_usage import AIUsage


def log_ai_usage(
    db: Session,
    user_id: int,
    project_id: int,
    feature_type: str,
    content_type: str,
    status: str = "success",
) -> AIUsage:
    usage = AIUsage(
        user_id=user_id,
        project_id=project_id,
        feature_type=feature_type,
        content_type=content_type,
        status=status,
    )

    try:
        db.add(usage)
        db.commit()
        db.refresh(usage)
        return usage

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="The AI request succeeded, but usage could not be recorded.",
        )