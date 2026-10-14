from fastapi import APIRouter, Depends, HTTPException

from app.api.auth import get_current_user
from app.models.user import User
from app.services.discord_webhook import send_discord_message


router = APIRouter(
    prefix="/discord",
    tags=["Discord"],
)


@router.post("/test")
def test_discord_webhook(
    current_user: User = Depends(get_current_user),
):
    message = (
        f"Tanio AI Discord integration test from "
        f"{current_user.username}."
    )

    success = send_discord_message(message)

    if not success:
        raise HTTPException(
            status_code=503,
            detail="Discord webhook is not configured or could not be reached.",
        )

    return {
        "message": "Discord webhook test sent successfully."
    }