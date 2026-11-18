@echo off
cd /d "%~dp0backend"
echo ==============================================
echo   DocuMind AI Backend Server (FastAPI)
echo   Listening on http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo ==============================================
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
