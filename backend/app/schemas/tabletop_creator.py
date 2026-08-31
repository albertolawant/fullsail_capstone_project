from pydantic import BaseModel, Field
from typing import Optional

class CampaignGenerateRequest(BaseModel):
    project_id: Optional[int] = None
    campaign_name: str = Field(
        ...,
        min_length=2,
        max_length=100,
    )
    campaign_description: str = Field(
        ...,
        min_length=10,
        max_length=5000,
    )

class CampaignGenerateResponse(BaseModel):
    campaign_content: str

class NPCGenerateRequest(BaseModel):
    project_id: Optional[int] = None
    campaign_name: str = Field(
        ...,
        min_length=2,
        max_length=100,
    )
    campaign_description: str = Field(
        ...,
        min_length=10,
        max_length=5000,
    )

class NPCGenerateResponse(BaseModel):
    npc_content: str

class QuestGenerateRequest(BaseModel):
    project_id: Optional[int] = None
    campaign_name: str = Field(..., min_length=1, max_length=100)
    campaign_description: str = Field(..., min_length=1, max_length=5000)

class QuestGenerateResponse(BaseModel):
    quest_content: str

class EncounterGenerateRequest(BaseModel):
    project_id: Optional[int] = None
    campaign_name: str = Field(..., min_length=1, max_length=100)
    campaign_description: str = Field(..., min_length=1, max_length=5000)

class EncounterGenerateResponse(BaseModel):
    encounter_content: str

class LocationGenerateRequest(BaseModel):
    project_id: Optional[int] = None
    campaign_name: str = Field(..., min_length=1, max_length=100)
    campaign_description: str = Field(..., min_length=1, max_length=5000)

class LocationGenerateResponse(BaseModel):
    location_content: str