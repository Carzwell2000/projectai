# Evaluation Protocol

## Clinical agreement

The executable simulated-case evaluation is in `backend/test_clinical_rules.py`.
It covers 12 primary-care cases and checks that the rule engine identifies the
guideline target in at least 80% of cases. It also checks emergency red flags and
low systolic blood pressure.

Run it from the project root:

```powershell
python -c "import sys,unittest; sys.path.insert(0,'backend'); suite=unittest.defaultTestLoader.loadTestsFromName('test_clinical_rules'); raise SystemExit(not unittest.TextTestRunner(verbosity=2).run(suite).wasSuccessful())"
```

These are simulated cases, not real patient records. Before presenting clinical
accuracy as a study result, a supervisor or qualified clinician should review the
case labels against the current WHO and Zimbabwe Ministry of Health guidance.

## Usability study

Recruit at least five nursing students, clinical-officer students, or primary
healthcare workers who represent the intended users. Do not use real patient data.
Use a test device with the API unavailable for the offline tasks.

Each participant completes these tasks without coaching:

1. Register a simulated patient.
2. Record age, temperature, blood pressure, and at least two symptoms.
3. Interpret the triage level and identify the matched symptoms.
4. Complete an assessment while offline and confirm that it is saved locally.
5. Restore connectivity and confirm the pending encounter is synchronized.
6. Find the saved encounter in Patient records.

Record task completion, time per task, observed errors, and whether the
participant understood the urgent-warning state. Finish with the 10-item System
Usability Scale questionnaire and report the mean score across participants.

Do not treat the prototype as a diagnostic device. Participants must be told that
recommendations are decision support and require qualified clinical judgment.

## Requirement status

- Clinical knowledge base: implemented as 15 auditable rules in
  `backend/clinical_rules.py` and `offlineai/services/clinicalRules.ts`.
- Rule-based inference and triage: implemented and covered by executable tests.
- Android/mobile capture: implemented in `offlineai/app/Assess.tsx`.
- Offline storage and synchronization: implemented with Expo SQLite and retry
  synchronization; cloud rows use a pseudonymous encounter identifier.
- Five-user usability evaluation: protocol provided, field data still required.