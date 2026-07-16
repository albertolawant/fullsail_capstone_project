from fastapi import APIRouter, Depends, HTTPException
from openai import OpenAI

from app.api.auth import get_current_user
from app.core.config import settings
from app.models.user import User
from app.schemas.tabletop_creator import (
    CampaignGenerateRequest,
    CampaignGenerateResponse,
    NPCGenerateRequest,
    NPCGenerateResponse,
)

router = APIRouter(
    prefix="/tabletop-creator",
    tags=["Tabletop Creator"]
)

client = OpenAI(api_key=settings.OPENAI_API_KEY)


@router.post("/generate-campaign", response_model=CampaignGenerateResponse)
def generate_campaign_content(
    request: CampaignGenerateRequest,
    current_user: User = Depends(get_current_user)
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
    current_user: User = Depends(get_current_user)
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