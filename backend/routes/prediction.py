from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from main import ExplanationRequest, explain_assessment, for_staff_role, get_current_account, predict_assessment

router = APIRouter(prefix="/api")


@router.post("/explain")
def explain(
    request: ExplanationRequest,
    account: dict[str, str] = Depends(get_current_account),
) -> dict[str, Any]:
    try:
        response = explain_assessment(request.symptoms, request.temperature, request.bloodPressure)
        return for_staff_role(response, account["role"])
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


@router.post("/predict")
def predict(
    request: ExplanationRequest,
    account: dict[str, str] = Depends(get_current_account),
) -> dict[str, Any]:
    return for_staff_role(predict_assessment(request.symptoms, request.temperature), account["role"])
