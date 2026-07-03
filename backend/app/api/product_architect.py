from fastapi import APIRouter, Depends, HTTPException
from openai import OpenAI
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.core.config import settings
from app.db.database import get_db
from app.models.content import GeneratedContent
from app.models.project import Project
from app.models.user import User
from app.schemas.product_architect import (
    ProductArchitectRequest,
    ProductArchitectResponse,
)


router = APIRouter(
    prefix="/product-architect",
    tags=["Product Architect"],
)


def generate_and_save_content(
    request: ProductArchitectRequest,
    title: str,
    content_type: str,
    prompt: str,
    db: Session,
    current_user: User,
):
    project = db.query(Project).filter(Project.id == request.project_id).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project.owner_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to generate content for this project",
        )

    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OpenAI API key is missing")

    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    try:
        response = client.responses.create(
            model="gpt-4.1-mini",
            input=prompt,
        )

        generated_text = response.output_text

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"AI generation failed: {str(error)}",
        )

    content = GeneratedContent(
        title=title,
        content_type=content_type,
        body=generated_text,
        project_id=request.project_id,
        owner_id=current_user.id,
    )

    db.add(content)
    db.commit()
    db.refresh(content)

    return content


@router.post("/prd", response_model=ProductArchitectResponse)
def generate_prd(
    request: ProductArchitectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prompt = f"""
Create a clear Product Requirements Document for this project.

Project Name: {request.project_name}
Description: {request.description}

Include:
- Overview
- Problem Statement
- Target Users
- Goals
- Core Features
- User Stories
- Functional Requirements
- Non-Functional Requirements
- Success Metrics
"""

    return generate_and_save_content(
        request,
        "Product Requirements Document",
        "PRD",
        prompt,
        db,
        current_user,
    )


@router.post("/persona", response_model=ProductArchitectResponse)
def generate_persona(
    request: ProductArchitectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prompt = f"""
Create a detailed user persona for this project.

Project Name: {request.project_name}
Description: {request.description}

Include:
- Name
- Background
- Goals
- Pain Points
- Needs
- Motivations
- How this product helps them
"""

    return generate_and_save_content(
        request,
        "User Persona",
        "User Persona",
        prompt,
        db,
        current_user,
    )


@router.post("/user-stories", response_model=ProductArchitectResponse)
def generate_user_stories(
    request: ProductArchitectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prompt = f"""
Create user stories for this project.

Project Name: {request.project_name}
Description: {request.description}

Use this format:
As a [type of user], I want [goal], so that [benefit].

Include at least 10 user stories.
"""

    return generate_and_save_content(
        request,
        "User Stories",
        "User Stories",
        prompt,
        db,
        current_user,
    )


@router.post("/feature-list", response_model=ProductArchitectResponse)
def generate_feature_list(
    request: ProductArchitectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prompt = f"""
Create a feature list for this project.

Project Name: {request.project_name}
Description: {request.description}

Organize features into:
- MVP Features
- Alpha Features
- Beta Features
- Future Features
"""

    return generate_and_save_content(
        request,
        "Feature List",
        "Feature List",
        prompt,
        db,
        current_user,
    )