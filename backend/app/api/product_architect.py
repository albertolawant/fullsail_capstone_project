from fastapi import APIRouter, Depends, HTTPException
from openai import OpenAI
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.core.config import settings
from app.db.database import get_db
from app.models.content import GeneratedContent
from app.models.project import Project
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.product_architect import (
    ProductArchitectRequest,
    ProductArchitectResponse,
)


router = APIRouter(
    prefix="/product-architect",
    tags=["Product Architect"],
)


def get_or_create_user_workspace(
    db: Session,
    current_user: User,
) -> Workspace:
    """
    Finds the authenticated user's first workspace.

    If the user does not have a workspace yet, a default workspace
    is automatically created for them.
    """
    workspace = (
        db.query(Workspace)
        .filter(Workspace.owner_id == current_user.id)
        .first()
    )

    if workspace:
        return workspace

    workspace = Workspace(
        name="My Workspace",
        owner_id=current_user.id,
    )

    try:
        db.add(workspace)
        db.commit()
        db.refresh(workspace)
        return workspace
    except Exception as error:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Could not create a workspace: {str(error)}",
        )


def get_or_create_user_project(
    db: Session,
    current_user: User,
    project_name: str,
    description: str,
) -> Project:
    """
    Finds a project with the same name owned by the authenticated user.

    If one does not exist, it automatically creates the project under
    the user's workspace.
    """
    cleaned_name = project_name.strip()
    cleaned_description = description.strip()

    if not cleaned_name:
        raise HTTPException(
            status_code=400,
            detail="Project name is required.",
        )

    if not cleaned_description:
        raise HTTPException(
            status_code=400,
            detail="Project description is required.",
        )

    project = (
        db.query(Project)
        .filter(
            Project.owner_id == current_user.id,
            Project.title == cleaned_name,
        )
        .first()
    )

    if project:
        # Update the saved description when the user changes it.
        if project.description != cleaned_description:
            project.description = cleaned_description

            try:
                db.commit()
                db.refresh(project)
            except Exception as error:
                db.rollback()

                raise HTTPException(
                    status_code=500,
                    detail=f"Could not update the project: {str(error)}",
                )

        return project

    workspace = get_or_create_user_workspace(
        db=db,
        current_user=current_user,
    )

    project = Project(
        title=cleaned_name,
        description=cleaned_description,
        workspace_id=workspace.id,
        owner_id=current_user.id,
    )

    try:
        db.add(project)
        db.commit()
        db.refresh(project)
        return project
    except Exception as error:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Could not create the project: {str(error)}",
        )


def generate_and_save_content(
    request: ProductArchitectRequest,
    title: str,
    content_type: str,
    prompt: str,
    db: Session,
    current_user: User,
):
    """
    Finds or creates a project owned by the authenticated user,
    generates the AI document, and saves it under that project.
    """
    project = get_or_create_user_project(
        db=db,
        current_user=current_user,
        project_name=request.project_name,
        description=request.description,
    )

    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="OpenAI API key is missing.",
        )

    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    try:
        response = client.responses.create(
            model="gpt-4.1-mini",
            input=prompt,
        )

        generated_text = response.output_text

        if not generated_text or not generated_text.strip():
            raise HTTPException(
                status_code=502,
                detail="The AI returned an empty response.",
            )

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail=f"AI generation failed: {str(error)}",
        )

    content = GeneratedContent(
        title=title,
        content_type=content_type,
        body=generated_text,
        project_id=project.id,
        owner_id=current_user.id,
    )

    try:
        db.add(content)
        db.commit()
        db.refresh(content)
        return content
    except Exception as error:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Could not save the generated content: {str(error)}",
        )


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
        request=request,
        title="Product Requirements Document",
        content_type="PRD",
        prompt=prompt,
        db=db,
        current_user=current_user,
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
        request=request,
        title="User Persona",
        content_type="User Persona",
        prompt=prompt,
        db=db,
        current_user=current_user,
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
        request=request,
        title="User Stories",
        content_type="User Stories",
        prompt=prompt,
        db=db,
        current_user=current_user,
    )


@router.post("/feature-list", response_model=ProductArchitectResponse)
def generate_feature_list(
    request: ProductArchitectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prompt = f"""
Create a feature recommendation list for this project.

Project Name: {request.project_name}
Description: {request.description}

Organize the recommended features into:
- MVP Features
- Alpha Features
- Beta Features
- Future Features

For each feature, briefly explain its purpose and value to the user.
"""

    return generate_and_save_content(
        request=request,
        title="Feature List",
        content_type="Feature List",
        prompt=prompt,
        db=db,
        current_user=current_user,
    )


@router.post(
    "/technical-architecture",
    response_model=ProductArchitectResponse,
)
def generate_technical_architecture(
    request: ProductArchitectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prompt = f"""
Create a detailed technical architecture recommendation for this project.

Project Name: {request.project_name}
Description: {request.description}

Include:
- Architecture Overview
- Recommended Frontend Technologies
- Recommended Backend Technologies
- Database Recommendation
- Authentication and Authorization
- API Design
- AI Integration
- Deployment and Hosting
- Security Considerations
- Scalability Considerations
- Suggested Folder Structure
- Data Flow

Make the recommendations realistic for the project's scope and explain
why each major technology is appropriate.
"""

    return generate_and_save_content(
        request=request,
        title="Technical Architecture",
        content_type="Technical Architecture",
        prompt=prompt,
        db=db,
        current_user=current_user,
    )