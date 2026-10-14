from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.db.database import get_db
from app.models.project_activity import ProjectActivity
from app.models.user import User
from app.schemas.project_activity import ProjectActivityResponse
from app.services.project_permissions import require_project_access


router = APIRouter(
    prefix="/projects",
    tags=["Project Activity"],
)


@router.get(
    "/{project_id}/activity",
    response_model=list[ProjectActivityResponse],
)
def get_project_activity(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_project_access(
        db=db,
        project_id=project_id,
        current_user=current_user,
    )

    activities = (
        db.query(ProjectActivity)
        .filter(ProjectActivity.project_id == project_id)
        .order_by(ProjectActivity.created_at.desc())
        .all()
    )

    return [
        ProjectActivityResponse(
            id=activity.id,
            project_id=activity.project_id,
            user_id=activity.user_id,
            username=activity.user.username if activity.user else None,
            action=activity.action,
            details=activity.details,
            created_at=activity.created_at,
        )
        for activity in activities
    ]