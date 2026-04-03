# NSCT Kamyabi AI

Blue-themed Python + React web app for students to practice a 100 MCQs demo test.

## Features

- Login and signup pages
- CSV-backed user storage in `backend/data/users.csv`
- MCQ import from `nsct mcqs bank.xlsx`
- 100-question test generation based on your criteria weights
- Instant scoring with explanations
- Dashboard with developer/about page
- Production setup where FastAPI serves the built React app

## Local Development

Install backend dependencies:

```powershell
python -m pip install -r backend\requirements.txt
```

Run backend:

```powershell
python -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

Run frontend:

```powershell
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` and proxies `/api` to `http://localhost:8000`.

## Production Build

Build the frontend:

```powershell
cd frontend
npm ci
npm run build
```

Then run the backend and it will serve both the API and the React app:

```powershell
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

## Railway Deployment

This repo includes:

- `railway.json`
- `Procfile`

Railway can deploy directly from GitHub. The configured flow builds the React frontend and starts the FastAPI app on `PORT`.

## GitHub Readiness

This repo now includes:

- Root `.gitignore`
- GitHub Actions CI workflow at `.github/workflows/ci.yml`

Suggested GitHub push commands:

```powershell
git init
git add .
git commit -m "Initial NSCT Kamyabi AI app"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

## Demo Login

- Username: `demo`
- Password: `demo123`

## Data Notes

- MCQs are exported into `backend/data/mcqs_bank.csv` and `backend/data/mcqs_bank.json`
- These generated files are ignored in git and can be recreated from the Excel workbook

To regenerate exported MCQs:

```powershell
python -m backend.scripts.export_mcqs
```
