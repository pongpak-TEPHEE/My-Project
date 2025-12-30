# backend/main.py
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

app = FastAPI()

# เปิดให้ Frontend (Port 5173) เรียกใช้ API ได้
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MOCK DATA (จำลองฐานข้อมูล) ---
rooms_db = [
    {"id": "26504", "name": "Computer Lab 1", "floor": 5, "capacity": 60, "status": "Available"},
    {"id": "26507", "name": "Computer Lab 2", "floor": 5, "capacity": 60, "status": "Busy"},
    {"id": "26304", "name": "Lecture Room 1", "floor": 3, "capacity": 50, "status": "Available"},
]

stats_db = {
    "total_rooms": 4,
    "pending_requests": 2,
    "approved_today": 1
}

# --- MODELS ---
class Room(BaseModel):
    id: str
    name: str
    floor: int
    capacity: int
    status: str

# --- API ENDPOINTS ---

@app.get("/")
def read_root():
    return {"message": "SCI KU SRC API is running"}

@app.get("/api/stats")
def get_dashboard_stats():
    return stats_db

@app.get("/api/rooms", response_model=List[Room])
def get_rooms():
    return rooms_db

@app.post("/api/upload-schedule")
async def upload_schedule(file: UploadFile = File(...)):
    # จำลองการรับไฟล์ (ในของจริงจะใช้ Pandas อ่าน Excel ตรงนี้)
    return {"filename": file.filename, "status": "Uploaded Successfully"}

@app.post("/api/rooms/{room_id}/book")
def book_room(room_id: str):
    # จำลองการจอง
    return {"message": f"Room {room_id} booking request submitted", "status": "Pending"}