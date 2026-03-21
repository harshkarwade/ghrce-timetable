import sys
import os
import traceback

# Set up paths
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
load_dotenv(env_path)

from app.core.database import SessionLocal
from app.models.models import Teacher

def test_seed():
    db = SessionLocal()
    try:
        print("Test Seeding...")
        # Add a dummy teacher for AI (Dept ID 5)
        t = Teacher(
            name="TEST TEACHER SSP",
            dept_id=5,
            designation="Professor TEST",
            specialization="TEST",
            max_load=18
        )
        db.add(t)
        db.commit()
        print("✅ COMMITTED")
    except Exception as e:
        db.rollback()
        print(f"❌ FAILED: {str(e)}")
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_seed()
