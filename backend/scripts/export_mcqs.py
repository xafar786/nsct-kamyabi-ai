from backend.app.data_loader import export_workbook_to_files


if __name__ == "__main__":
    rows = export_workbook_to_files()
    print(f"Exported {len(rows)} MCQs.")
