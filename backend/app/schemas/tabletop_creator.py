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

class TabletopImageGenerateRequest(BaseModel):
    project_id: Optional[int] = None
    campaign_name: Optional[str] = Field(default=None, max_length=100)
    campaign_description: Optional[str] = Field(default=None, max_length=5000)
    image_type: str = Field(..., min_length=2, max_length=100)
    image_prompt: str = Field(..., min_length=5, max_length=1500)
    use_campaign_context: bool = True


class TabletopImageGenerateResponse(BaseModel):
    image_base64: str
    image_type: str
    prompt: str

class TabletopImageSaveRequest(BaseModel):
    project_id: int
    image_base64: str = Field(..., min_length=10)
    image_type: str = Field(..., min_length=2, max_length=100)
    image_prompt: str = Field(..., min_length=1, max_length=1500)


class TabletopImageSaveResponse(BaseModel):
    id: int
    project_id: int
    image_type: str    