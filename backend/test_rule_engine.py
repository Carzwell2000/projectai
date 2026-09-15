from rule_engine import infer_triage


def test_difficulty_breathing_is_emergency():
    result = infer_triage(age=32, temperature=37.0, blood_pressure="120/80", symptoms="difficulty breathing")
    assert result.level == "emergency"


def test_severely_elevated_pressure_is_emergency():
    result = infer_triage(age=45, temperature=36.8, blood_pressure="190/125", symptoms="headache")
    assert result.level == "emergency"


def test_low_pressure_is_emergency():
    result = infer_triage(age=30, temperature=36.8, blood_pressure="85/55", symptoms="dizziness")
    assert result.level == "emergency"


def test_high_fever_in_child_is_urgent():
    result = infer_triage(age=3, temperature=39.0, blood_pressure="100/65", symptoms="fever")
    assert result.level == "urgent"


def test_stable_inputs_are_routine():
    result = infer_triage(age=30, temperature=36.8, blood_pressure="120/80", symptoms="mild cough")
    assert result.level == "routine"