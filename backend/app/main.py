from fastapi import FastAPI
from app.models import user, workspace, project
from app.db.database import Base, engine

from app.api import auth, workspace as workspace_api

app = FastAPI(title="Tanio AI API")

Base.metadata.create_all(bind=engine)

app.include_router(auth.router)
app.include_router(workspace_api.router)


@app.get("/")
def root():
    return {"message": "Welcome to Tanio AI API"}