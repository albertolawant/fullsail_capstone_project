from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db

from app.models.content import GeneratedContent
from app.models.project import Project
from app.models.user import User
from app.models.content_version import ContentVersion

from app.schemas.content import (
    ContentCreate,
    ContentUpdate,
    ContentResponse,
)

from app.api.auth import get_current_user

router = APIRouter(
    prefix="/content",
    tags=["Content"],
)


@router.post("/", response_model=ContentResponse)
def create_content(
    content_data: ContentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = (
        db.query(Project)
        .filter(Project.id == content_data.project_id)
        .first()
    )

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found"
        )

    if project.owner_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to add content to this project"
        )

    content = GeneratedContent(
        title=content_data.title,
        content_type=content_data.content_type,
        body=content_data.body,
        project_id=content_data.project_id,
        owner_id=current_user.id,
    )

    db.add(content)
    db.commit()
    db.refresh(content)

    return content


@router.get("/{content_id}", response_model=ContentResponse)
def get_content(
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
            detail="Content not found"
        )

    if content.owner_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to view this content"
        )

    return content


@router.put("/{content_id}", response_model=ContentResponse)
def update_content(
    content_id: int,
    content_data: ContentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    content = (
        db.query(GeneratedContent)
        .filter(GeneratedContent.id == content_id)
        .first()
    )

    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    if content.owner_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to update this content"
        )

    latest_version = (
        db.query(ContentVersion)
        .filter(ContentVersion.content_id == content.id)
        .order_by(ContentVersion.version_number.desc())
        .first()
    )

    next_version_number = 1

    if latest_version:
        next_version_number = latest_version.version_number + 1

    old_version = ContentVersion(
        content_id=content.id,
        title=content.title,
        content_type=content.content_type,
        body=content.body,
        version_number=next_version_number,
        owner_id=current_user.id,
    )

    db.add(old_version)

    if content_data.title is not None:
        content.title = content_data.title

    if content_data.content_type is not None:
        content.content_type = content_data.content_type

    if content_data.body is not None:
        content.body = content_data.body

    db.commit()
    db.refresh(content)

    return content


@router.delete("/{content_id}")
def delete_content(
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
        raise HTTPException(status_code=404, detail="Content not found")

    if content.owner_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to delete this content"
        )

    db.delete(content)
    db.commit()

    return {"message": "Content deleted successfully"}