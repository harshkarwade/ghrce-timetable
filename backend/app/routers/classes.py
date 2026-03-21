from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import require_admin
from app.models.models import Class
from pydantic import BaseModel

router = APIRouter()

class ClassCreate(BaseModel):
    name: str
    dept_id: int
    semester: int
    strength: int = 60

class ClassUpdate(BaseModel):
    name: str = None
    dept_id: int = None
    semester: int = None
    strength: int = None

@router.get("/")
def get_classes(db: Session = Depends(get_db)):
    return db.query(Class).all()

@router.post("/")
def create_class(req: ClassCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    num_sections = max(1, (req.strength + 59) // 60)
    
    if num_sections == 1:
        db_class = Class(**req.dict())
        db.add(db_class)
        db.commit()
        db.refresh(db_class)
        return db_class
    else:
        first_class = None
        for i in range(num_sections):
            sec_letter = chr(65 + i) # A, B, C...
            cls_data = req.dict()
            cls_data["name"] = f"{req.name}-{sec_letter}"
            cls_data["strength"] = 60 # distribute evenly
            
            db_class = Class(**cls_data)
            db.add(db_class)
            if i == 0:
                first_class = db_class
                
        db.commit()
        db.refresh(first_class)
        return first_class

@router.put("/{class_id}")
def update_class(class_id: int, req: ClassUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
    db_class = db.query(Class).filter(Class.id == class_id).first()
    if not db_class:
        raise HTTPException(status_code=404, detail="Class not found")
    for key, value in req.dict(exclude_unset=True).items():
        if value is not None:
            setattr(db_class, key, value)
    db.commit()
    db.refresh(db_class)
    return db_class

@router.delete("/{class_id}")
def delete_class(class_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    db_class = db.query(Class).filter(Class.id == class_id).first()
    if not db_class:
        raise HTTPException(status_code=404, detail="Class not found")
    db.delete(db_class)
    db.commit()
    return {"message": "Deleted"}
