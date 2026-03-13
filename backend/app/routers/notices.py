from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.models import Notice
from app.schemas.schemas import NoticeCreate, NoticeOut

router = APIRouter()

@router.post("/", response_model=NoticeOut, status_code=status.HTTP_201_CREATED)
def create_notice(notice: NoticeCreate, db: Session = Depends(get_db)):
    db_notice = Notice(**notice.model_dump())
    db.add(db_notice)
    db.commit()
    db.refresh(db_notice)
    return db_notice

@router.get("/", response_model=List[NoticeOut])
def get_notices(target_role: str = None, db: Session = Depends(get_db)):
    query = db.query(Notice).order_by(Notice.created_at.desc())
    if target_role:
        query = query.filter(Notice.target_role.in_([target_role, "all"]))
    return query.all()
