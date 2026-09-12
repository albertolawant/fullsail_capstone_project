from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.workspace import Workspace
from app.models.project import Project
from app.models.content import GeneratedContent
from app.models.content_version import ContentVersion
from app.models.product_logo import ProductLogo
from app.models.user import User
from app.schemas.workspace import (
    WorkspaceCreate,
    WorkspaceUpdate,
    WorkspaceResponse,
)
from app.api.auth import get_current_user
from app.models.activity_log import ActivityLog

router = APIRouter(
    prefix="/workspaces",
    tags=["Workspaces"],
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
    db.flush()

    create_activity_log(
        db=db,
        current_user=current_user,
        action_type="Workspace Created",
        item_type="Workspace",
        item_id=new_workspace.id,
        title=f"{new_workspace.name} created",
        description="New workspace was created.",
    )

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
        .order_by(
            Workspace.updated_at.desc(),
            Workspace.created_at.desc(),
            Workspace.id.desc(),
        )
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

    workspace.updated_at = datetime.now(timezone.utc)    

    db.commit()
    db.refresh(workspace)

    return workspace

@router.delete("/{workspace_id}")
def delete_workspace(
    workspace_id: int,
    delete_content_choice: str = Query(default="delete-all"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    valid_delete_choices = {
        "workspace-only",
        "delete-projects-keep-content",
        "delete-all",
    }

    if delete_content_choice not in valid_delete_choices:
        raise HTTPException(
            status_code=400,
            detail="Invalid workspace delete option.",
        )

    
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

    workspace_name = workspace.name

    project_snapshots = [
        {
            "id": project.id,
            "title": project.title,
        }
        for project in projects
    ]

    content_snapshots = []
    logo_snapshots = []

    if project_ids:
        if delete_content_choice == "delete-all":
            generated_content = (
                db.query(GeneratedContent)
                .filter(
                    GeneratedContent.project_id.in_(project_ids),
                    GeneratedContent.owner_id == current_user.id,
                )
                .all()
            )

            content_snapshots = [
                {
                    "id": content.id,
                    "title": content.title,
                    "content_type": content.content_type,
                    "project_id": content.project_id,
                }
                for content in generated_content
            ]

            logos_to_delete = (
                db.query(ProductLogo)
                .filter(
                    ProductLogo.project_id.in_(project_ids),
                    ProductLogo.owner_id == current_user.id,
                )
                .all()
            )

            logo_snapshots = [
                {
                    "id": logo.id,
                    "project_id": logo.project_id,
                }
                for logo in logos_to_delete
            ]

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
                db.query(ProductLogo)
                .filter(
                    ProductLogo.project_id.in_(project_ids),
                    ProductLogo.owner_id == current_user.id,
                )
                .delete(synchronize_session=False)
            )

        if delete_content_choice == "delete-projects-keep-content":
            (
                db.query(GeneratedContent)
                .filter(
                    GeneratedContent.project_id.in_(project_ids),
                    GeneratedContent.owner_id == current_user.id,
                )
                .update(
                    {GeneratedContent.project_id: None},
                    synchronize_session=False,
                )
            )

            (
                db.query(ProductLogo)
                .filter(
                    ProductLogo.project_id.in_(project_ids),
                    ProductLogo.owner_id == current_user.id,
                )
                .update(
                    {ProductLogo.project_id: None},
                    synchronize_session=False,
                )
            )

        if delete_content_choice == "workspace-only":
            (
                db.query(Project)
                .filter(
                    Project.workspace_id == workspace.id,
                    Project.owner_id == current_user.id,
                )
                .update(
                    {Project.workspace_id: None},
                    synchronize_session=False,
                )
            )            

        if delete_content_choice != "workspace-only":
            (
                db.query(Project)
                .filter(
                    Project.workspace_id == workspace.id,
                    Project.owner_id == current_user.id,
                )
                .delete(synchronize_session=False)
            )

    if delete_content_choice == "delete-all":
        activity_description = (
            "Workspace, projects, saved content, saved images, and versions "
            "were permanently deleted."
        )
    elif delete_content_choice == "workspace-only":
        activity_description = (
            "Workspace was deleted. Projects and saved content were kept."
        )
    else:
        activity_description = (
            "Workspace and projects were deleted. Saved content and saved images "
            "were preserved in the Content Library."
        )

    create_activity_log(
        db=db,
        current_user=current_user,
        action_type="Workspace Deleted",
        item_type="Workspace",
        item_id=workspace.id,
        title=f"{workspace.name} deleted",
        description=activity_description,
    )

    if delete_content_choice != "workspace-only":
        for project_snapshot in project_snapshots:
            create_activity_log(
                db=db,
                current_user=current_user,
                action_type="Project Deleted",
                item_type="Project",
                item_id=project_snapshot["id"],
                title=f"{project_snapshot['title']} deleted",
                description=(
                    f"Project was deleted when workspace {workspace_name} was deleted."
                ),
                project_id=project_snapshot["id"],
                project_name=project_snapshot["title"],
            )

    if delete_content_choice == "delete-all":
        for content_snapshot in content_snapshots:
            project_snapshot = next(
                (
                    project
                    for project in project_snapshots
                    if project["id"] == content_snapshot["project_id"]
                ),
                None,
            )

            create_activity_log(
                db=db,
                current_user=current_user,
                action_type="Content Deleted",
                item_type="Content",
                item_id=content_snapshot["id"],
                title=f"{content_snapshot['title']} deleted",
                description=(
                    f"Saved {content_snapshot['content_type']} content was deleted "
                    f"when workspace {workspace_name} was deleted."
                ),
                project_id=content_snapshot["project_id"],
                project_name=(
                    project_snapshot["title"]
                    if project_snapshot
                    else None
                ),
            )

        for logo_snapshot in logo_snapshots:
            project_snapshot = next(
                (
                    project
                    for project in project_snapshots
                    if project["id"] == logo_snapshot["project_id"]
                ),
                None,
            )

            create_activity_log(
                db=db,
                current_user=current_user,
                action_type="Logo Deleted",
                item_type="Logo",
                item_id=logo_snapshot["id"],
                title="Saved logo deleted",
                description=(
                    f"Saved logo was deleted when workspace {workspace_name} was deleted."
                ),
                project_id=logo_snapshot["project_id"],
                project_name=(
                    project_snapshot["title"]
                    if project_snapshot
                    else None
                ),
            )

    db.delete(workspace)
    db.commit()

    if delete_content_choice == "delete-all":
        return {
            "message": "Workspace, projects, saved content, saved images, and versions deleted successfully."
        }

    if delete_content_choice == "workspace-only":
        return {
            "message": "Workspace deleted successfully. Projects and saved content were kept."
        }

    return {
        "message": "Workspace and projects deleted successfully. Saved content was kept in the Content Library."
    }