from fastapi import APIRouter, Depends, HTTPException

from openai import (
    APIConnectionError,
    APIError,
    APITimeoutError,
    AuthenticationError,
    OpenAI,
    RateLimitError,
)

from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.core.config import settings
from app.db.database import get_db
from app.models.content import GeneratedContent
from app.models.product_logo import ProductLogo
from app.models.project import Project
from app.models.user import User
from app.models.workspace import Workspace
from app.models.activity_log import ActivityLog
from app.services.ai_usage_service import log_ai_usage
from app.schemas.product_architect import (
    ProductArchitectRequest,
    ProductArchitectResponse,
    ProductLogoGalleryResponse,
    ProductLogoRequest,
    ProductLogoResponse,
    ProductLogoUpdate,
)


router = APIRouter(
    prefix="/product-architect",
    tags=["Product Architect"],
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

def generate_project_summary(title: str, description: str | None) -> str:
    clean_title = title.strip()
    clean_description = description.strip() if description else ""

    if not clean_description:
        return (
            f"{clean_title} is a Tanio AI project for organizing generated "
            "content, planning details, and saved project materials."
        )

    try:
        client = OpenAI(
            api_key=settings.OPENAI_API_KEY,
            timeout=30.0,
            max_retries=1,
        )

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Write a short professional project summary. "
                        "Do not copy the user's description word for word. "
                        "Summarize the purpose of the project in 1-2 sentences. "
                        "Keep it clear, polished, and concise."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Project name: {clean_title}\n"
                        f"User description: {clean_description}"
                    ),
                },
            ],
            max_tokens=90,
            temperature=0.4,
        )

        summary = response.choices[0].message.content.strip()

        if summary:
            return summary

    except Exception as error:
        print("Project summary generation failed:", error)

    return (
        f"{clean_title} is a Tanio AI project focused on organizing and developing "
        "the ideas described by the user."
    )

def build_regeneration_context(
    request: ProductArchitectRequest,
) -> str:
    original_content = (request.original_content or "").strip()
    regeneration_instructions = (
        request.regeneration_instructions or ""
    ).strip()

    if not original_content:
        return ""

    instructions = (
        regeneration_instructions
        or (
            "Create an improved new version while keeping the original "
            "content, structure, and intent as consistent as possible."
        )
    )

    return f"""
Regeneration Request:

You are revising an existing version of this document.

Original Content:
--- BEGIN ORIGINAL CONTENT ---
{original_content}
--- END ORIGINAL CONTENT ---

Requested Changes:
{instructions}

Important:
- Follow the requested changes closely.
- Keep anything the user did not ask to change whenever possible.
- Return the complete revised document.
"""


