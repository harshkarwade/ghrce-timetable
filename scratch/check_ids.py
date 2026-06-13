import sqlite3
import os

db_path = r"c:\Users\ASUS\Downloads\GHRCE-AI-Timetable-v3\ghrce-timetable\backend\ghrce_v2.db"

conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT id, name FROM teachers WHERE id = 21")
print(f"Teacher 21: {cur.fetchone()}")

cur.execute("SELECT id, name FROM teachers WHERE name LIKE '%Achamma%'")
print(f"Achamma Thomas: {cur.fetchone()}")

conn.close()
