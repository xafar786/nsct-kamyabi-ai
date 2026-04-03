from __future__ import annotations

import random
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from .auth import create_user, ensure_users_file, verify_user
from .data_loader import SUBJECT_CONFIG, grouped_question_counts, load_questions


app = FastAPI(title="NSCT Kamyabi AI API", version="1.0.0")
ROOT_DIR = Path(__file__).resolve().parents[2]
FRONTEND_DIST = ROOT_DIR / "frontend" / "dist"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AuthPayload(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=4, max_length=100)


class AnswerSubmission(BaseModel):
    questionId: int
    selected: Literal["A", "B", "C", "D"] | None = None


class TestSubmission(BaseModel):
    answers: list[AnswerSubmission]


QUESTIONS = load_questions()
QUESTION_MAP = {item["id"]: item for item in QUESTIONS}


@app.on_event("startup")
def startup_event() -> None:
    ensure_users_file()


@app.get("/api/health")
def health() -> dict:
    return {
        "status": "ok",
        "totalQuestions": len(QUESTIONS),
        "distribution": grouped_question_counts(QUESTIONS),
    }


@app.post("/api/signup")
def signup(payload: AuthPayload) -> dict:
    try:
        user = create_user(payload.username, payload.password)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    return {
        "message": "Account created successfully.",
        "user": user,
        "token": user["username"],
    }


@app.post("/api/login")
def login(payload: AuthPayload) -> dict:
    user = verify_user(payload.username, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password.")
    return {
        "message": "Login successful.",
        "user": user,
        "token": user["username"],
    }


@app.get("/api/criteria")
def criteria() -> dict:
    return {
        "criteria": [
            {
                "key": item["key"],
                "label": item["label"],
                "questionCount": item["count"],
                "weightPercent": item["count"],
            }
            for item in SUBJECT_CONFIG
        ]
    }


@app.get("/api/test")
def build_test() -> dict:
    selected_questions: list[dict] = []
    for item in SUBJECT_CONFIG:
        pool = [question for question in QUESTIONS if question["categoryKey"] == item["key"]]
        if len(pool) < item["count"]:
            raise HTTPException(
                status_code=500,
                detail=f"Not enough questions for {item['label']}. Required: {item['count']}.",
            )
        picks = random.sample(pool, item["count"])
        for question in picks:
            selected_questions.append(
                {
                    "id": question["id"],
                    "subject": question["subject"],
                    "topic": question["topic"],
                    "question": question["question"],
                    "options": question["options"],
                    "categoryKey": question["categoryKey"],
                    "categoryLabel": question["categoryLabel"],
                }
            )

    random.shuffle(selected_questions)
    return {
        "title": "NSCT Kamyabi AI Demo MCQs Test",
        "totalQuestions": len(selected_questions),
        "durationMinutes": 100,
        "questions": selected_questions,
    }


@app.post("/api/submit")
def submit_test(payload: TestSubmission) -> dict:
    answers_by_id = {entry.questionId: entry.selected for entry in payload.answers}
    total = 0
    correct = 0
    detailed_results: list[dict] = []
    category_totals: dict[str, dict] = {}

    for question_id, selected in answers_by_id.items():
        question = QUESTION_MAP.get(question_id)
        if not question:
            continue
        total += 1
        is_correct = (selected or "").upper() == question["answer"]
        if is_correct:
            correct += 1

        bucket = category_totals.setdefault(
            question["categoryKey"],
            {
                "label": question["categoryLabel"],
                "correct": 0,
                "total": 0,
            },
        )
        bucket["total"] += 1
        if is_correct:
            bucket["correct"] += 1

        detailed_results.append(
            {
                "questionId": question_id,
                "subject": question["subject"],
                "topic": question["topic"],
                "question": question["question"],
                "selected": selected,
                "correctAnswer": question["answer"],
                "explanation": question["explanation"],
                "isCorrect": is_correct,
                "options": question["options"],
            }
        )

    percentage = round((correct / total) * 100, 2) if total else 0.0
    return {
        "score": correct,
        "total": total,
        "percentage": percentage,
        "summary": sorted(category_totals.values(), key=lambda item: item["label"]),
        "results": detailed_results,
    }


@app.get("/{full_path:path}", include_in_schema=False)
def serve_frontend(full_path: str) -> FileResponse:
    if full_path.startswith("api"):
        raise HTTPException(status_code=404, detail="Not found.")

    requested_path = FRONTEND_DIST / full_path if full_path else FRONTEND_DIST / "index.html"
    if requested_path.exists() and requested_path.is_file():
        return FileResponse(requested_path)

    index_file = FRONTEND_DIST / "index.html"
    if index_file.exists():
        return FileResponse(index_file)

    raise HTTPException(
        status_code=404,
        detail="Frontend build not found. Run `npm run build` in the frontend directory.",
    )
