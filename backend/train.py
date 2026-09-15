
import os
import re
import sys
import warnings
import zipfile

import pandas as pd
import numpy as np
import joblib

from difflib import get_close_matches

from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler


warnings.filterwarnings("ignore")


# ============================================================
# CONFIGURATION
# ============================================================

DEFAULT_DATASET_PATH = os.path.join(
    os.path.expanduser("~"),
    "Desktop",
    "dataset_clean.csv",
)

FILE_PATH = os.path.abspath(
    sys.argv[1] if len(sys.argv) > 1 else DEFAULT_DATASET_PATH
)

TOP_N = 3

RANDOM_STATE = 42

MODEL_OUTPUT_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "disease_model.joblib",
)

CLEAN_DATASET_OUTPUT_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "dataset_clean.csv",
)


# ============================================================
# PROGRAM HEADER
# ============================================================

print()
print("=" * 80)
print("              PATIENT DISEASE ASSESSMENT SYSTEM")
print("                         XGBOOST")
print("=" * 80)


# ============================================================
# CHECK DATASET FILE
# ============================================================

print()
print("=" * 80)
print("CHECKING DATASET")
print("=" * 80)

print()

print(
    "Looking for:"
)

print(
    FILE_PATH
)


if not os.path.isfile(FILE_PATH):

    print()
    print("=" * 80)
    print("ERROR: DATASET NOT FOUND")
    print("=" * 80)

    print()

    print("The configured dataset file could not be found.")
    print("Expected columns: disease, symptoms, temperature, recommendation")
    print("Update FILE_PATH to the location of dataset.xlsx if needed.")

    raise SystemExit(1)


print()

print(
    "Dataset file found."
)


# ============================================================
# LOAD DATASET
# ============================================================

print()
print("=" * 80)
print("LOADING DATASET")
print("=" * 80)

try:

    if FILE_PATH.lower().endswith((".xlsx", ".xls")) or zipfile.is_zipfile(FILE_PATH):

        dataset = pd.read_excel(FILE_PATH)

    else:

        dataset = pd.read_csv(FILE_PATH)

except Exception as error:

    print()

    print(
        "ERROR READING CSV:"
    )

    print(
        error
    )

    input(
        "\nPress ENTER to exit..."
    )

    raise SystemExit


print()

print(
    "Dataset loaded successfully."
)

print()

print(
    "Dataset shape:",
    dataset.shape
)


# ============================================================
# CLEAN COLUMN NAMES
# ============================================================

dataset.columns = (

    dataset.columns
    .astype(str)
    .str.strip()
    .str.lower()

)

column_aliases = {
    "diseases": "disease",
    "common symptoms": "symptoms",
    "typical_temperature": "temperature",
    "typical temperature": "temperature",
    "recommendations": "recommendation",
    "recomendation": "recommendation",
    "recomendations": "recommendation",
}

dataset = dataset.rename(columns=column_aliases)

symptom_columns = sorted(
    column
    for column in dataset.columns
    if column.startswith("symptom_")
)

if symptom_columns and "symptoms" not in dataset.columns:
    dataset["symptoms"] = dataset[symptom_columns].fillna("").apply(
        lambda row: ",".join(
            str(value).strip()
            for value in row
            if str(value).strip()
        ),
        axis=1,
    )


print()
print("=" * 80)
print("DATASET COLUMNS")
print("=" * 80)

print()

for column in dataset.columns:

    print(
        "-",
        column
    )


# ============================================================
# REQUIRED COLUMNS
# ============================================================

required_columns = [

    "disease",
    "symptoms",
    "recommendation"

]


missing_columns = [

    column

    for column in required_columns

    if column not in dataset.columns

]


if len(missing_columns) > 0:

    print()
    print("=" * 80)
    print("ERROR: REQUIRED COLUMNS NOT FOUND")
    print("=" * 80)

    print()

    print(
        "Your dataset must contain:"
    )

    for column in required_columns:

        print(
            "-",
            column
        )

    print()

    print(
        "Missing columns:"
    )

    for column in missing_columns:

        print(
            "-",
            column
        )

    raise SystemExit(1)


