from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.workspace import Workspace
from app.models.project import Project
from app.models.content import GeneratedContent
from app.models.content_version import ContentVersion
from app.models.user import User
from app.schemas.workspace import (
    WorkspaceCreate,
    WorkspaceUpdate,
    WorkspaceResponse,
)
from app.api.auth import get_current_user

router = APIRouter(
    prefix="/workspaces",
    tags=["Workspaces"],
)


@router.post("/", response_model=WorkspaceResponse)
def create_workspace(
    workspace_data: WorkspaceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_workspace = Workspace(
        name=workspace_data.name,
        description=workspace_data.description,
        owner_id=current_user.id,
    )

    db.add(new_workspace)
    db.commit()
    db.refresh(new_workspace)

    return new_workspace


@router.get("/", response_model=List[WorkspaceResponse])
def get_workspaces(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Workspace)
        .filter(Workspace.owner_id == current_user.id)
        .all()
    )


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
def get_workspace(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workspace = (
        db.query(Workspace)
        .filter(
            Workspace.id == workspace_id,
            Workspace.owner_id == current_user.id,
        )
        .first()
    )

    if not workspace:
        raise HTTPException(
            status_code=404,
            detail="Workspace not found",
        )

    return workspace


@router.put("/{workspace_id}", response_model=WorkspaceResponse)
def update_workspace(
    workspace_id: int,
    workspace_data: WorkspaceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workspace = (
        db.query(Workspace)
        .filter(
            Workspace.id == workspace_id,
            Workspace.owner_id == current_user.id,
        )
        .first()
    )

    if not workspace:
        raise HTTPException(
            status_code=404,
            detail="Workspace not found",
        )

    if workspace_data.name is not None:
        workspace.name = workspace_data.name

    if workspace_data.description is not None:
        workspace.description = workspace_data.description

    db.commit()
    db.refresh(workspace)

    return workspace


@router.delete("/{workspace_id}")
def delete_workspace(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workspace = (
        db.query(Workspace)
        .filter(
            Workspace.id == workspace_id,
            Workspace.owner_id == current_user.id,
        )
        .first()
    )

    if not workspace:
        raise HTTPException(
            status_code=404,
            detail="Workspace not found",
        )

    projects = (
        db.query(Project)
        .filter(
            Project.workspace_id == workspace.id,
            Project.owner_id == current_user.id,
        )
        .all()
    )

    project_ids = [project.id for project in projects]

    if project_ids:
        generated_content = (
            db.query(GeneratedContent)
            .filter(
                GeneratedContent.project_id.in_(project_ids),
                GeneratedContent.owner_id == current_user.id,
            )
            .all()
        )

        content_ids = [
            content.id
            for content in generated_content
        ]

        if content_ids:
            (
                db.query(ContentVersion)
                .filter(
                    ContentVersion.content_id.in_(content_ids),
                    ContentVersion.owner_id == current_user.id,
                )
                .delete(synchronize_session=False)
            )

        (
            db.query(GeneratedContent)
            .filter(
                GeneratedContent.project_id.in_(project_ids),
                GeneratedContent.owner_id == current_user.id,
            )
            .delete(synchronize_session=False)
        )

        (
            db.query(Project)
            .filter(
                Project.workspace_id == workspace.id,
                Project.owner_id == current_user.id,
            )
            .delete(synchronize_session=False)
        )

    db.delete(workspace)
    db.commit()

    return {
        "message": "Workspace and associated projects deleted successfully"
    }