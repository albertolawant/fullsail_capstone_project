from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.content import GeneratedContent
from app.models.content_version import ContentVersion
from app.models.user import User
from app.schemas.content_version import (
    ContentVersionCreate,
    ContentVersionResponse,
)
from app.schemas.content import ContentResponse
from app.api.auth import get_current_user


router = APIRouter(
    prefix="/content",
    tags=["Content Versions"],
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

    latest_version = (
        db.query(ContentVersion)
        .filter(
            ContentVersion.content_id == content_id,
            ContentVersion.owner_id == current_user.id,
        )
        .order_by(ContentVersion.version_number.desc())
        .first()
    )

    next_version_number = 1

    if latest_version:
        next_version_number = latest_version.version_number + 1

    version_body = content.body
    regeneration_instructions = None

    if version_data:
        if version_data.body is not None:
            version_body = version_data.body

        regeneration_instructions = (
            version_data.regeneration_instructions.strip()
            if version_data.regeneration_instructions
            else None
        )

    version = ContentVersion(
        content_id=content.id,
        title=content.title,
        content_type=content.content_type,
        body=version_body,
        version_number=next_version_number,
        regeneration_instructions=regeneration_instructions,
        owner_id=current_user.id,
    )

    db.add(version)
    db.commit()
    db.refresh(version)

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

    versions = (
        db.query(ContentVersion)
        .filter(
            ContentVersion.content_id == content_id,
            ContentVersion.owner_id == current_user.id,
        )
        .order_by(ContentVersion.version_number.asc())
        .all()
    )

    return versions


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

    content.title = version.title
    content.content_type = version.content_type
    content.body = version.body

    db.commit()
    db.refresh(content)

    return content