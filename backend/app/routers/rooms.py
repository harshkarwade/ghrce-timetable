from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import require_admin, get_current_user
from app.models.models import Room
from app.schemas.schemas import RoomCreate, RoomOut

router = APIRouter()

@router.get("/", response_model=List[RoomOut])
def get_rooms(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(Room).all()

@router.post("/", response_model=RoomOut)
def create_room(data: RoomCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    room = Room(**data.dict())
    db.add(room)
    db.commit()
    db.refresh(room)
    return room

@router.delete("/{room_id}")
def delete_room(room_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    r = db.query(Room).filter(Room.id == room_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Room not found")
    db.delete(r)
    db.commit()
    return {"message": "Deleted"}

@router.put("/{room_id}", response_model=RoomOut)
def update_room(room_id: int, data: RoomCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    r = db.query(Room).filter(Room.id == room_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Room not found")
    for key, value in data.dict().items():
        setattr(r, key, value)
    db.commit()
    db.refresh(r)
    return r

