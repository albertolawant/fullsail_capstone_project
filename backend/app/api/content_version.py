from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.db.database import get_db
from app.models.content import GeneratedContent
from app.models.content_version import ContentVersion
from app.models.user import User
from app.schemas.content import ContentResponse
from app.schemas.content_version import (
    ContentVersionCreate,
    ContentVersionResponse,
)
from app.services.learning_studio_content import (
    validate_learning_studio_body,
    validate_learning_studio_update,
)


router = APIRouter(
    prefix="/content",
    tags=["Content Versions"],
)


def get_next_version_number(
    db: Session,
    content_id: int,
) -> int:
    latest_version = (
        db.query(ContentVersion)
        .filter(ContentVersion.content_id == content_id)
        .order_by(ContentVersion.version_number.desc())
        .first()
    )

    return (
        latest_version.version_number + 1
        if latest_version
        else 1
    )


@router.post(
    "/{content_id}/versions",
    response_model=ContentVersionResponse,
)
def create_content_version(
    content_id: int,
    version_data: Optional[ContentVersionCreate] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    content = (
        db.query(GeneratedContent)
        .filter(GeneratedContent.id == content_id)
        .first()
    )

    if not content:
        raise HTTPException(
            status_code=404,
            detail="Content not found",
        )

    if content.owner_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to version this content",
        )

    version_body = content.body
    regeneration_instructions = None

    if version_data is not None:
        if version_data.body is not None:
            version_body = version_data.body

        if version_data.regeneration_instructions:
            regeneration_instructions = (
                version_data.regeneration_instructions.strip() or None
            )

    if not version_body.strip():
        raise HTTPException(
            status_code=422,
            detail="Version body is required.",
        )

    validated_body = validate_learning_studio_body(
        content.content_type,
        version_body,
    )

    version = ContentVersion(
        content_id=content.id,
        title=content.title,
        content_type=content.content_type,
        body=validated_body,
        version_number=get_next_version_number(db, content.id),
        regeneration_instructions=regeneration_instructions,
        owner_id=current_user.id,
    )

    try:
        db.add(version)
        db.commit()
        db.refresh(version)
    except Exception as error:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Content version could not be saved. Please try again.",
        ) from error

    return version


@router.get(
    "/{content_id}/versions",
    response_model=List[ContentVersionResponse],
)
def get_content_versions(
    content_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    content = (
        db.query(GeneratedContent)
        .filter(GeneratedContent.id == content_id)
        .first()
    )

    if not content:
        raise HTTPException(
            status_code=404,
            detail="Content not found",
        )

    if content.owner_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to view versions for this content",
        )

    return (
        db.query(ContentVersion)
        .filter(
            ContentVersion.content_id == content_id,
            ContentVersion.owner_id == current_user.id,
        )
        .order_by(ContentVersion.version_number.asc())
        .all()
    )


@router.post(
    "/versions/{version_id}/restore",
    response_model=ContentResponse,
)
def restore_content_version(
    version_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    version = (
        db.query(ContentVersion)
        .filter(ContentVersion.id == version_id)
        .first()
    )

    if not version:
        raise HTTPException(
            status_code=404,
            detail="Version not found",
        )

    if version.owner_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to restore this version",
        )

    content = (
        db.query(GeneratedContent)
        .filter(GeneratedContent.id == version.content_id)
        .first()
    )

    if not content:
        raise HTTPException(
            status_code=404,
            detail="Original content not found",
        )

    if content.owner_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to restore this content",
        )

    # Validate before changing the active content or its history.
    if not version.title.strip():
        raise HTTPException(
            status_code=422,
            detail="The saved version has an empty title.",
        )

    if not version.content_type.strip():
        raise HTTPException(
            status_code=422,
            detail="The saved version has an empty content type.",
        )

    if not version.body.strip():
        raise HTTPException(
            status_code=422,
            detail="The saved version has an empty body.",
        )

    validated_body = validate_learning_studio_update(
        content.content_type,
        version.content_type,
        version.body,
    )

    # Keep a snapshot of the current content so it can be recovered.
    current_snapshot = ContentVersion(
        content_id=content.id,
        title=content.title,
        content_type=content.content_type,
        body=content.body,
        version_number=get_next_version_number(db, content.id),
        regeneration_instructions=(
            f"Snapshot before restoring version {version.version_number}."
        ),
        owner_id=current_user.id,
    )

    try:
        db.add(current_snapshot)

        content.title = version.title
        content.content_type = version.content_type
        content.body = validated_body
        content.updated_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(content)
    except Exception as error:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Content version could not be restored. Please try again.",
        ) from error

    return content