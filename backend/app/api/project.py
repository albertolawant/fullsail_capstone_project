from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from openai import OpenAI
from app.core.config import settings

from app.db.database import get_db
from app.models.project import Project
from app.models.workspace import Workspace
from app.models.user import User
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
)
from app.api.auth import get_current_user
from app.models.content import GeneratedContent
from app.models.content_version import ContentVersion
from app.models.activity_log import ActivityLog

client = OpenAI(api_key=settings.OPENAI_API_KEY)

router = APIRouter(
    prefix="/projects",
    tags=["Projects"]
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


def generate_project_summary(title: str, description: str | None) -> str:
    clean_title = title.strip()
    clean_description = description.strip() if description else ""

    if not clean_description:
        return (
            f"{clean_title} is a Tanio AI project for organizing generated "
            "content, planning details, and saved project materials."
        )

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Write a short professional project summary. "
                        "Do not copy the user's description word for word. "
                        "Summarize the purpose of the project in 1-2 sentences. "
                        "Keep it clear, polished, and concise."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Project name: {clean_title}\n"
                        f"User description: {clean_description}"
                    ),
                },
            ],
            max_tokens=90,
            temperature=0.4,
        )

        summary = response.choices[0].message.content.strip()

        if summary:
            return summary

    except Exception as error:
        print("Project summary generation failed:", error)

    return (
        f"{clean_title} is a Tanio AI project focused on organizing and developing "
        "the ideas described by the user."
    )


@router.post("/", response_model=ProjectResponse)
def create_project(
    project_data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    workspace = (
        db.query(Workspace)
        .filter(
            Workspace.id == project_data.workspace_id,
            Workspace.owner_id == current_user.id
        )
        .first()
    )

    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    new_project = Project(
        title=project_data.title,
        description=project_data.description,
        ai_summary=generate_project_summary(
            project_data.title,
            project_data.description,
        ),
        workspace_id=project_data.workspace_id,
        owner_id=current_user.id
    )

    db.add(new_project)
    db.flush()

    create_activity_log(
        db=db,
        current_user=current_user,
        action_type="Project Created",
        item_type="Project",
        item_id=new_project.id,
        title=f"{new_project.title} created",
        description=f"Project was created in {workspace.name}.",
        project_id=new_project.id,
        project_name=new_project.title,
        new_project_id=new_project.id,
        new_project_name=new_project.title,
    )

    db.commit()
    db.refresh(new_project)

    return new_project


@router.get("/", response_model=List[ProjectResponse])
def get_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return (
        db.query(Project)
        .filter(Project.owner_id == current_user.id)
        .order_by(Project.created_at.desc(), Project.id.desc())
        .all()
    )


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = (
        db.query(Project)
        .filter(
            Project.id == project_id,
            Project.owner_id == current_user.id
        )
        .first()
    )

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return project


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    project_data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = (
        db.query(Project)
        .filter(
            Project.id == project_id,
            Project.owner_id == current_user.id
        )
        .first()
    )

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    old_title = project.title
    old_workspace_id = project.workspace_id

    old_workspace = (
        db.query(Workspace)
        .filter(Workspace.id == old_workspace_id)
        .first()
    )

    description_changed = False

    if project_data.title is not None:
        project.title = project_data.title

    if project_data.description is not None:
        project.description = project_data.description
        description_changed = True

    if project_data.workspace_id is not None:
        workspace = (
            db.query(Workspace)
            .filter(
                Workspace.id == project_data.workspace_id,
                Workspace.owner_id == current_user.id
            )
            .first()
        )

        if not workspace:
            raise HTTPException(
                status_code=404,
                detail="Workspace not found"
            )

        project.workspace_id = project_data.workspace_id

    if project_data.title is not None or description_changed:
        project.ai_summary = generate_project_summary(
            project.title,
            project.description,
        )

    new_workspace = (
        db.query(Workspace)
        .filter(Workspace.id == project.workspace_id)
        .first()
    )

    workspace_changed = old_workspace_id != project.workspace_id

    if workspace_changed:
        create_activity_log(
            db=db,
            current_user=current_user,
            action_type="Project Moved",
            item_type="Project",
            item_id=project.id,
            title=f"{project.title} moved",
            description=(
                f"Project moved from "
                f"{old_workspace.name if old_workspace else 'Unknown Workspace'} "
                f"to {new_workspace.name if new_workspace else 'Unknown Workspace'}."
            ),
            project_id=project.id,
            project_name=project.title,
            old_project_id=project.id,
            old_project_name=old_title,
            new_project_id=project.id,
            new_project_name=project.title,
        )
    else:
        create_activity_log(
            db=db,
            current_user=current_user,
            action_type="Project Updated",
            item_type="Project",
            item_id=project.id,
            title=f"{project.title} updated",
            description="Project information was updated.",
            project_id=project.id,
            project_name=project.title,
        )

    db.commit()
    db.refresh(project)

    return project


@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = (
        db.query(Project)
        .filter(
            Project.id == project_id,
            Project.owner_id == current_user.id
        )
        .first()
    )

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found"
        )

    project_content = (
        db.query(GeneratedContent)
        .filter(
            GeneratedContent.project_id == project.id,
            GeneratedContent.owner_id == current_user.id
        )
        .all()
    )

    content_ids = [
        content.id
        for content in project_content
    ]

    if content_ids:
        (
            db.query(ContentVersion)
            .filter(
                ContentVersion.content_id.in_(content_ids),
                ContentVersion.owner_id == current_user.id
            )
            .delete(synchronize_session=False)
        )

        (
            db.query(GeneratedContent)
            .filter(
                GeneratedContent.project_id == project.id,
                GeneratedContent.owner_id == current_user.id
            )
            .delete(synchronize_session=False)
        )

    create_activity_log(
        db=db,
        current_user=current_user,
        action_type="Project Deleted",
        item_type="Project",
        item_id=project.id,
        title=f"{project.title} deleted",
        description="Project and associated content were permanently deleted.",
        project_id=project.id,
        project_name=project.title,
    )

    db.delete(project)
    db.commit()

    return {"message": "Project deleted successfully"}