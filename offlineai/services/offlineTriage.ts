import type { TriageRecommendation } from "./api";

type OfflineTriageInput = {
  age: number;
  temperature: number;
  bloodPressure: string;
  symptoms: string;
};

export function inferOfflineTriage(input: OfflineTriageInput): TriageRecommendation {
  const pressure = input.bloodPressure.match(/^(\d{2,3})\/(\d{2,3})$/);
  const systolic = pressure ? Number(pressure[1]) : 0;
  const diastolic = pressure ? Number(pressure[2]) : 0;
  const rules: string[] = [];
  if (input.temperature >= 40 || input.temperature < 35) rules.push("critical temperature");
  if (systolic >= 180 || diastolic >= 120) rules.push("severely elevated blood pressure");
  if ((systolic > 0 && systolic < 90) || (diastolic > 0 && diastolic < 60)) rules.push("low blood pressure");
  if (rules.length) return { level: "emergency", action: "Refer immediately for emergency assessment and do not delay transfer.", rationale: `Possible danger sign: ${rules.join(", ")}.`, rules };
  const urgentRules: string[] = [];
  if (input.temperature >= 38.5) urgentRules.push("high fever");
  if (input.age < 5 || input.age >= 65) urgentRules.push("higher-risk age group");
  if (urgentRules.length) return { level: "urgent", action: "Assess promptly today, provide appropriate first-line care, and arrange referral if worsening.", rationale: `Needs same-day review because of ${urgentRules.join(", ")}.`, rules: urgentRules };
  return { level: "routine", action: "Continue routine assessment, provide guideline-based care, and give safety-net advice.", rationale: "No immediate danger sign was identified from the recorded inputs.", rules: [] };
}