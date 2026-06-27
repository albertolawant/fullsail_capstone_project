from fastapi import FastAPI

app = FastAPI(title="Tanio AI API")


@app.get("/")
def root():
    return {"message": "Welcome to Tanio AI API"}