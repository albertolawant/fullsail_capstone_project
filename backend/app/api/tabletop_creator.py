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
from app.schemas.tabletop_creator import (
    CampaignGenerateRequest,
    CampaignGenerateResponse,
    EncounterGenerateRequest,
    EncounterGenerateResponse,
    LocationGenerateRequest,
    LocationGenerateResponse,
    NPCGenerateRequest,
    NPCGenerateResponse,
    QuestGenerateRequest,
    QuestGenerateResponse,
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


def save_generated_content(
    db: Session,
    current_user: User,
    project: Project,
    title: str,
    content_type: str,
    body: str,
) -> GeneratedContent:
    content = GeneratedContent(
        title=title,
        content_type=content_type,
        body=body,
        project_id=project.id,
        owner_id=current_user.id,
    )

    try:
        db.add(content)
        db.commit()
        db.refresh(content)
        return content
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="The generated content could not be saved.",
        )


def create_openai_client() -> OpenAI:
    return OpenAI(
        api_key=settings.OPENAI_API_KEY,
        timeout=30.0,
        max_retries=1,
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
You are an expert tabletop RPG world builder.

Generate rich and immersive campaign lore for the following campaign.

Campaign Name:
{request.campaign_name}

Campaign Description:
{request.campaign_description}

Return the response in Markdown format.

Include all of the following sections using these exact headings:

# Campaign Overview

Provide a clear summary of the campaign, its tone, genre, and central premise.

# World Lore

Describe the history of the world, including major past events, legends,
cultures, and important changes that shaped the setting.

# Current Political Situation

Describe the major kingdoms, governments, factions, guilds, religious groups,
or other powers currently influencing the world.

# Important Locations

Describe at least five interesting locations that players could explore.
Explain what makes each location important or memorable.

# Major Characters

Introduce important rulers, heroes, villains, faction leaders, or other NPCs
who influence the world and its ongoing events.

# Main Conflict

Explain the central threat, crisis, war, mystery, or other major conflict that
drives the campaign.

# Secrets and Mysteries

Provide hidden truths, ancient secrets, unanswered questions, or mysteries
that players could eventually discover.

# Adventure Hooks

Provide at least five different adventure hooks that could introduce players
to the world and its conflicts.

# Optional Future Storylines

Provide additional story ideas that the game master could expand into future
quests, campaign arcs, or major events.

Make the lore creative, detailed, consistent with the campaign description,
and useful for running a tabletop RPG campaign.
"""

    client = create_openai_client()

    try:
        response = client.responses.create(
            model="gpt-4.1-mini",
            input=prompt,
        )

        generated_text = validate_ai_response(
            generated_text=response.output_text,
            content_label="campaign lore",
            required_sections=(
                "Campaign Overview",
                "World Lore",
                "Current Political Situation",
                "Important Locations",
                "Major Characters",
                "Main Conflict",
                "Secrets and Mysteries",
                "Adventure Hooks",
                "Optional Future Storylines",
            ),
            minimum_length=500,
        )

        save_generated_content(
            db=db,
            current_user=current_user,
            project=project,
            title=f"{request.campaign_name.strip()} - Campaign Lore",
            content_type="Campaign Lore",
            body=generated_text,
        )

        log_ai_usage(
            db=db,
            user_id=current_user.id,
            project_id=project.id,
            feature_type="Campaign Lore Generator",
            content_type="Campaign Lore",
            status="success",
        )

        return {"campaign_content": generated_text}

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to generate campaign lore.",
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

Return the response in Markdown format.

For each NPC, include these exact labeled sections:
1. Name
2. Role
3. Personality
4. Appearance
5. Motivation
6. Secret
7. Encounter
"""

    client = create_openai_client()

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

        save_generated_content(
            db=db,
            current_user=current_user,
            project=project,
            title=f"{request.campaign_name.strip()} - NPCs",
            content_type="NPC Content",
            body=generated_text,
        )

        log_ai_usage(
            db=db,
            user_id=current_user.id,
            project_id=project.id,
            feature_type="NPC Generator",
            content_type="NPC Content",
            status="success",
        )

        return {"npc_content": generated_text}

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to generate NPC content.",
        )


