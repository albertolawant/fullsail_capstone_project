from fastapi import FastAPI

from app.api import auth

app = FastAPI(title="Tanio AI API")

app.include_router(auth.router)


@app.get("/")
def root():
    return {"message": "Welcome to Tanio AI API"}