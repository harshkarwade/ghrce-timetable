from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import require_admin
from app.models.models import Batch
from pydantic import BaseModel
from typing import List

router = APIRouter()

class BatchCreate(BaseModel):
    name: str
    class_id: int

@router.get("/")
def get_batches(db: Session = Depends(get_db)):
    return db.query(Batch).all()

@router.get("/class/{class_id}")
def get_batches_by_class(class_id: int, db: Session = Depends(get_db)):
    return db.query(Batch).filter(Batch.class_id == class_id).all()

@router.post("/")
def create_batch(req: BatchCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    db_batch = Batch(**req.dict())
    db.add(db_batch)
    db.commit()
    db.refresh(db_batch)
    return db_batch

@router.delete("/{batch_id}")
def delete_batch(batch_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    db_batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not db_batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    db.delete(db_batch)
    db.commit()
    return {"message": "Deleted"}
