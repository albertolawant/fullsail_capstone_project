from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.api.auth import get_current_user
from app.db.database import get_db
from app.models.content import GeneratedContent
from app.models.content_version import ContentVersion
from app.models.project import Project
from app.models.user import User
from app.models.activity_log import ActivityLog
from app.schemas.content import (
    ContentCreate,
    ContentResponse,
    ContentUpdate,
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

    content = GeneratedContent(
        title=content_data.title,
        content_type=content_data.content_type,
        body=content_data.body,
        project_id=content_data.project_id,
        owner_id=current_user.id,
    )

    db.add(content)
    db.flush()

    create_activity_log(
        db=db,
        current_user=current_user,
        action_type="Content Created",
        item_type="Content",
        item_id=content.id,
        title=f"{content.title} created",
        description=f"{content.content_type} was saved to {project.title}.",
        project_id=project.id,
        project_name=project.title,
        new_project_id=project.id,
        new_project_name=project.title,
    )

    db.commit()
    db.refresh(content)

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
    Return all generated content owned by the authenticated user.

    Optional query parameters:

    - search: searches the title, content type, and body
    - content_type: filters by an exact content type
    - project_id: filters content by project

    Results are returned with the newest content first.
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

    return query.order_by(GeneratedContent.id.desc()).all()


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

    old_project_id = content.project_id

    old_project = (
        db.query(Project)
        .filter(Project.id == old_project_id)
        .first()
    )

    if content.owner_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to update this content",
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

    if content_data.project_id is not None:
        project = (
            db.query(Project)
            .filter(
                Project.id == content_data.project_id,
                Project.owner_id == current_user.id
            )
            .first()
        )

        if not project:
            raise HTTPException(
                status_code=404,
                detail="Project not found",
            )

        content.project_id = content_data.project_id

    new_project = (
        db.query(Project)
        .filter(Project.id == content.project_id)
        .first()
    )

    project_changed = old_project_id != content.project_id

    if project_changed:
        create_activity_log(
            db=db,
            current_user=current_user,
            action_type="Content Moved",
            item_type="Content",
            item_id=content.id,
            title=f"{content.title} moved",
            description=(
                f"Content moved from "
                f"{old_project.title if old_project else 'Unknown Project'} "
                f"to {new_project.title if new_project else 'Unknown Project'}."
            ),
            project_id=content.project_id,
            project_name=new_project.title if new_project else None,
            old_project_id=old_project_id,
            old_project_name=old_project.title if old_project else None,
            new_project_id=content.project_id,
            new_project_name=new_project.title if new_project else None,
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
            project_name=new_project.title if new_project else None,
        )

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
            description=f"{content.content_type} was permanently deleted.",
            project_id=content.project_id,
            project_name=project.title if project else None,
        )

        db.delete(content)
        db.commit()

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Content could not be deleted. Please try again.",
        )

    return {"message": "Content deleted permanently"}