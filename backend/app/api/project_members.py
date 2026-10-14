from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.api.auth import get_current_user
from app.api.auth import is_user_online
from app.db.database import get_db
from app.models.project_member import ProjectMember
from app.models.user import User
from app.models.project_activity import ProjectActivity
from app.schemas.project_member import (
    ProjectMemberCreate,
    ProjectMemberListResponse,
    ProjectMemberResponse,
    ProjectMemberRoleUpdate,
)
from app.services.project_permissions import (
    require_project_access,
    require_project_owner,
)
from app.services.discord_webhook import send_discord_message


router = APIRouter(
    prefix="/projects",
    tags=["Project Members"],
)


@router.get(
    "/{project_id}/members",
    response_model=ProjectMemberListResponse,
)
def get_project_members(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project, role = require_project_access(
        db=db,
        project_id=project_id,
        current_user=current_user,
    )

    owner = (
        db.query(User)
        .filter(User.id == project.owner_id)
        .first()
    )

    memberships = (
        db.query(ProjectMember)
        .filter(ProjectMember.project_id == project_id)
        .all()
    )

    members = [
        ProjectMemberResponse(
            id=membership.id,
            user_id=membership.user_id,
            username=membership.user.username,
            email=membership.user.email,
            role=membership.role,
            created_at=membership.created_at,
            last_seen=membership.user.last_seen,
            is_online=is_user_online(membership.user),
        )
        for membership in memberships
    ]

    return ProjectMemberListResponse(
        owner_id=owner.id,
        owner_username=owner.username,
        owner_email=owner.email,
        owner_last_seen=owner.last_seen,
        owner_is_online=is_user_online(owner),
        members=members,
        current_user_role=role,
    )

@router.post(
    "/{project_id}/members",
    response_model=ProjectMemberResponse,
)
def add_project_member(
    project_id: int,
    member_data: ProjectMemberCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = require_project_owner(
        db=db,
        project_id=project_id,
        current_user=current_user,
    )

    role = member_data.role.strip().lower()

    if role not in {"editor", "viewer"}:
        raise HTTPException(
            status_code=400,
            detail="Role must be editor or viewer.",
        )

    identifier = member_data.user_identifier.strip()

    user = (
        db.query(User)
        .filter(
            or_(
                User.username == identifier,
                User.email == identifier,
            )
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found.",
        )

    if user.id == project.owner_id:
        raise HTTPException(
            status_code=400,
            detail="The project owner is already the owner of this project.",
        )

    existing_membership = (
        db.query(ProjectMember)
        .filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user.id,
        )
        .first()
    )

    if existing_membership:
        raise HTTPException(
            status_code=409,
            detail="This user is already a project member.",
        )

    membership = ProjectMember(
        project_id=project_id,
        user_id=user.id,
        role=role,
    )

    db.add(membership)
    db.flush()

    activity = ProjectActivity(
        project_id=project_id,
        user_id=current_user.id,
        action="member_added",
        details=(
            f"Added {user.username} to the project "
            f"as {role}."
        ),
    )

    db.add(activity)
    db.commit()
    db.refresh(membership)

    send_discord_message(
        f"👥 **{user.username}** was added to project "
        f"**{project.title}** as **{role}** "
        f"by **{current_user.username}**."
    )    

    return ProjectMemberResponse(
        id=membership.id,
        user_id=user.id,
        username=user.username,
        email=user.email,
        role=membership.role,
        created_at=membership.created_at,
        last_seen=user.last_seen,
        is_online=is_user_online(user),
    )

@router.put(
    "/{project_id}/members/{member_id}",
    response_model=ProjectMemberResponse,
)
def update_project_member_role(
    project_id: int,
    member_id: int,
    member_data: ProjectMemberRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = require_project_owner(
        db=db,
        project_id=project_id,
        current_user=current_user,
    )

    role = member_data.role.strip().lower()

    if role not in {"editor", "viewer"}:
        raise HTTPException(
            status_code=400,
            detail="Role must be editor or viewer.",
        )

    membership = (
        db.query(ProjectMember)
        .filter(
            ProjectMember.id == member_id,
            ProjectMember.project_id == project_id,
        )
        .first()
    )

    if not membership:
        raise HTTPException(
            status_code=404,
            detail="Project member not found.",
        )

    old_role = membership.role

    membership.role = role

    activity = ProjectActivity(
        project_id=project_id,
        user_id=current_user.id,
        action="member_role_changed",
        details=(
            f"Changed {membership.user.username}'s role "
            f"from {old_role} to {role}."
        ),
    )

    db.add(activity)
    db.commit()
    db.refresh(membership)

    send_discord_message(
        f"🔄 **{current_user.username}** changed "
        f"**{membership.user.username}** from **{old_role}** "
        f"to **{role}** on project **{project.title}**."
    )    

    return ProjectMemberResponse(
        id=membership.id,
        user_id=membership.user.id,
        username=membership.user.username,
        email=membership.user.email,
        role=membership.role,
        created_at=membership.created_at,
        last_seen=membership.user.last_seen,
        is_online=is_user_online(membership.user),
    )

@router.delete(
    "/{project_id}/members/{member_id}"
)
def remove_project_member(
    project_id: int,
    member_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = require_project_owner(
        db=db,
        project_id=project_id,
        current_user=current_user,
    )

    membership = (
        db.query(ProjectMember)
        .filter(
            ProjectMember.id == member_id,
            ProjectMember.project_id == project_id,
        )
        .first()
    )

    if not membership:
        raise HTTPException(
            status_code=404,
            detail="Project member not found.",
        )

    removed_username = membership.user.username
    removed_role = membership.role

    db.delete(membership)

    activity = ProjectActivity(
        project_id=project_id,
        user_id=current_user.id,
        action="member_removed",
        details=(
            f"Removed {removed_username} from the project "
            f"where they had the {removed_role} role."
        ),
    )

    db.add(activity)
    db.commit()

    send_discord_message(
        f"❌ **{current_user.username}** removed "
        f"**{removed_username}** from project "
        f"**{project.title}**. Their role was **{removed_role}**."
    )    

    return {
        "message": "Project member removed successfully."
    }