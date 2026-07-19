from fastapi import APIRouter, Depends, HTTPException
from openai import OpenAI
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.core.config import settings
from app.db.database import get_db
from app.models.project import Project
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.tabletop_creator import (
    CampaignGenerateRequest,
    CampaignGenerateResponse,
    NPCGenerateRequest,
    NPCGenerateResponse,
)
from app.services.ai_usage_service import log_ai_usage


router = APIRouter(
    prefix="/tabletop-creator",
    tags=["Tabletop Creator"],
)


def get_or_create_user_workspace(
    db: Session,
    current_user: User,
) -> Workspace:
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


def get_or_create_campaign_project(
    db: Session,
    current_user: User,
    campaign_name: str,
    campaign_description: str,
) -> Project:
    cleaned_name = campaign_name.strip()
    cleaned_description = campaign_description.strip()

    project = (
        db.query(Project)
        .filter(
            Project.owner_id == current_user.id,
            Project.title == cleaned_name,
        )
        .first()
    )

    if project:
        if project.description != cleaned_description:
            project.description = cleaned_description

            try:
                db.commit()
                db.refresh(project)

            except Exception:
                db.rollback()

                raise HTTPException(
                    status_code=500,
                    detail="The campaign project could not be updated.",
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

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="The campaign project could not be created.",
        )


@router.post(
    "/generate-campaign",
    response_model=CampaignGenerateResponse,
)
def generate_campaign_content(
    request: CampaignGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="The AI service is temporarily unavailable.",
        )

    project = get_or_create_campaign_project(
        db=db,
        current_user=current_user,
        campaign_name=request.campaign_name,
        campaign_description=request.campaign_description,
    )

    prompt = f"""
Create tabletop campaign content for the following campaign.

Campaign Name:
{request.campaign_name}

Campaign Description:
{request.campaign_description}

Return the response with these sections:
1. Campaign Overview
2. World Setting
3. Main Conflict
4. Important Locations
5. Key NPCs
6. Starter Quest
7. Possible Twists
"""

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
                detail="The AI did not return campaign content.",
            )

        log_ai_usage(
            db=db,
            user_id=current_user.id,
            project_id=project.id,
            feature_type="Campaign Generator",
            content_type="Campaign Content",
            status="success",
        )

        return {
            "campaign_content": generated_text.strip(),
        }

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to generate campaign content.",
        )


@router.post(
    "/generate-npc",
    response_model=NPCGenerateResponse,
)
def generate_npc_content(
    request: NPCGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="The AI service is temporarily unavailable.",
        )

    project = get_or_create_campaign_project(
        db=db,
        current_user=current_user,
        campaign_name=request.campaign_name,
        campaign_description=request.campaign_description,
    )

    prompt = f"""
Create 3 tabletop non-player characters for the following campaign.

Campaign Name:
{request.campaign_name}

Campaign Description:
{request.campaign_description}

For each NPC, include:
1. Name
2. Role in the campaign
3. Personality
4. Appearance
5. Motivation
6. Secret or hidden detail
7. How players may encounter them
"""

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
                detail="The AI did not return NPC content.",
            )

        log_ai_usage(
            db=db,
            user_id=current_user.id,
            project_id=project.id,
            feature_type="NPC Generator",
            content_type="NPC Content",
            status="success",
        )

        return {
            "npc_content": generated_text.strip(),
        }

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to generate NPC content.",
        )