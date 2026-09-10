from typing import Any

from fastapi import APIRouter, HTTPException

from main import ExplanationRequest, explain_assessment, predict_assessment

router = APIRouter(prefix="/api")


@router.post("/explain")
def explain(request: ExplanationRequest) -> dict[str, Any]:
    try:
        return explain_assessment(request.symptoms, request.temperature)
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


@router.post("/predict")
def predict(request: ExplanationRequest) -> dict[str, Any]:
    return predict_assessment(request.symptoms, request.temperature)