@router.post(
    "/generate-quest",
    response_model=QuestGenerateResponse,
)
def generate_quest_content(
    request: QuestGenerateRequest,
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
Create 3 tabletop quests or adventure hooks for the following campaign.

Campaign Name:
{request.campaign_name}

Campaign Description:
{request.campaign_description}

Return the response in Markdown format.

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

    client = create_openai_client()

    try:
        response = client.responses.create(
            model="gpt-4.1-mini",
            input=prompt,
        )

        generated_text = validate_ai_response(
            generated_text=response.output_text,
            content_label="quest content",
            required_sections=(
                "Quest Title",
                "Quest Summary",
                "Main Objective",
                "Important NPCs",
                "Key Location",
                "Challenge or Encounter",
                "Reward",
                "Twist or Complication",
            ),
            minimum_length=200,
        )

        save_generated_content(
            db=db,
            current_user=current_user,
            project=project,
            title=f"{request.campaign_name.strip()} - Quests",
            content_type="Quest Content",
            body=generated_text,
        )

        log_ai_usage(
            db=db,
            user_id=current_user.id,
            project_id=project.id,
            feature_type="Quest Generator",
            content_type="Quest Content",
            status="success",
        )

        return {"quest_content": generated_text}

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to generate quest content.",
        )


@router.post(
    "/generate-encounter",
    response_model=EncounterGenerateResponse,
)
def generate_encounter_content(
    request: EncounterGenerateRequest,
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
Create 3 tabletop encounters for the following campaign.

Campaign Name:
{request.campaign_name}

Campaign Description:
{request.campaign_description}

Return the response in Markdown format.

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

    client = create_openai_client()

    try:
        response = client.responses.create(
            model="gpt-4.1-mini",
            input=prompt,
        )

        generated_text = validate_ai_response(
            generated_text=response.output_text,
            content_label="encounter content",
            required_sections=(
                "Encounter Name",
                "Encounter Type",
                "Location",
                "Setup",
                "Enemies or NPCs Involved",
                "Objective",
                "Challenge Details",
                "Possible Player Choices",
                "Reward or Consequence",
            ),
            minimum_length=200,
        )

        save_generated_content(
            db=db,
            current_user=current_user,
            project=project,
            title=f"{request.campaign_name.strip()} - Encounters",
            content_type="Encounter Content",
            body=generated_text,
        )

        log_ai_usage(
            db=db,
            user_id=current_user.id,
            project_id=project.id,
            feature_type="Encounter Generator",
            content_type="Encounter Content",
            status="success",
        )

        return {"encounter_content": generated_text}

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to generate encounter content.",
        )


@router.post(
    "/generate-location",
    response_model=LocationGenerateResponse,
)
def generate_location_content(
    request: LocationGenerateRequest,
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
Create 3 tabletop campaign locations or settings for the following campaign.

Campaign Name:
{request.campaign_name}

Campaign Description:
{request.campaign_description}

Return the response in Markdown format.

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

    client = create_openai_client()

    try:
        response = client.responses.create(
            model="gpt-4.1-mini",
            input=prompt,
        )

        generated_text = validate_ai_response(
            generated_text=response.output_text,
            content_label="location content",
            required_sections=(
                "Location Name",
                "Location Type",
                "Description",
                "Atmosphere or Mood",
                "Important NPCs or Factions",
                "Key Features",
                "Secrets or Hidden Details",
                "Possible Encounters",
                "Story Use",
            ),
            minimum_length=200,
        )

        save_generated_content(
            db=db,
            current_user=current_user,
            project=project,
            title=f"{request.campaign_name.strip()} - Locations",
            content_type="Location Content",
            body=generated_text,
        )

        log_ai_usage(
            db=db,
            user_id=current_user.id,
            project_id=project.id,
            feature_type="Location Generator",
            content_type="Location Content",
            status="success",
        )

        return {"location_content": generated_text}

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to generate location content.",
        )