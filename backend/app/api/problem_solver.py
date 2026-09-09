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

    context_text = (
        context
        if context
        else "No additional context provided."
    )

    constraints_text = (
        constraints
        if constraints
        else "No specific constraints provided."
    )

    prompt = f"""
You are Tanio AI's Problem Solver.

Your job is to analyze a user's problem carefully, break it down into its
important components, and provide several practical solutions.

Use the information provided by the user as the primary source of context.
Do not invent facts that were not provided. If important information is
missing or uncertain, clearly acknowledge that uncertainty.

Problem Title:
{title}

Problem Description:
{description}

Additional Context:
{context_text}

Constraints:
{constraints_text}

Return the response in Markdown format.

Use the following structure exactly:

# Problem Summary

Briefly summarize the problem in clear language and identify the main issue
that needs to be solved.

# Root Causes

Identify the most likely root causes contributing to the problem.

For each root cause:
- Explain why it may be contributing to the problem.
- Distinguish between confirmed information and reasonable assumptions.
- Do not present assumptions as facts.

# Key Factors

Identify the most important factors that could affect the outcome.

Consider factors such as:
- Resources
- Time
- Cost
- People or stakeholders
- Technical limitations
- Operational limitations
- Dependencies
- Risks
- Constraints provided by the user

Only include factors that are relevant to the specific problem.

# Possible Solutions

Generate at least 3 practical solution options when the problem reasonably
allows multiple approaches.

For each solution, use this format:

## Solution 1: [Solution Name]

### Approach

Explain how this solution would address the problem.

### Pros

List the main advantages of this solution.

### Cons

List the main disadvantages, tradeoffs, or limitations of this solution.

### Best Fit

Explain when this solution would be the most appropriate choice.

Repeat the same structure for each additional solution.

If the problem does not reasonably support 3 distinct solutions, provide
the strongest realistic alternatives instead of inventing weak options.

# Solution Comparison

Compare the proposed solutions directly.

Discuss the most important differences between them, including relevant
tradeoffs such as:
- Effectiveness
- Difficulty
- Cost
- Time
- Risk
- Resources required
- Long-term impact

Focus only on comparison criteria that are relevant to the user's problem.

# Recommended Solution

Recommend the strongest solution based on the user's problem, context,
and constraints.

Clearly explain:
- Why this option is recommended
- Why it is stronger than the alternatives
- Which user constraints influenced the recommendation

# Action Plan

Provide clear and practical next steps.

Use a numbered list and organize the steps in a logical order.

Each step should be specific enough that the user understands what action
to take next.

# Risks and Considerations

Identify important risks, limitations, dependencies, or possible
consequences associated with the recommended solution.

Where useful, explain how the user can reduce or manage those risks.

# Success Criteria

Explain how the user can evaluate whether the recommended solution is
working.

Provide specific and practical indicators of success when possible.

General requirements:

- Keep the response organized and easy to understand.
- Stay specific to the user's actual problem.
- Avoid generic advice when more specific guidance can be provided.
- Respect all constraints supplied by the user.
- Do not invent missing facts.
- Clearly distinguish facts from assumptions.
- Consider realistic tradeoffs between solutions.
- Prefer practical and actionable recommendations.
- Adapt the analysis to different types of problems without requiring
  manual prompt changes.
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