def get_or_create_user_workspace(
    db: Session,
    current_user: User,
) -> Workspace:
    """
    Find the authenticated user's first workspace.

    If the user does not have a workspace, create a default workspace.
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

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="A workspace could not be created. Please try again.",
        )


def get_or_create_user_project(
    db: Session,
    current_user: User,
    project_name: str,
    description: str,
    project_id: int | None = None,
) -> Project:
    """
    Find a project with the same name owned by the authenticated user.

    If the project does not exist, create it under the user's workspace.
    """
    cleaned_name = project_name.strip()
    cleaned_description = description.strip()

    if project_id is not None:
        selected_project = (
            db.query(Project)
            .filter(
                Project.id == project_id,
                Project.owner_id == current_user.id,
            )
            .first()
        )

        if not selected_project:
            raise HTTPException(
                status_code=404,
                detail="Selected project was not found.",
            )

        if selected_project.description != cleaned_description or not selected_project.ai_summary:
            selected_project.description = cleaned_description
            selected_project.ai_summary = generate_project_summary(
                selected_project.title,
                cleaned_description,
            )

            try:
                db.commit()
                db.refresh(selected_project)

            except Exception:
                db.rollback()

                raise HTTPException(
                    status_code=500,
                    detail="The selected project could not be updated. Please try again.",
                )

        return selected_project

    if not cleaned_name:
        raise HTTPException(
            status_code=400,
            detail="Please enter a project name.",
        )

    if len(cleaned_name) < 2:
        raise HTTPException(
            status_code=400,
            detail="The project name must contain at least 2 characters.",
        )

    if not cleaned_description:
        raise HTTPException(
            status_code=400,
            detail="Please enter a project description.",
        )

    if len(cleaned_description) < 10:
        raise HTTPException(
            status_code=400,
            detail="The project description must contain at least 10 characters.",
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
        if project.description != cleaned_description or not project.ai_summary:
            project.description = cleaned_description
            project.ai_summary = generate_project_summary(
                cleaned_name,
                cleaned_description,
            )

            try:
                db.commit()
                db.refresh(project)

            except Exception:
                db.rollback()

                raise HTTPException(
                    status_code=500,
                    detail="The project could not be updated. Please try again.",
                )

        return project

    workspace = get_or_create_user_workspace(
        db=db,
        current_user=current_user,
    )

    project = Project(
        title=cleaned_name,
        description=cleaned_description,
        ai_summary=generate_project_summary(
            cleaned_name,
            cleaned_description,
        ),
        workspace_id=workspace.id,
        owner_id=current_user.id,
    )

    try:
        db.add(project)
        db.commit()
        db.refresh(project)
        return project

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="The project could not be created. Please try again.",
        )


def generate_and_save_content(
    request: ProductArchitectRequest,
    title: str,
    content_type: str,
    prompt: str,
    db: Session,
    current_user: User,
) -> GeneratedContent:
    """
    Find or create the authenticated user's project, generate an AI
    document, and save the document under that project.
    """
    project = get_or_create_user_project(
        db=db,
        current_user=current_user,
        project_name=request.project_name,
        description=request.description,
        project_id=request.project_id,
    )

    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="The AI service is temporarily unavailable.",
        )

    client = OpenAI(
        api_key=settings.OPENAI_API_KEY,
        timeout=30.0,
        max_retries=1,
    )

    try:
        response = client.responses.create(
            model="gpt-4.1-mini",
            input=prompt,
        )

        generated_text = response.output_text

        if not generated_text or not generated_text.strip():
            raise HTTPException(
                status_code=502,
                detail="The AI did not return any content. Please try again.",
            )

    except APITimeoutError:
        raise HTTPException(
            status_code=504,
            detail="The AI request took too long. Please try again.",
        )

    except RateLimitError:
        raise HTTPException(
            status_code=429,
            detail=(
                "The AI service is receiving too many requests. "
                "Please wait a moment and try again."
            ),
        )

    except AuthenticationError:
        raise HTTPException(
            status_code=503,
            detail="The AI service is temporarily unavailable.",
        )

    except APIConnectionError:
        raise HTTPException(
            status_code=503,
            detail="Could not connect to the AI service. Please try again.",
        )

    except APIError:
        raise HTTPException(
            status_code=502,
            detail=(
                "The AI service could not complete the request. "
                "Please try again."
            ),
        )

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=500,
            detail=(
                "An unexpected error occurred while generating content. "
                "Please try again."
            ),
        )

    content = GeneratedContent(
        title=title,
        content_type=content_type,
        body=generated_text.strip(),
        project_id=project.id,
        owner_id=current_user.id,
    )

    try:
        db.add(content)
        db.flush()

        create_activity_log(
            db=db,
            current_user=current_user,
            action_type="Content Created",
            item_type="Content",
            item_id=content.id,
            title=f"{content.title} created",
            description=f"{content.content_type} was generated in Product Architect.",
            project_id=project.id,
            project_name=project.title,
            new_project_id=project.id,
            new_project_name=project.title,
        )

        db.commit()
        db.refresh(content)

        log_ai_usage(
            db=db,
            user_id=current_user.id,
            project_id=project.id,
            feature_type="Product Architect",
            content_type=content_type,
            status="success",
        )

        return content

    except HTTPException:
        raise

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "The document was generated but could not be saved. "
                "Please try again."
            ),
        )


@router.post(
    "/prd",
    response_model=ProductArchitectResponse,
)
def generate_prd(
    request: ProductArchitectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prompt = f"""
Create a clear Product Requirements Document for this project.

Project Name: {request.project_name}

Description: {request.description}

{build_regeneration_context(request)}

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