if "temperature" not in dataset.columns:

    print()
    print("WARNING: No temperature column found in the dataset.")
    print("Training temperature values will default to 37.0 C.")
    dataset["temperature"] = 37.0


# ============================================================
# CLEAN DATA
# ============================================================

dataset["disease"] = (

    dataset["disease"]
    .fillna("")
    .astype(str)
    .str.strip()

)


dataset["symptoms"] = (

    dataset["symptoms"]
    .fillna("")
    .astype(str)
    .str.strip()

)


dataset["temperature"] = (

    dataset["temperature"]
    .fillna("")
    .astype(str)
    .str.strip()

)


dataset["recommendation"] = (

    dataset["recommendation"]
    .fillna("")
    .astype(str)
    .str.strip()

)


# ============================================================
# REMOVE EMPTY DISEASES
# ============================================================

dataset = dataset[
    dataset["disease"] != ""
].copy()


if len(dataset) == 0:

    print()

    print(
        "ERROR: No valid disease records found."
    )

    input(
        "\nPress ENTER to exit..."
    )

    raise SystemExit


# ============================================================
# NORMALIZE TEXT
# ============================================================

def normalize_text(text):

    if pd.isna(text):

        return ""

    text = str(text)

    text = text.lower()

    text = text.strip()

    text = text.replace(
        "_",
        " "
    )

    text = " ".join(
        text.split()
    )

    return text


# ============================================================
# SPLIT SYMPTOMS
# ============================================================

def split_symptoms(text):

    if pd.isna(text):

        return []


    text = str(text).strip()


    if text == "":

        return []


    parts = text.split(",")


    symptoms = []


    for part in parts:

        symptom = normalize_text(
            part
        )

        if symptom != "":

            symptoms.append(
                symptom
            )


    # Remove duplicates
    symptoms = list(
        dict.fromkeys(
            symptoms
        )
    )


    return symptoms


# ============================================================
# CREATE SYMPTOM LIST
# ============================================================

dataset["symptom_list"] = (

    dataset["symptoms"]
    .apply(split_symptoms)

)

# Remove repeated disease/symptom combinations before training.
dataset["symptom_signature"] = dataset["symptom_list"].apply(
    lambda symptoms: "|".join(sorted(set(symptoms)))
)
dataset = dataset[
    dataset["symptom_signature"] != ""
].drop_duplicates(
    subset=["disease", "symptom_signature"]
).copy()


# ============================================================
# GET ALL UNIQUE SYMPTOMS
# ============================================================

all_symptoms_set = set()


for symptom_list in dataset["symptom_list"]:

    for symptom in symptom_list:

        if symptom != "":

            all_symptoms_set.add(
                symptom
            )


all_symptoms = sorted(
    list(all_symptoms_set)
)


if len(all_symptoms) == 0:

    print()

    print(
        "ERROR: No symptoms were found."
    )

    print(
        "Check your symptoms column."
    )

    input(
        "\nPress ENTER to exit..."
    )

    raise SystemExit


# ============================================================
# SYMPTOM LOOKUP
# ============================================================

symptom_lookup = {}


for symptom in all_symptoms:

    normalized = normalize_text(
        symptom
    )

    symptom_lookup[
        normalized
    ] = symptom


# ============================================================
# TEMPERATURE CONVERSION
# ============================================================

def convert_temperature(value):

    """
    Converts temperature into a numeric value.

    Examples:

        38
        38.5
        38 C
        38°C
        38-40

    If a range is found, the average is used.
    """

    if pd.isna(value):

        return np.nan


    text = str(value).strip()


    if text == "":

        return np.nan


    numbers = re.findall(

        r"\d+(?:\.\d+)?",

        text

    )


    if len(numbers) == 0:

        return np.nan


    values = [

        float(number)

        for number in numbers

    ]


    if len(values) >= 2:

        return (
            values[0] +
            values[1]
        ) / 2


    return values[0]


