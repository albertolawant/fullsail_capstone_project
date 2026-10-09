from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.db.database import get_db
from app.models.activity_log import ActivityLog
from app.models.content import GeneratedContent
from app.models.content_version import ContentVersion
from app.models.project import Project
from app.models.user import User
from app.schemas.content import (
    ContentCreate,
    ContentResponse,
    ContentUpdate,
)
from app.services.learning_studio_content import (
    validate_learning_studio_body,
    validate_learning_studio_update,
)


router = APIRouter(
    prefix="/content",
    tags=["Content"],
)


def create_activity_log(
    db: Session,
    current_user: User,
    action_type: str,
    item_type: str,
    item_id: int | None,
    title: str,
    description: str | None = None,
    project_id: int | None = None,
    project_name: str | None = None,
    old_project_id: int | None = None,
    old_project_name: str | None = None,
    new_project_id: int | None = None,
    new_project_name: str | None = None,
):
    activity = ActivityLog(
        owner_id=current_user.id,
        action_type=action_type,
        item_type=item_type,
        item_id=item_id,
        title=title,
        description=description,
        project_id=project_id,
        project_name=project_name,
        old_project_id=old_project_id,
        old_project_name=old_project_name,
        new_project_id=new_project_id,
        new_project_name=new_project_name,
    )

    db.add(activity)


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
            detail="Project not found",
        )

    if project.owner_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to add content to this project",
        )

    cleaned_title = content_data.title.strip()
    cleaned_content_type = content_data.content_type.strip()

    if not cleaned_title:
        raise HTTPException(
            status_code=422,
            detail="Content title is required.",
        )

    if not cleaned_content_type:
        raise HTTPException(
            status_code=422,
            detail="Content type is required.",
        )

    if not content_data.body.strip():
        raise HTTPException(
            status_code=422,
            detail="Content body is required.",
        )

    validated_body = validate_learning_studio_body(
        cleaned_content_type,
        content_data.body,
    )

    content = GeneratedContent(
        title=cleaned_title,
        content_type=cleaned_content_type,
        body=validated_body,
        project_id=project.id,
        owner_id=current_user.id,
    )

    try:
        db.add(content)
        db.flush()

        create_activity_log(
            db=db,
            current_user=current_user,
            action_type="Content Created",
            item_type="Content",
            item_id=content.id,
            title=f"{content.title} created",
            description=(
                f"{content.content_type} was saved to {project.title}."
            ),
            project_id=project.id,
            project_name=project.title,
            new_project_id=project.id,
            new_project_name=project.title,
        )

        db.commit()
        db.refresh(content)
    except Exception as error:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Content could not be saved. Please try again.",
        ) from error

    return content


