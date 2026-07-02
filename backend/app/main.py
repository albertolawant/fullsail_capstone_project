from fastapi import FastAPI
from app.models import user, workspace, project, content
from app.db.database import Base, engine
from app.models.content_version import ContentVersion
from app.api import ai

from app.api import auth, workspace as workspace_api, project as project_api, content as content_api, content_version as content_version_api

app = FastAPI(title="Tanio AI API")

Base.metadata.create_all(bind=engine)

app.include_router(auth.router)
app.include_router(workspace_api.router)
app.include_router(project_api.router)
app.include_router(content_api.router)
app.include_router(content_version_api.router)
app.include_router(ai.router)


@app.get("/")
def root():
    return {"message": "Welcome to Tanio AI API"}