@router.post(
    "/persona",
    response_model=ProductArchitectResponse,
)
def generate_persona(
    request: ProductArchitectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prompt = f"""
Create a detailed user persona for this project.

Project Name: {request.project_name}

Description: {request.description}

{build_regeneration_context(request)}

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


@router.post(
    "/user-stories",
    response_model=ProductArchitectResponse,
)
def generate_user_stories(
    request: ProductArchitectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prompt = f"""
Create user stories for this project.

Project Name: {request.project_name}

Description: {request.description}

{build_regeneration_context(request)}

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


@router.post(
    "/feature-list",
    response_model=ProductArchitectResponse,
)
def generate_feature_list(
    request: ProductArchitectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prompt = f"""
Create a feature recommendation list for this project.

Project Name: {request.project_name}

Description: {request.description}

{build_regeneration_context(request)}

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

{build_regeneration_context(request)}

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


@router.post(
    "/logo",
    response_model=ProductLogoResponse,
)
def generate_product_logo(
    request: ProductLogoRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="The AI image service is temporarily unavailable.",
        )

    cleaned_project_name = request.project_name.strip()
    cleaned_description = request.description.strip()

    project = get_or_create_user_project(
        db=db,
        current_user=current_user,
        project_name=cleaned_project_name,
        description=cleaned_description,
        project_id=request.project_id,
    )

    customization_instructions = []

    if request.style != "default":
        customization_instructions.append(
            f"- Visual style: {request.style}"
        )

    if request.preferred_colors.strip():
        customization_instructions.append(
            f"- Preferred colors: {request.preferred_colors.strip()}"
        )

    if request.logo_ideas.strip():
        customization_instructions.append(
            f"- Logo ideas or symbols: {request.logo_ideas.strip()}"
        )

    if request.branding_direction.strip():
        customization_instructions.append(
            f"- Branding direction: {request.branding_direction.strip()}"
        )

    customization_text = ""

    if customization_instructions:
        customization_text = f"""
User Customization:

{chr(10).join(customization_instructions)}

Follow the user's customization preferences while still producing
a professional and visually coherent logo.
"""

    prompt = f"""
Create a clean, professional logo for this product.

Product Name: {cleaned_project_name}

Product Description:

{cleaned_description}

Requirements:
- Modern, polished startup-style logo
- Simple and memorable design
- Suitable for a software or technology product
- Center the logo composition
- Minimal visual clutter
- Professional branding
- Include the product name only if it improves the logo
- Square composition

{customization_text}
"""

    client = OpenAI(
        api_key=settings.OPENAI_API_KEY,
        timeout=30.0,
        max_retries=1,
    )

    try:
        response = client.images.generate(
            model="gpt-image-2",
            prompt=prompt,
            size="1024x1024",
        )

        if not response.data:
            raise HTTPException(
                status_code=502,
                detail="The AI did not return a logo. Please try again.",
            )

        image_base64 = response.data[0].b64_json

        if not image_base64:
            raise HTTPException(
                status_code=502,
                detail="The AI did not return a valid logo. Please try again.",
            )

        saved_logo = ProductLogo(
            project_id=project.id,
            owner_id=current_user.id,
            image_base64=image_base64,
            style=request.style,
            preferred_colors=request.preferred_colors.strip(),
            logo_ideas=request.logo_ideas.strip(),
            branding_direction=request.branding_direction.strip(),
        )

        try:
            db.add(saved_logo)
            db.flush()

            create_activity_log(
                db=db,
                current_user=current_user,
                action_type="Logo Created",
                item_type="Logo",
                item_id=saved_logo.id,
                title=f"{project.title} logo created",
                description="A product logo was generated and saved.",
                project_id=project.id,
                project_name=project.title,
                new_project_id=project.id,
                new_project_name=project.title,
            )

            db.commit()
            db.refresh(saved_logo)

            log_ai_usage(
                db=db,
                user_id=current_user.id,
                project_id=project.id,
                feature_type="Logo Generator",
                content_type="Product Logo",
                status="success",
            )

        except HTTPException:
            raise

        except Exception:
            db.rollback()

            raise HTTPException(
                status_code=500,
                detail=(
                    "The logo was generated but could not be saved. "
                    "Please try again."
                ),
            )

        return ProductLogoResponse(
            id=saved_logo.id,
            project_id=saved_logo.project_id,
            image_base64=saved_logo.image_base64,
            style=saved_logo.style,
            preferred_colors=saved_logo.preferred_colors,
            logo_ideas=saved_logo.logo_ideas,
            branding_direction=saved_logo.branding_direction,
            created_at=saved_logo.created_at,
        )

    except APITimeoutError:
        raise HTTPException(
            status_code=504,
            detail="Logo generation took too long. Please try again.",
        )

    except RateLimitError:
        raise HTTPException(
            status_code=429,
            detail=(
                "Too many logo generation requests. "
                "Please wait a moment and try again."
            ),
        )

    except AuthenticationError:
        raise HTTPException(
            status_code=503,
            detail="The AI image service is temporarily unavailable.",
        )

    except APIConnectionError:
        raise HTTPException(
            status_code=503,
            detail="Could not connect to the AI image service. Please try again.",
        )

    except APIError:
        raise HTTPException(
            status_code=502,
            detail="The AI image service could not generate the logo. Please try again.",
        )

    except HTTPException:
        raise

    except Exception as error:
        print(f"Logo generation error: {error}")

        raise HTTPException(
            status_code=500,
            detail="Something went wrong while generating the logo. Please try again.",
        )


@router.get(
    "/logos/{project_id}",
    response_model=ProductLogoGalleryResponse,
)
def get_product_logo_gallery(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = (
        db.query(Project)
        .filter(
            Project.id == project_id,
            Project.owner_id == current_user.id,
        )
        .first()
    )

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found.",
        )

    logos = (
        db.query(ProductLogo)
        .filter(
            ProductLogo.project_id == project_id,
            ProductLogo.owner_id == current_user.id,
        )
        .order_by(
            ProductLogo.created_at.asc(),
            ProductLogo.id.asc(),
        )
        .all()
    )

    return ProductLogoGalleryResponse(
        logos=[
            ProductLogoResponse(
                id=logo.id,
                project_id=logo.project_id,
                image_base64=logo.image_base64,
                style=logo.style,
                preferred_colors=logo.preferred_colors,
                logo_ideas=logo.logo_ideas,
                branding_direction=logo.branding_direction,
                created_at=logo.created_at,
            )
            for logo in logos
        ]
    )

@router.put(
    "/logos/{logo_id}",
    response_model=ProductLogoResponse,
)
def update_product_logo(
    logo_id: int,
    logo_data: ProductLogoUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    logo = (
        db.query(ProductLogo)
        .filter(ProductLogo.id == logo_id)
        .first()
    )

    if not logo:
        raise HTTPException(
            status_code=404,
            detail="Logo not found.",
        )

    if logo.owner_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to update this logo.",
        )

    old_project = (
        db.query(Project)
        .filter(
            Project.id == logo.project_id,
            Project.owner_id == current_user.id,
        )
        .first()
    )

    new_project = (
        db.query(Project)
        .filter(
            Project.id == logo_data.project_id,
            Project.owner_id == current_user.id,
        )
        .first()
    )

    if not new_project:
        raise HTTPException(
            status_code=404,
            detail="Project not found.",
        )

    old_project_id = logo.project_id

    if old_project_id == new_project.id:
        return ProductLogoResponse(
            id=logo.id,
            project_id=logo.project_id,
            image_base64=logo.image_base64,
            style=logo.style,
            preferred_colors=logo.preferred_colors,
            logo_ideas=logo.logo_ideas,
            branding_direction=logo.branding_direction,
            created_at=logo.created_at,
        )

    try:
        logo.project_id = new_project.id

        create_activity_log(
            db=db,
            current_user=current_user,
            action_type="Logo Moved",
            item_type="Logo",
            item_id=logo.id,
            title=f"{new_project.title} logo moved",
            description=(
                f"Logo moved from "
                f"{old_project.title if old_project else 'Unknown Project'} "
                f"to {new_project.title}."
            ),
            project_id=new_project.id,
            project_name=new_project.title,
            old_project_id=old_project_id,
            old_project_name=old_project.title if old_project else None,
            new_project_id=new_project.id,
            new_project_name=new_project.title,
        )

        db.commit()
        db.refresh(logo)

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Logo could not be moved. Please try again.",
        )

    return ProductLogoResponse(
        id=logo.id,
        project_id=logo.project_id,
        image_base64=logo.image_base64,
        style=logo.style,
        preferred_colors=logo.preferred_colors,
        logo_ideas=logo.logo_ideas,
        branding_direction=logo.branding_direction,
        created_at=logo.created_at,
    )


@router.delete("/logos/{logo_id}")
def delete_product_logo(
    logo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    logo = (
        db.query(ProductLogo)
        .filter(ProductLogo.id == logo_id)
        .first()
    )

    if not logo:
        raise HTTPException(
            status_code=404,
            detail="Logo not found.",
        )

    if logo.owner_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to delete this logo.",
        )

    project = (
        db.query(Project)
        .filter(Project.id == logo.project_id)
        .first()
    )

    try:
        create_activity_log(
            db=db,
            current_user=current_user,
            action_type="Logo Deleted",
            item_type="Logo",
            item_id=logo.id,
            title=f"{project.title if project else 'Project'} logo deleted",
            description="A saved logo was permanently deleted.",
            project_id=logo.project_id,
            project_name=project.title if project else None,
        )

        db.delete(logo)
        db.commit()

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Logo could not be deleted. Please try again.",
        )

    return {"message": "Logo deleted permanently"}