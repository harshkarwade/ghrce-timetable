import requests
import json

login = requests.post("http://localhost:8000/api/auth/login", json={"email": "admin@ghrce.edu", "password": "admin123"})
if login.status_code != 200:
    print("Login failed")
    exit(1)

t = login.json().get("access_token")
r = requests.post(
    "http://localhost:8000/api/timetable/generate", 
    headers={"Authorization": "Bearer "+t}, 
    json={"semester_year":"2024-25","avoid_consecutive":True,"balance_load":True,"labs_afternoon":False,"max_per_day":3}
)

print("STATUS:", r.status_code)
with open("reproduce_err.txt", "w", encoding="utf-8") as f:
    f.write(r.text)
