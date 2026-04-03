from __future__ import annotations

import csv
import json
import zipfile
from collections import defaultdict
from pathlib import Path
from xml.etree import ElementTree as ET


ROOT_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT_DIR / "backend" / "data"
WORKBOOK_PATH = ROOT_DIR / "nsct mcqs bank.xlsx"
CSV_PATH = DATA_DIR / "mcqs_bank.csv"
JSON_PATH = DATA_DIR / "mcqs_bank.json"

NS = {"main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}

SUBJECT_CONFIG = [
    {
        "key": "networks",
        "label": "Computer Networks and Cloud Computing",
        "count": 10,
        "subjects": ["Networks"],
    },
    {
        "key": "programming",
        "label": "Programming (C++/Java/Python)",
        "count": 10,
        "subjects": ["Programming"],
    },
    {
        "key": "dsa",
        "label": "Data Structures & Algorithms",
        "count": 10,
        "subjects": ["Data Structures"],
    },
    {
        "key": "os",
        "label": "Operating Systems",
        "count": 5,
        "subjects": ["OS"],
    },
    {
        "key": "software_engineering",
        "label": "Software Engineering",
        "count": 10,
        "subjects": ["Software Eng", "Software Engineering"],
    },
    {
        "key": "web_development",
        "label": "Web Development",
        "count": 10,
        "subjects": ["Web Dev", "Web Development"],
    },
    {
        "key": "ai_ml",
        "label": "AI / Machine Learning and Data Analytics",
        "count": 10,
        "subjects": ["AI ML"],
    },
    {
        "key": "cyber_security",
        "label": "Cyber Security",
        "count": 5,
        "subjects": ["Cyber Security"],
    },
    {
        "key": "databases",
        "label": "Databases",
        "count": 10,
        "subjects": ["Databases"],
    },
    {
        "key": "problem_solving",
        "label": "Problem Solving And Analytical Skills",
        "count": 20,
        "subjects": ["Problem Solving"],
    },
]

SUBJECT_LOOKUP = {
    subject: {"category_key": item["key"], "category_label": item["label"]}
    for item in SUBJECT_CONFIG
    for subject in item["subjects"]
}


def _shared_strings(archive: zipfile.ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in archive.namelist():
        return []
    root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
    values: list[str] = []
    for item in root.findall("main:si", NS):
        text = "".join(node.text or "" for node in item.iterfind(".//main:t", NS))
        values.append(text)
    return values


def _cell_value(cell: ET.Element, shared: list[str]) -> str:
    value = cell.find("main:v", NS)
    if value is None:
        return ""
    raw = value.text or ""
    if cell.attrib.get("t") == "s":
        return shared[int(raw)]
    return raw


def _normalize_row(values: list[str]) -> list[str]:
    expected_columns = 10
    if len(values) <= expected_columns:
        return values + [""] * (expected_columns - len(values))
    fixed = values[:9]
    fixed.append(",".join(values[9:]))
    return fixed


def export_workbook_to_files() -> list[dict]:
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(WORKBOOK_PATH) as archive:
        shared = _shared_strings(archive)
        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        relations = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        relation_map = {rel.attrib["Id"]: rel.attrib["Target"] for rel in relations}
        first_sheet = workbook.find("main:sheets", NS)[0]
        relation_id = first_sheet.attrib[
            "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
        ]
        sheet_path = "xl/" + relation_map[relation_id]
        sheet = ET.fromstring(archive.read(sheet_path))

    rows = sheet.findall(".//main:sheetData/main:row", NS)
    records: list[dict] = []

    for row in rows[1:]:
        values = [_cell_value(cell, shared) for cell in row.findall("main:c", NS)]
        normalized = _normalize_row(values)
        if len(normalized) < 10:
            continue

        subject = normalized[1].strip()
        category = SUBJECT_LOOKUP.get(subject)
        if not category:
            continue

        record = {
            "id": int(normalized[0]),
            "subject": subject,
            "topic": normalized[2].strip(),
            "question": normalized[3].strip(),
            "options": {
                "A": normalized[4].strip(),
                "B": normalized[5].strip(),
                "C": normalized[6].strip(),
                "D": normalized[7].strip(),
            },
            "answer": normalized[8].strip().upper(),
            "explanation": normalized[9].strip(),
            "categoryKey": category["category_key"],
            "categoryLabel": category["category_label"],
        }
        records.append(record)

    with CSV_PATH.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.writer(csv_file)
        writer.writerow(
            [
                "id",
                "subject",
                "topic",
                "question",
                "A",
                "B",
                "C",
                "D",
                "answer",
                "explanation",
                "categoryKey",
                "categoryLabel",
            ]
        )
        for item in records:
            writer.writerow(
                [
                    item["id"],
                    item["subject"],
                    item["topic"],
                    item["question"],
                    item["options"]["A"],
                    item["options"]["B"],
                    item["options"]["C"],
                    item["options"]["D"],
                    item["answer"],
                    item["explanation"],
                    item["categoryKey"],
                    item["categoryLabel"],
                ]
            )

    with JSON_PATH.open("w", encoding="utf-8") as json_file:
        json.dump(records, json_file, ensure_ascii=False, indent=2)

    return records


def load_questions() -> list[dict]:
    if JSON_PATH.exists():
        return json.loads(JSON_PATH.read_text(encoding="utf-8"))
    if not WORKBOOK_PATH.exists():
        raise FileNotFoundError(f"MCQ workbook not found: {WORKBOOK_PATH}")
    return export_workbook_to_files()


def grouped_question_counts(questions: list[dict]) -> dict[str, int]:
    counts: defaultdict[str, int] = defaultdict(int)
    for question in questions:
        counts[question["categoryKey"]] += 1
    return dict(counts)
