from fastapi import APIRouter

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.get("/")
def auth_root():
    return {"message": "Authentication routes are working"}