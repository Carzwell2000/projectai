import unittest

from rule_engine import infer_triage


class ClinicalRuleAgreementTests(unittest.TestCase):
    CASES = (
        ("dangerous breathing", 30, 37.0, "120/80", "difficulty breathing", "emergency"),
        ("chest pain", 54, 36.8, "130/85", "chest pain", "emergency"),
        ("convulsion", 20, 37.0, "120/80", "convulsion", "emergency"),
        ("critical fever", 40, 40.2, "120/80", "fever", "emergency"),
        ("severe hypertension", 50, 36.8, "185/122", "headache", "emergency"),
        ("hypotension", 35, 36.8, "85/55", "dizziness", "emergency"),
        ("child fever", 3, 39.0, "100/65", "fever", "urgent"),
        ("older adult fever", 70, 38.6, "120/80", "fever", "urgent"),
        ("high fever", 30, 39.0, "120/80", "fever", "urgent"),
        ("stable cough", 30, 36.8, "120/80", "mild cough", "routine"),
        ("stable headache", 24, 36.7, "118/78", "mild headache", "routine"),
        ("stable nausea", 35, 37.1, "122/80", "mild nausea", "routine"),
    )

    def test_guideline_agreement_is_at_least_eighty_percent(self):
        matches = sum(
            infer_triage(age=age, temperature=temperature, blood_pressure=blood_pressure, symptoms=symptoms).level == expected
            for _, age, temperature, blood_pressure, symptoms, expected in self.CASES
        )
        self.assertGreaterEqual(matches / len(self.CASES), 0.8)


if __name__ == "__main__":
    unittest.main()