@router.get("/", response_model=List[ContentResponse])
def get_all_content(
    search: Optional[str] = Query(
        default=None,
        description="Search content by title, type, or body",
    ),
    content_type: Optional[str] = Query(
        default=None,
        description="Filter content by its exact content type",
    ),
    project_id: Optional[int] = Query(
        default=None,
        description="Filter content by project ID",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return content owned by the authenticated user,
    with the most recently updated material first.
    """
    query = db.query(GeneratedContent).filter(
        GeneratedContent.owner_id == current_user.id
    )

    if search and search.strip():
        search_value = f"%{search.strip()}%"

        query = query.filter(
            or_(
                GeneratedContent.title.ilike(search_value),
                GeneratedContent.content_type.ilike(search_value),
                GeneratedContent.body.ilike(search_value),
            )
        )

    if content_type and content_type.strip():
        query = query.filter(
            GeneratedContent.content_type == content_type.strip()
        )

    if project_id is not None:
        query = query.filter(
            GeneratedContent.project_id == project_id
        )

    return query.order_by(
        GeneratedContent.updated_at.desc(),
        GeneratedContent.created_at.desc(),
        GeneratedContent.id.desc(),
    ).all()


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
            detail="Content not found",
        )

    if content.owner_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to view this content",
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
        raise HTTPException(
            status_code=404,
            detail="Content not found",
        )

    if content.owner_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to update this content",
        )

    # Validate proposed values before changing content or history.
    next_title = (
        content_data.title.strip()
        if content_data.title is not None
        else content.title
    )

    next_content_type = (
        content_data.content_type.strip()
        if content_data.content_type is not None
        else content.content_type
    )

    next_body = (
        content_data.body
        if content_data.body is not None
        else content.body
    )

    if not next_title:
        raise HTTPException(
            status_code=422,
            detail="Content title is required.",
        )

    if not next_content_type:
        raise HTTPException(
            status_code=422,
            detail="Content type is required.",
        )

    if not next_body.strip():
        raise HTTPException(
            status_code=422,
            detail="Content body is required.",
        )

    validated_body = validate_learning_studio_update(
        content.content_type,
        next_content_type,
        next_body,
    )

    old_project_id = content.project_id

    old_project = (
        db.query(Project)
        .filter(Project.id == old_project_id)
        .first()
    )

    next_project_id = content.project_id
    new_project = old_project

    if content_data.project_id is not None:
        new_project = (
            db.query(Project)
            .filter(
                Project.id == content_data.project_id,
                Project.owner_id == current_user.id,
            )
            .first()
        )

        if not new_project:
            raise HTTPException(
                status_code=404,
                detail="Project not found",
            )

        next_project_id = new_project.id

    latest_version = (
        db.query(ContentVersion)
        .filter(ContentVersion.content_id == content.id)
        .order_by(ContentVersion.version_number.desc())
        .first()
    )

    next_version_number = (
        latest_version.version_number + 1
        if latest_version
        else 1
    )

    old_version = ContentVersion(
        content_id=content.id,
        title=content.title,
        content_type=content.content_type,
        body=content.body,
        version_number=next_version_number,
        owner_id=current_user.id,
    )

    try:
        db.add(old_version)

        content.title = next_title
        content.content_type = next_content_type
        content.body = validated_body
        content.project_id = next_project_id
        content.updated_at = datetime.now(timezone.utc)

        project_changed = old_project_id != next_project_id

        if project_changed:
            old_project_name = (
                old_project.title if old_project else "No Project"
            )
            new_project_name = (
                new_project.title if new_project else "No Project"
            )

            create_activity_log(
                db=db,
                current_user=current_user,
                action_type="Content Moved",
                item_type="Content",
                item_id=content.id,
                title=f"{content.title} moved",
                description=(
                    f"Content moved from {old_project_name} "
                    f"to {new_project_name}."
                ),
                project_id=content.project_id,
                project_name=(
                    new_project.title if new_project else None
                ),
                old_project_id=old_project_id,
                old_project_name=(
                    old_project.title if old_project else None
                ),
                new_project_id=content.project_id,
                new_project_name=(
                    new_project.title if new_project else None
                ),
            )
        else:
            create_activity_log(
                db=db,
                current_user=current_user,
                action_type="Content Updated",
                item_type="Content",
                item_id=content.id,
                title=f"{content.title} updated",
                description=f"{content.content_type} was updated.",
                project_id=content.project_id,
                project_name=(
                    new_project.title if new_project else None
                ),
            )

        # Save the previous version and edited content together.
        db.commit()
        db.refresh(content)
    except Exception as error:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Content could not be updated. Please try again.",
        ) from error

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
        raise HTTPException(
            status_code=404,
            detail="Content not found",
        )

    if content.owner_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to delete this content",
        )

    project = (
        db.query(Project)
        .filter(Project.id == content.project_id)
        .first()
    )

    try:
        db.query(ContentVersion).filter(
            ContentVersion.content_id == content.id
        ).delete(synchronize_session=False)

        create_activity_log(
            db=db,
            current_user=current_user,
            action_type="Content Deleted",
            item_type="Content",
            item_id=content.id,
            title=f"{content.title} deleted",
            description=(
                f"{content.content_type} was permanently deleted."
            ),
            project_id=content.project_id,
            project_name=project.title if project else None,
        )

        db.delete(content)
        db.commit()
    except Exception as error:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Content could not be deleted. Please try again.",
        ) from error

    return {"message": "Content deleted permanently"}