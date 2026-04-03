from __future__ import annotations

import csv
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[2]
USERS_CSV = ROOT_DIR / "backend" / "data" / "users.csv"


def ensure_users_file() -> None:
    USERS_CSV.parent.mkdir(parents=True, exist_ok=True)
    if USERS_CSV.exists():
        return
    with USERS_CSV.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=["username", "password"])
        writer.writeheader()
        writer.writerow({"username": "demo", "password": "demo123"})


def load_users() -> list[dict[str, str]]:
    ensure_users_file()
    with USERS_CSV.open("r", newline="", encoding="utf-8") as file:
        return list(csv.DictReader(file))


def find_user(username: str) -> dict[str, str] | None:
    normalized = username.strip().lower()
    for user in load_users():
        if user["username"].strip().lower() == normalized:
            return user
    return None


def create_user(username: str, password: str) -> dict[str, str]:
    ensure_users_file()
    if find_user(username):
        raise ValueError("Username already exists.")
    with USERS_CSV.open("a", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=["username", "password"])
        writer.writerow({"username": username.strip(), "password": password})
    return {"username": username.strip()}


def verify_user(username: str, password: str) -> dict[str, str] | None:
    user = find_user(username)
    if not user:
        return None
    if user["password"] != password:
        return None
    return {"username": user["username"]}
