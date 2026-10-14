from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.user import User


OWNER_ROLE = "owner"
EDITOR_ROLE = "editor"
VIEWER_ROLE = "viewer"


def get_project_role(
    db: Session,
    project: Project,
    current_user: User,
) -> str | None:
    """
    Return the authenticated user's role for a project.

    The original Project.owner_id remains the authoritative owner.
    Shared users receive their role from project_members.
    """

    if project.owner_id == current_user.id:
        return OWNER_ROLE

    membership = (
        db.query(ProjectMember)
        .filter(
            ProjectMember.project_id == project.id,
            ProjectMember.user_id == current_user.id,
        )
        .first()
    )

    if not membership:
        return None

    return membership.role


def require_project_access(
    db: Session,
    project_id: int,
    current_user: User,
) -> tuple[Project, str]:
    """
    Owner, Editor, and Viewer may open/view the project.
    """

    project = (
        db.query(Project)
        .filter(Project.id == project_id)
        .first()
    )

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found",
        )

    role = get_project_role(
        db=db,
        project=project,
        current_user=current_user,
    )

    if role is None:
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this project",
        )

    return project, role


def require_project_edit_access(
    db: Session,
    project_id: int,
    current_user: User,
) -> tuple[Project, str]:
    """
    Owner and Editor may modify project/content data.
    Viewer is read-only.
    """

    project, role = require_project_access(
        db=db,
        project_id=project_id,
        current_user=current_user,
    )

    if role == VIEWER_ROLE:
        raise HTTPException(
            status_code=403,
            detail="Viewer access is read-only",
        )

    return project, role


def require_project_owner(
    db: Session,
    project_id: int,
    current_user: User,
) -> Project:
    """
    Only the original project owner may perform owner-only actions,
    such as deleting the project or managing members.
    """

    project = (
        db.query(Project)
        .filter(Project.id == project_id)
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
            detail="Only the project owner can perform this action",
        )

    return project