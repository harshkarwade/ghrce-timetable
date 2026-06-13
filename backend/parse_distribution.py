import csv
import json
import os

csv_path = r'c:\Users\ASUS\Downloads\Subject Distribution.csv'
output_path = r'c:\Users\ASUS\Downloads\GHRCE-AI-Timetable-v3\ghrce-timetable\backend\subject_distribution.json'

data = []
current_faculty = None

with open(csv_path, mode='r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        # Forward-fill faculty name
        if row['Name of Faculty'] and row['Name of Faculty'].strip():
            current_faculty = row['Name of Faculty'].strip()
        
        if not current_faculty:
            continue
            
        # Basic filtering for empty rows
        if not row['Course'] or not row['Course'].strip():
            continue
            
        entry = {
            "faculty": current_faculty,
            "sem": row['Sem'],
            "section": row['Section'],
            "branch": row['Branch'],
            "code": row['Code'],
            "course": row['Course'],
            "theory": row['Theory'] or "0",
            "tutorial": row['Tutorial'] or "0",
            "practical": row['Practical'] or "0",
            "batch": row['Batch'],
            "total_load": row['Total Load'] or "0"
        }
        data.append(entry)

with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=4)

print(f"Parsed {len(data)} assignments to {output_path}")
