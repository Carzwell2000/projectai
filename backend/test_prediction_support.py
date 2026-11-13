import numpy as np
import pytest
from pydantic import ValidationError

import main


@pytest.mark.parametrize("symptoms", ["chest pain", "I have chest pain"])
def test_chest_pain_does_not_match_generic_pain(symptoms):
    assert main.resolve_symptoms(symptoms) == ["chest pain"]
    assert main.build_features(symptoms, 37.0).iloc[0]["pain"] == 0.0


def test_standalone_pain_remains_a_recognized_symptom():
    assert main.resolve_symptoms("pain") == ["pain"]


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


def test_explanation_finds_symptom_supported_candidates_beyond_top_five():
    raw_prediction = main.predict_assessment("headache", 38.0)
    result = main.explain_assessment("headache", 38.0, "120/90")

    assert result["recognizedSymptoms"] == ["headache"]
    assert "Malaria" not in {item["disease"] for item in raw_prediction["predictions"]}
    assert "Malaria" in {item["disease"] for item in result["predictedDiseases"]}
    assert any(
        feature["feature"] == "headache" and feature["direction"] == "supports"
        for disease in result["predictedDiseases"]
        for feature in disease["features"]
    )


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
