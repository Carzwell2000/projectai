import numpy as np
import pytest
from pydantic import ValidationError

import main


def test_low_confidence_prediction_requires_insufficient_evidence(monkeypatch):
    monkeypatch.setattr(main, "resolve_symptoms", lambda value: ["fever"])

    def fake_predict_proba(_features):
        return np.array([[0.34, 0.33, 0.33]])

    monkeypatch.setattr(main.classifier, "predict_proba", fake_predict_proba)

    result = main.predict_assessment("fever", 37.0)

    assert result["status"] == "low_confidence"
    assert result["disease"] == "Insufficient evidence"
    assert result["confidence"] == 0.0
    assert result["recommendation"]


@pytest.mark.parametrize("gender", ["Male", "Other"])
def test_non_female_cannot_be_marked_pregnant(gender):
    with pytest.raises(ValidationError, match="Pregnancy status is only available for female patients"):
        main.AssessmentRequest(
            id="assessment-test",
            patientName="Test Patient",
            age=30,
            gender=gender,
            pregnant=True,
            temperature=36.8,
            bloodPressure="120/80",
            symptoms="mild cough",
        )
