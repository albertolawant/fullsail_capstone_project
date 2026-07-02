from fastapi import APIRouter, Depends, HTTPException
from openai import OpenAI
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.core.config import settings
from app.db.database import get_db
from app.models.content import GeneratedContent
from app.models.project import Project
from app.models.user import User
from app.schemas.ai import AIGenerateRequest, AIGenerateResponse


router = APIRouter(
    prefix="/ai",
    tags=["AI"],
)


@router.post("/generate", response_model=AIGenerateResponse)
def generate_ai_content(
    request: AIGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = (
        db.query(Project)
        .filter(Project.id == request.project_id)
        .first()
    )

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project.owner_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to generate content for this project",
        )

    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="OpenAI API key is missing",
        )

    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    try:
        response = client.responses.create(
            model="gpt-4.1-mini",
            input=request.prompt,
        )

        generated_text = response.output_text

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"AI generation failed: {str(error)}",
        )

    content = GeneratedContent(
        title=request.title,
        content_type=request.content_type,
        body=generated_text,
        project_id=request.project_id,
        owner_id=current_user.id,
    )

    db.add(content)
    db.commit()
    db.refresh(content)

    return content