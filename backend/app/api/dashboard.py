from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.db.database import get_db
from app.models.ai_usage import AIUsage
from app.models.project import Project
from app.models.user import User


router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)


@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project_count = (
        db.query(func.count(Project.id))
        .filter(Project.owner_id == current_user.id)
        .scalar()
        or 0
    )

    ai_usage_count = (
        db.query(func.count(AIUsage.id))
        .filter(AIUsage.user_id == current_user.id)
        .scalar()
        or 0
    )

    successful_ai_usage_count = (
        db.query(func.count(AIUsage.id))
        .filter(
            AIUsage.user_id == current_user.id,
            AIUsage.status == "success",
        )
        .scalar()
        or 0
    )

    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)

    recent_ai_activity = (
        db.query(AIUsage)
        .filter(
            AIUsage.user_id == current_user.id,
            AIUsage.created_at >= thirty_days_ago,
        )
        .order_by(AIUsage.created_at.desc())
        .first()
    )

    latest_ai_usage = (
        db.query(AIUsage)
        .filter(AIUsage.user_id == current_user.id)
        .order_by(AIUsage.created_at.desc())
        .first()
    )

    if recent_ai_activity:
        activity_status = "Active"
    elif project_count > 0 or ai_usage_count > 0:
        activity_status = "Inactive"
    else:
        activity_status = "New"

    return {
        "project_count": project_count,
        "ai_usage_count": ai_usage_count,
        "successful_ai_usage_count": successful_ai_usage_count,
        "activity_status": activity_status,
        "last_ai_activity": (
            latest_ai_usage.created_at.isoformat()
            if latest_ai_usage
            else None
        ),
    }