dataset["temperature_numeric"] = (

    dataset["temperature"]
    .apply(
        convert_temperature
    )

)


# ============================================================
# TEMPERATURE INFORMATION
# ============================================================

valid_temperature_count = (

    dataset["temperature_numeric"]
    .notna()
    .sum()

)


print()
print("=" * 80)
print("TEMPERATURE DATA")
print("=" * 80)

print()

print(
    "Usable temperature records:",
    valid_temperature_count,
    "/",
    len(dataset)
)


# ============================================================
# TEMPERATURE MEDIAN
# ============================================================

if valid_temperature_count > 0:

    temperature_median = (

        dataset["temperature_numeric"]
        .median()

    )

else:

    temperature_median = 37.0


dataset["temperature_numeric"] = (

    dataset["temperature_numeric"]
    .fillna(
        temperature_median
    )

)


# ============================================================
# DISEASE LIST
# ============================================================

diseases = sorted(

    dataset["disease"].unique()

)

recommendations = (
    dataset.groupby("disease")["recommendation"]
    .first()
    .to_dict()
)


print()
print("=" * 80)
print("DISEASE INFORMATION")
print("=" * 80)

print()

print(
    "Number of diseases:",
    len(diseases)
)

print()

for number, disease in enumerate(

    diseases,

    start=1

):

    print(
        f"{number:3}. {disease}"
    )


# ============================================================
# CREATE SYMPTOM FEATURES
# ============================================================

print()
print("=" * 80)
print("CREATING MACHINE LEARNING FEATURES")
print("=" * 80)


X_symptoms = pd.DataFrame(

    0,

    index=dataset.index,

    columns=all_symptoms,

    dtype=float

)


for index, row in dataset.iterrows():

    symptom_list = row[
        "symptom_list"
    ]


    for symptom in symptom_list:

        if symptom in X_symptoms.columns:

            X_symptoms.at[
                index,
                symptom
            ] = 1


print()

print(
    "Symptom features:",
    len(all_symptoms)
)

dataset.drop(
    columns=["symptom_list", "symptom_signature", "temperature_numeric"],
    errors="ignore",
).to_csv(CLEAN_DATASET_OUTPUT_PATH, index=False)
print("Clean dataset saved:", CLEAN_DATASET_OUTPUT_PATH)


# ============================================================
# ADD TEMPERATURE FEATURE
# ============================================================

X = X_symptoms.copy()


X["patient_temperature"] = (

    dataset[
        "temperature_numeric"
    ]

)


Y = dataset[
    "disease"
]


print()

print(
    "Temperature feature added."
)

print(
    "Total features:",
    X.shape[1]
)


# ============================================================
# DISEASE COUNTS
# ============================================================

disease_counts = Y.value_counts()


print()
print("=" * 80)
print("DISEASE RECORD COUNTS")
print("=" * 80)

print()

for disease in diseases:

    print(

        f"{disease:<45}"
        f"{disease_counts[disease]}"

    )


# ============================================================
# ENCODE DISEASES
# ============================================================

disease_names = sorted(
    Y.unique()
)


disease_to_number = {

    disease: number

    for number, disease in enumerate(
        disease_names
    )

}


number_to_disease = {

    number: disease

    for disease, number in disease_to_number.items()

}


Y_encoded = Y.map(

    disease_to_number

).astype(int)


# ============================================================
# TRAIN / TEST SPLIT
# ============================================================

print()
print("=" * 80)
print("PREPARING TRAINING DATA")
print("=" * 80)


minimum_samples = disease_counts.min()


if minimum_samples >= 2:

    X_train, X_test, Y_train, Y_test = train_test_split(

        X,

        Y_encoded,

        test_size=0.20,

        random_state=RANDOM_STATE,

        stratify=Y_encoded

    )

