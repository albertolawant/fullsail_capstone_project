from fastapi import APIRouter, Depends, HTTPException
from openai import OpenAI

from app.core.config import settings
from app.models.user import User
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

router = APIRouter(
    prefix="/tabletop-creator",
    tags=["Tabletop Creator"]
)

client = OpenAI(api_key=settings.OPENAI_API_KEY)


@router.post("/generate-campaign", response_model=CampaignGenerateResponse)
def generate_campaign_content(
    request: CampaignGenerateRequest,
):
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="OpenAI API key is not configured."
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

    try:
        response = client.responses.create(
            model="gpt-4.1-mini",
            input=prompt,
        )

        return {
            "campaign_content": response.output_text
        }

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to generate campaign content."
        )
    
@router.post("/generate-npc", response_model=NPCGenerateResponse)
def generate_npc_content(
    request: NPCGenerateRequest,

):
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="OpenAI API key is not configured."
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

    try:
        response = client.responses.create(
            model="gpt-4.1-mini",
            input=prompt,
        )

        return {
            "npc_content": response.output_text
        }

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