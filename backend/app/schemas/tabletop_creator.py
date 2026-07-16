from pydantic import BaseModel, Field


class CampaignGenerateRequest(BaseModel):
    campaign_name: str = Field(min_length=1, max_length=100)
    campaign_description: str = Field(min_length=1, max_length=500)


class CampaignGenerateResponse(BaseModel):
    campaign_content: str

class NPCGenerateRequest(BaseModel):
    campaign_name: str = Field(min_length=1, max_length=100)
    campaign_description: str = Field(min_length=1, max_length=500)


class NPCGenerateResponse(BaseModel):
    npc_content: str