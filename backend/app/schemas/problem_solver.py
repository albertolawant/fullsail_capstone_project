from pydantic import BaseModel, Field


class ProblemSolverRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=100)
    description: str = Field(..., min_length=10, max_length=5000)
    context: str = Field(default="", max_length=2500)
    constraints: str = Field(default="", max_length=2500)


class ProblemSolverRegenerateRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=100)
    original_solution: str = Field(..., min_length=10, max_length=20000)
    instructions: str = Field(default="", max_length=2500)


class ProblemSolverResponse(BaseModel):
    solution: str