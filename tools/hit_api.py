import urllib.request
import urllib.error
import json

url = "https://ghrce-timetable.onrender.com/api/timetable/generate"
headers = {
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6ImFkbWluIiwiZXhwIjoxNzczODQ0MzI3fQ.EccWPTj-5BU596MuvQdObEDsv-La_py7bC1T0buZvFg",
    "Content-Type": "application/json"
}
data = {
    "semester_year": "2024-25",
    "avoid_consecutive": True,
    "balance_load": True,
    "labs_afternoon": False,
    "max_per_day": 5
}

req_body = json.dumps(data).encode("utf-8")
req = urllib.request.Request(url, data=req_body, headers=headers, method="POST")

try:
    with urllib.request.urlopen(req) as response:
        print(f"Status Code: {response.getcode()}")
        print("Response Body:")
        print(response.read().decode("utf-8"))
except urllib.error.HTTPError as e:
    print(f"HTTP Error: {e.code}")
    print("Response Body:")
    print(e.read().decode("utf-8"))
except Exception as e:
    print(f"Error: {e}")
