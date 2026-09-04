"""API-ready integration reference for MindMate Wellness Suite.

This module deliberately contains no credentials and makes no claims of live
third-party connectivity. Add official OAuth/API adapters here only after the
user authorizes the relevant service and you have valid developer credentials.
"""

INTEGRATION_CONTRACT = {
    "activity": {"provider": "Strava", "fields": ["date", "type", "distance_km", "duration_min"]},
    "nutrition": {"provider": "MyFitnessPal-compatible import", "fields": ["date", "meal", "food", "calories", "protein_g", "carbs_g", "fat_g"]},
    "sleep": {"provider": "Sleep data import", "fields": ["date", "bedtime", "wake_time", "hours", "quality"]},
    "training": {"provider": "Workout plan import", "fields": ["date", "plan", "exercise", "completed"]},
    "cycle": {"provider": "Cycle tracker import", "fields": ["date", "period", "symptoms"]},
    "scan": {"provider": "Product database import", "fields": ["barcode", "name", "ingredients", "nutrition"]}
}