else:

    print()

    print(
        "WARNING:"
    )

    print(
        "At least one disease has only one record."
    )

    print(
        "There are too few records per disease for a reliable split."
    )

    print(
        "Training on all records so every disease remains available."
    )


    X_train = X.copy()
    Y_train = Y_encoded.copy()
    X_test = X.copy()
    Y_test = Y_encoded.copy()


print()

print(
    "Training records:",
    len(X_train)
)

print(
    "Testing records:",
    len(X_test)
)


# ============================================================
# CREATE MODEL
# ============================================================

print()
print("=" * 80)
print("CREATING LOGISTIC REGRESSION MODEL")
print("=" * 80)


classifier = make_pipeline(
    StandardScaler(),
    LogisticRegression(
        C=2.0,
        class_weight="balanced",
        max_iter=3000,
        random_state=RANDOM_STATE,
    ),
)


print()

print(
    "Logistic regression model created."
)


# ============================================================
# TRAIN MODEL
# ============================================================

print()
print("=" * 80)
print("TRAINING LOGISTIC REGRESSION MODEL")
print("=" * 80)

print()

print(
    "Training..."
)


classifier.fit(

    X_train,

    Y_train

)


print()

print(
    "Training completed successfully."
)


# ============================================================
# MODEL EVALUATION
# ============================================================

train_prediction = classifier.predict(
    X_train
)


test_prediction = classifier.predict(
    X_test
)


training_accuracy = accuracy_score(

    Y_train,

    train_prediction

)


testing_accuracy = accuracy_score(

    Y_test,

    test_prediction

)

# Validate the intended low-connectivity workflow: each known symptom is sent
# alone and the model must still return a ranked disease comparison.
single_symptom_cases = []
for symptom in all_symptoms:
    single_case = pd.DataFrame(0.0, index=[0], columns=X.columns)
    single_case.at[0, symptom] = 1.0
    single_case.at[0, "patient_temperature"] = temperature_median
    probabilities = classifier.predict_proba(single_case)[0]
    ranked_indices = np.argsort(probabilities)[::-1][:TOP_N]
    single_symptom_cases.append({
        "symptom": symptom,
        "topDisease": disease_names[int(ranked_indices[0])],
        "predictions": [
            {"disease": disease_names[int(index)], "confidence": round(float(probabilities[index]), 4)}
            for index in ranked_indices
        ],
    })

single_symptom_top_predictions = sum(bool(case["topDisease"]) for case in single_symptom_cases)


print()
print("=" * 80)
print("MODEL PERFORMANCE")
print("=" * 80)

print()

print(
    "Training Accuracy:",
    f"{training_accuracy * 100:.2f}%"
)

print(
    "Testing Accuracy:",
    f"{testing_accuracy * 100:.2f}%"
)
print("Single-symptom cases ranked:", single_symptom_top_predictions, "/", len(single_symptom_cases))


# ============================================================
# SAVE MODEL ARTIFACT
# ============================================================

model_artifact = {
    "model": classifier,
    "feature_names": list(X.columns),
    "disease_names": disease_names,
    "recommendations": recommendations,
    "disease_to_number": disease_to_number,
    "number_to_disease": number_to_disease,
    "all_symptoms": all_symptoms,
    "temperature_feature": "patient_temperature",
    "model_version": "logistic-single-symptom-2",
    "single_symptom_cases": single_symptom_cases,
}

joblib.dump(
    model_artifact,
    MODEL_OUTPUT_PATH,
    compress=3,
)

print()
print(
    "Saved Joblib model:",
    MODEL_OUTPUT_PATH
)


# ============================================================
# CLASSIFICATION REPORT
# ============================================================

print()
print("=" * 80)
print("CLASSIFICATION REPORT")
print("=" * 80)

print()

try:

    print(

        classification_report(

            Y_test,

            test_prediction,

            labels=list(
                range(
                    len(disease_names)
                )
            ),

            target_names=disease_names,

            zero_division=0

        )

    )

except Exception:

    print(
        "Classification report unavailable."
    )


# ============================================================
# MODEL TRAINING COMPLETE
