# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack internal tool for IC Constructora with two main modules:
1. **SharePoint Dashboard** — fetches Excel data from SharePoint via Microsoft Graph API and displays KPI charts
2. **Blueprint Analyzer** — AI-powered architectural blueprint analysis using Google Gemini (gemini-2.5-flash), with configurable inspection rules ("skills")

## Commands

### Frontend (React + Vite)
```bash
cd frontend
npm install          # install deps
npm run dev          # dev server (default: http://localhost:5173)
npm run build        # production build
npm run lint         # eslint
```

### Backend (Flask)
```bash
cd backend
# Requires Python 3.13 with venv at project root
source ../.venv/Scripts/activate   # Windows Git Bash
pip install flask flask-cors python-dotenv google-genai pillow pymupdf msal requests pandas openpyxl

python blueprint_server.py         # starts on http://0.0.0.0:5050
```

### Data utilities (run from project root)
```bash
python backend/sharepoint_client.py   # fetch SharePoint DataMart → frontend/public/datamart/
python backend/alert_system.py        # check KPIs and send email alerts
```

## Environment Variables

**Root `.env`** (used by frontend and sharepoint_client.py):
- `VITE_APP_USER` / `VITE_APP_PASS` — login credentials for the frontend `LoginPage`
- `SHAREPOINT_CLIENT_ID` / `SHAREPOINT_TENANT_ID` — MSAL app registration
- `ALERT_EMAIL_RECEIVER`, `SMTP_USER`, `SMTP_PASS` — email alerts via Office365

**`backend/.env`**:
- `GEMINI_API_KEY` — required for blueprint analysis and chat endpoints

## Architecture

### Frontend (`frontend/src/`)
- `App.jsx` — top-level router: `LoginPage` (simple credential check against env vars) → `Dashboard` or `BlueprintAnalysis`
- `components/Dashboard.jsx` — loads JSON files from `public/datamart/` and renders Recharts visualizations
- `components/BlueprintAnalysis.jsx` — uploads image/PDF to `/api/analyze-blueprint`, displays Gemini results with bounding-box overlays and a follow-up chat panel
- Styling via plain CSS classes in `index.css` (no Tailwind config despite `tailwind-merge` being installed)

### Backend (`backend/`)
- `blueprint_server.py` — Flask API server (port 5050). Key endpoints:
  - `POST /api/analyze-blueprint` — sends file + active skill rules to Gemini, returns structured JSON with `elementos_encontrados`, `restricciones_cruzadas`, bounding boxes, and cropped `snapshot` images (base64)
  - `GET/POST/PATCH/DELETE /api/skills/*` — CRUD for the skills hierarchy (directions → chapters → skills) persisted in `skills.json`
  - `POST /api/chat` — contextual Q&A using the last analysis result
- `skills.json` — flat-file database for inspection skill rules; structure: `{ directions: [{ id, name, chapters: [{ id, name, skills: [{ id, name, description, instructions[], active }] }] }] }`
- `sharepoint_client.py` — standalone script; authenticates via MSAL interactive browser flow, downloads Excel files from a SharePoint `DataMart` folder, exports them as JSON to `frontend/public/datamart/`
- `alert_system.py` — standalone script; reads exported JSON and sends SMTP alerts when KPIs fall below thresholds

### Data flow
SharePoint Excel → `sharepoint_client.py` → `frontend/public/datamart/*.json` → Dashboard charts

Blueprint image/PDF → frontend upload → Flask `/api/analyze-blueprint` → Gemini API → JSON result with bboxes → frontend overlay rendering
