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

class QuestGenerateRequest(BaseModel):
    campaign_name: str = Field(min_length=1, max_length=100)
    campaign_description: str = Field(min_length=1, max_length=500)


class QuestGenerateResponse(BaseModel):
    quest_content: str

class EncounterGenerateRequest(BaseModel):
    campaign_name: str = Field(min_length=1, max_length=100)
    campaign_description: str = Field(min_length=1, max_length=500)


class EncounterGenerateResponse(BaseModel):
    encounter_content: str

class LocationGenerateRequest(BaseModel):
    campaign_name: str = Field(min_length=1, max_length=100)
    campaign_description: str = Field(min_length=1, max_length=500)


class LocationGenerateResponse(BaseModel):
    location_content: str