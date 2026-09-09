from fastapi import APIRouter, Depends, HTTPException

from openai import (
    APIConnectionError,
    APIError,
    APITimeoutError,
    AuthenticationError,
    OpenAI,
    RateLimitError,
)

from app.api.auth import get_current_user
from app.core.config import settings
from app.models.user import User
from app.schemas.problem_solver import (
    ProblemSolverRequest,
    ProblemSolverResponse,
)


router = APIRouter(
    prefix="/problem-solver",
    tags=["Problem Solver"],
)


def create_openai_client() -> OpenAI:
    return OpenAI(
        api_key=settings.OPENAI_API_KEY,
        timeout=30.0,
        max_retries=1,
    )


@router.post(
    "/analyze",
    response_model=ProblemSolverResponse,
)
def analyze_problem(
    request: ProblemSolverRequest,
    current_user: User = Depends(get_current_user),
):
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="The AI service is temporarily unavailable.",
        )

    title = request.title.strip()
    description = request.description.strip()
    context = request.context.strip()
    constraints = request.constraints.strip()

    context_text = context if context else "No additional context provided."
    constraints_text = (
        constraints if constraints else "No specific constraints provided."
    )

    prompt = f"""
You are Tanio AI's Problem Solver.

Analyze the user's problem carefully and provide a practical,
well-reasoned solution.

Problem Title:
{title}

Problem Description:
{description}

Additional Context:
{context_text}

Constraints:
{constraints_text}

Return the response in Markdown format.

Use these sections:

# Problem Summary

Briefly explain the problem and the key issue that needs to be solved.

# Analysis

Analyze the likely causes, important factors, tradeoffs, and challenges.

# Recommended Solution

Provide the strongest recommended approach and explain why it is appropriate.

# Action Plan

Provide clear, practical steps the user can follow to implement the solution.

# Alternative Approaches

Provide other reasonable approaches and explain when they may be preferable.

# Risks and Considerations

Identify important risks, limitations, dependencies, or consequences.

# Success Criteria

Explain how the user can determine whether the solution is working.

Keep the response specific to the user's problem. Avoid generic advice.
Respect the constraints provided by the user and do not invent missing facts.
"""

    client = create_openai_client()

    try:
        response = client.responses.create(
            model="gpt-4.1-mini",
            input=prompt,
        )

        generated_text = response.output_text

        if not generated_text or not generated_text.strip():
            raise HTTPException(
                status_code=502,
                detail="The AI did not return a solution. Please try again.",
            )

        return ProblemSolverResponse(
            solution=generated_text.strip(),
        )

    except APITimeoutError:
        raise HTTPException(
            status_code=504,
            detail="The AI request took too long. Please try again.",
        )

    except RateLimitError:
        raise HTTPException(
            status_code=429,
            detail=(
                "The AI service is receiving too many requests. "
                "Please wait a moment and try again."
            ),
        )

    except AuthenticationError:
        raise HTTPException(
            status_code=503,
            detail="The AI service is temporarily unavailable.",
        )

    except APIConnectionError:
        raise HTTPException(
            status_code=503,
            detail="Could not connect to the AI service. Please try again.",
        )

    except APIError:
        raise HTTPException(
            status_code=502,
            detail=(
                "The AI service could not complete the analysis. "
                "Please try again."
            ),
        )

    except HTTPException:
        raise

    except Exception as error:
        print(f"Problem Solver generation error: {error}")

        raise HTTPException(
            status_code=500,
            detail=(
                "An unexpected error occurred while analyzing the problem. "
                "Please try again."
            ),
        )