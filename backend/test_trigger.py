import sys
import os

backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(backend_dir)

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def run():
    print("Triggering Generation...")
    
    # We need to bypass auth, so we override dependency or use a mock token.
    # Actually, setting app.dependency_overrides is easier.
    from app.core.security import require_admin
    app.dependency_overrides[require_admin] = lambda: {"sub": "1", "role": "admin"}
    
    payload = {
        "semester_year": "2024-25",
        "department_id": None,
        "avoid_consecutive": True,
        "balance_load": True,
        "labs_afternoon": False,
        "max_per_day": 5
    }
    
    response = client.post("/api/timetable/generate", json=payload)
    print("Status Code:", response.status_code)
    try:
        data = response.json()
        print("Success:", data.get("success"))
        print("Slots Generated:", data.get("slots_generated"))
        print("Conflicts Resolved:", data.get("conflicts_resolved"))
        if not data.get("success"):
            with open("engine_logs.txt", "w") as f:
                f.write("\n".join(data.get("logs", [])))
            print("Response Logs (written to engine_logs.txt)")
            print("Response Data (Summary):", {k: v for k, v in data.items() if k != "logs"})
    except Exception as e:
        print("Failed to parse JSON. Text:", response.text)

if __name__ == "__main__":
    run()
