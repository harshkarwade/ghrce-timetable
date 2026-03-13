from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.models import LeaveRequest
from app.schemas.schemas import LeaveRequestCreate, LeaveRequestOut, LeaveRequestUpdate

router = APIRouter()

@router.post("/", response_model=LeaveRequestOut, status_code=status.HTTP_201_CREATED)
def create_leave_request(leave: LeaveRequestCreate, teacher_id: int, db: Session = Depends(get_db)):
    db_leave = LeaveRequest(**leave.model_dump(), teacher_id=teacher_id)
    db.add(db_leave)
    db.commit()
    db.refresh(db_leave)
    return db_leave

@router.get("/", response_model=List[LeaveRequestOut])
def get_leave_requests(teacher_id: int = None, status: str = None, db: Session = Depends(get_db)):
    query = db.query(LeaveRequest)
    if teacher_id:
        query = query.filter(LeaveRequest.teacher_id == teacher_id)
    if status:
        query = query.filter(LeaveRequest.status == status)
    return query.all()

@router.put("/{leave_id}", response_model=LeaveRequestOut)
def update_leave_status(leave_id: int, update_data: LeaveRequestUpdate, db: Session = Depends(get_db)):
    db_leave = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not db_leave:
        raise HTTPException(status_code=404, detail="Leave request not found")
    
    db_leave.status = update_data.status
    db.commit()
    db.refresh(db_leave)
    
    return db_leave
