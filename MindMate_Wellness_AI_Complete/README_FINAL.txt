MINDMATE AI — COMPLETE WELLNESS SUITE
=====================================

A local-first wellness dashboard that combines the experience patterns of:
- Strava-style activity tracking
- MyFitnessPal-style nutrition logging
- Headspace-style meditation sessions
- Sleep Cycle-style sleep logging and scoring
- Nike Training Club-style guided workout plans
- Flo-style period/ovulation estimates
- Yuka-style manual product health scoring
- BetterHelp-style supportive AI check-ins
- Samsung Health-style unified wellness overview
- MindMate AI conversation chat

IMPORTANT
---------
This project is a standalone demo/local tracker. It does NOT automatically
connect to private accounts on those services. Real account connections need
official APIs, OAuth consent, developer credentials, and each provider's
current terms/permissions.

RUN
---
1. Install Python 3.10+.
2. Install dependencies:
   pip install -r backend/requirements.txt
3. Install/start Ollama and pull the configured model (default: qwen2.5:3b).
4. Run:
   python backend/app.py
5. Open the local address printed by Flask.

DATA & PRIVACY
--------------
Tracking modules use browser localStorage in the included frontend.
The AI chat uses the local Ollama endpoint configured in backend/app.py.
No API keys are included.

MODULES
-------
Wellness Suite -> Overview, Activity, Nutrition, Meditate, Sleep, Train,
Cycle, Scan, Talk.

The endpoint /api/integrations reports the included integration states.
backend/api_reference.py documents an adapter contract for future official
API/import integrations.

HEALTH DISCLAIMER
-----------------
Cycle/ovulation dates are estimates only and are not contraception or medical
advice. Product scores are heuristic demos, not certified nutrition ratings.
The AI is a wellbeing companion and not a therapist, doctor, or emergency
service.
