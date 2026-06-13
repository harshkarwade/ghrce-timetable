import os
import sys
from collections import Counter

backend_dir = r"c:\Users\ASUS\Downloads\GHRCE-AI-Timetable-v3\ghrce-timetable\backend"
sys.path.append(backend_dir)

from app.core.database import SessionLocal
from app.models.models import Room, TimetableEntry

def check_rooms():
    db = SessionLocal()
    rooms = db.query(Room).all()
    entries = db.query(TimetableEntry).all()
    
    room_usage = Counter(e.room_id for e in entries)
    
    print(f"{'Room Name':<15} | {'Type':<10} | {'Slots Used'}")
    print("-" * 45)
    
    vacant_rooms = []
    
    for r in sorted(rooms, key=lambda x: (x.type, x.name)):
        used = room_usage.get(r.id, 0)
        print(f"{r.name:<15} | {r.type:<10} | {used}")
        if used == 0:
            vacant_rooms.append(r.name)
            
    print("-" * 45)
    print(f"Total Rooms: {len(rooms)}")
    print(f"Total Vacant Rooms: {len(vacant_rooms)}")
    if vacant_rooms:
        print(f"Vacant Rooms List: {', '.join(vacant_rooms)}")

if __name__ == "__main__":
    check_rooms()
