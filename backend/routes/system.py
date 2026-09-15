from typing import Any

import psycopg
from fastapi import APIRouter

from main import artifact, settings

router = APIRouter()


@router.get("/")
def root() -> dict[str, str]:
    return {
        "message": "Patient Assessment API is running.",
        "health": "/health",
        "docs": "/docs",
    }


@router.get("/health")
def health() -> dict[str, str]:
    database = "sqlite_and_postgres_configured" if settings.database_url and psycopg is not None else "sqlite"
    return {
        "status": "ok",
        "database": database,
        "modelVersion": artifact.get("model_version", "unknown"),
    }


@router.get("/api/model/catalog")
def model_catalog() -> dict[str, object]:
    """Expose the trained model vocabulary to clients without duplicating it."""
    return {
        "modelVersion": artifact.get("model_version", "unknown"),
        "diseases": sorted(artifact["disease_names"]),
        "symptoms": sorted(artifact["all_symptoms"]),
    }
