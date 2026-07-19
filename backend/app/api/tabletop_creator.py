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
    QuestGenerateRequest,
    QuestGenerateResponse, 
    EncounterGenerateRequest,
    EncounterGenerateResponse,
    LocationGenerateRequest,
    LocationGenerateResponse,
)
from app.services.ai_response_validation import validate_ai_response
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

        generated_text = validate_ai_response(
            generated_text=response.output_text,
            content_label="campaign content",
            required_sections=(
                "Campaign Overview",
                "World Setting",
                "Main Conflict",
                "Important Locations",
                "Key NPCs",
                "Starter Quest",
                "Possible Twists",
            ),
            minimum_length=200,
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
            "campaign_content": generated_text,
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

For each NPC, include these exact labeled sections:
1. Name
2. Role
3. Personality
4. Appearance
5. Motivation
6. Secret
7. Encounter
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

        generated_text = validate_ai_response(
            generated_text=response.output_text,
            content_label="NPC content",
            required_sections=(
                "Name",
                "Role",
                "Personality",
                "Appearance",
                "Motivation",
                "Secret",
                "Encounter",
            ),
            minimum_length=200,
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
            "npc_content": generated_text,
        }

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to generate NPC content."
        )
    
@router.post("/generate-quest", response_model=QuestGenerateResponse)
def generate_quest_content(
    request: QuestGenerateRequest,

):
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="OpenAI API key is not configured."
        )

    prompt = f"""
Create 3 tabletop quests or adventure hooks for the following campaign.

Campaign Name:
{request.campaign_name}

Campaign Description:
{request.campaign_description}

For each quest, include:
1. Quest Title
2. Quest Summary
3. Main Objective
4. Important NPCs
5. Key Location
6. Challenge or Encounter
7. Reward
8. Twist or Complication
"""

    try:
        response = client.responses.create(
            model="gpt-4.1-mini",
            input=prompt,
        )

        return {
            "quest_content": response.output_text
        }

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to generate quest content."
        )
    
@router.post("/generate-encounter", response_model=EncounterGenerateResponse)
def generate_encounter_content(
    request: EncounterGenerateRequest,

):
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="OpenAI API key is not configured."
        )

    prompt = f"""
Create 3 tabletop encounters for the following campaign.

Campaign Name:
{request.campaign_name}

Campaign Description:
{request.campaign_description}

For each encounter, include:
1. Encounter Name
2. Encounter Type
3. Location
4. Setup
5. Enemies or NPCs Involved
6. Objective
7. Challenge Details
8. Possible Player Choices
9. Reward or Consequence
"""

    try:
        response = client.responses.create(
            model="gpt-4.1-mini",
            input=prompt,
        )

        return {
            "encounter_content": response.output_text
        }

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to generate encounter content."
        )
    
@router.post("/generate-location", response_model=LocationGenerateResponse)
def generate_location_content(
    request: LocationGenerateRequest,

):
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="OpenAI API key is not configured."
        )

    prompt = f"""
Create 3 tabletop campaign locations or settings for the following campaign.

Campaign Name:
{request.campaign_name}

Campaign Description:
{request.campaign_description}

For each location, include:
1. Location Name
2. Location Type
3. Description
4. Atmosphere or Mood
5. Important NPCs or Factions
6. Key Features
7. Secrets or Hidden Details
8. Possible Encounters
9. Story Use
"""

    try:
        response = client.responses.create(
            model="gpt-4.1-mini",
            input=prompt,
        )

        return {
            "location_content": response.output_text
        }

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to generate location content."
        )
