# =============================================================================
# Water Drinking Check-in API  v5.3 (Bản Production - Đã thêm Lưu Ảnh Hậu Kiểm)
# Stack: FastAPI · SQLAlchemy · JWT · Anthropic Claude SDK
# =============================================================================

import io
import os
import base64
from datetime import datetime, timedelta, timezone
from typing import Annotated, Optional

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles  # 👇 THÊM ĐỂ PHỤC VỤ XEM ẢNH TRỰC TIẾP
from jose import JWTError, jwt
import bcrypt
from PIL import Image
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, relationship, sessionmaker

import anthropic

# Tự động nạp file .env nếu chạy ở máy cá nhân (Local)
if os.path.exists(".env"):
    from dotenv import load_dotenv
    load_dotenv()

# =============================================================================
# 1. Configuration (Lấy từ biến môi trường của Server)
# =============================================================================

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
DATABASE_URL   = os.getenv("DATABASE_URL")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM               = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

CHECKIN_VOLUME_ML = 250
CLAUDE_MODEL = "claude-haiku-4-5"
VISION_PROMPT     = (
    "Look wristwatch this image. Is there a glass of water, a water bottle, "
    "or someone drinking water in it? Reply ONLY with the word 'YES' or 'NO'."
)

# Tự động tạo thư mục lưu ảnh nếu chưa có
os.makedirs("uploads", exist_ok=True)

# =============================================================================
# 2. Database Configuration
# =============================================================================

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"
    id            = Column(Integer, primary_key=True, index=True)
    username      = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    checkins      = relationship("Checkin", back_populates="owner", cascade="all, delete-orphan")

class Checkin(Base):
    __tablename__ = "checkins"
    id        = Column(Integer, primary_key=True, index=True)
    user_id   = Column(Integer, ForeignKey("users.id"), nullable=False)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    volume_ml = Column(Integer, default=CHECKIN_VOLUME_ML, nullable=False)
    image_path = Column(String(255), nullable=True) # 👇 THÊM CỘT LƯU ĐƯỜNG DẪN ẢNH
    owner     = relationship("User", back_populates="checkins")

Base.metadata.create_all(bind=engine)

# =============================================================================
# 3. Security helpers
# =============================================================================

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

def hash_password(plain: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(plain.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    expire  = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=15))
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

# =============================================================================
# 4. FastAPI dependencies
# =============================================================================

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], db: Annotated[Session, Depends(get_db)]) -> User:
    invalid = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token không hợp lệ hoặc đã hết hạn.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload  = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        username: Optional[str] = payload.get("sub")
        if username is None:
            raise invalid
    except JWTError:
        raise invalid

    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise invalid
    return user

DbDep          = Annotated[Session, Depends(get_db)]
CurrentUserDep = Annotated[User,    Depends(get_current_user)]

# =============================================================================
# 5. Schemas & 6. App & 7. Routes
# =============================================================================

class UserCreateSchema(BaseModel):
    username: str
    password: str = Field(..., max_length=72)

class RegisterResponseSchema(BaseModel):
    message: str; username: str

class TokenSchema(BaseModel):
    access_token: str; token_type: str

class CheckinResponseSchema(BaseModel):
    success: bool; message: str; volume_ml: Optional[int] = None; timestamp: Optional[str] = None; image_url: Optional[str] = None

class HistoryItemSchema(BaseModel):
    id: int; timestamp: datetime; volume_ml: int; image_path: Optional[str] = None # 👇 TRẢ VỀ ĐƯỜNG DẪN ẢNH ĐỂ XEM
    model_config = ConfigDict(from_attributes=True)

app = FastAPI(title="Water Check-in API", version="5.3.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# 👇 PHÁT HÀNH THƯ MỤC ẢNH: Giúp sếp có thể truy cập ảnh qua URL trực tiếp từ trình duyệt
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/", tags=["Health"])
async def health_check():
    return {"status": "ok", "message": "Water Check-in API is running with Claude!"}

@app.post("/api/register", response_model=RegisterResponseSchema, status_code=201, tags=["Auth"])
async def register(body: UserCreateSchema, db: DbDep):
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=409, detail="Username đã tồn tại.")
    user = User(username=body.username, password_hash=hash_password(body.password))
    db.add(user)
    db.commit(); db.refresh(user)
    return RegisterResponseSchema(message="Đăng ký thành công!", username=user.username)

@app.post("/api/login", response_model=TokenSchema, tags=["Auth"])
async def login(form: Annotated[OAuth2PasswordRequestForm, Depends()], db: DbDep):
    user = db.query(User).filter(User.username == form.username).first()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Tên đăng nhập hoặc mật khẩu không đúng.")
    token = create_access_token(subject=user.username, expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    return TokenSchema(access_token=token, token_type="bearer")

@app.post("/api/checkin", response_model=CheckinResponseSchema, tags=["Check-in"])
async def create_checkin(current_user: CurrentUserDep, db: DbDep, image: UploadFile = File(...)):
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=422, detail="File phải là ảnh (jpg, png, …).")
    
    media_type = image.content_type
    if media_type not in ["image/jpeg", "image/png", "image/gif", "image/webp"]:
        media_type = "image/jpeg"
        
    raw_bytes = await image.read()
    base64_image = base64.b64encode(raw_bytes).decode("utf-8")

    try:
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        response = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=10,
            messages=[
                {"role": "user", "content": [
                    {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": base64_image}},
                    {"type": "text", "text": VISION_PROMPT}
                ]}
            ],
        )
        ai_answer = response.content[0].text.strip().upper()
        
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Claude API lỗi: {exc}")

    if "YES" not in ai_answer:
        raise HTTPException(status_code=400, detail={"success": False, "message": "Claude không thấy nước. Vui lòng chụp lại!"})

    now = datetime.now(timezone.utc)
    
    # 👇 THỰC HIỆN LƯU ẢNH: Tạo tên file độc bản theo ID user và mốc thời gian
    filename = f"user_{current_user.id}_{int(now.timestamp())}.jpg"
    filepath = os.path.join("uploads", filename)
    with open(filepath, "wb") as f:
        f.write(raw_bytes)
    
    # Lưu thông tin lưu trữ vào DB kèm cột image_path
    relative_url = f"/uploads/{filename}"
    checkin = Checkin(user_id=current_user.id, volume_ml=CHECKIN_VOLUME_ML, timestamp=now, image_path=relative_url)
    db.add(checkin)
    db.commit(); db.refresh(checkin)
    
    return CheckinResponseSchema(
        success=True, message="Check-in thành công!", 
        volume_ml=checkin.volume_ml, timestamp=now.strftime("%H:%M  %d/%m/%Y"),
        image_url=relative_url
    )

@app.get("/api/history", response_model=list[HistoryItemSchema], tags=["History"])
async def get_history(current_user: CurrentUserDep, db: DbDep):
    tz_vn = timezone(timedelta(hours=7))
    today_start = datetime.now(tz_vn).replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)

    return db.query(Checkin).filter(
        Checkin.user_id == current_user.id,
        Checkin.timestamp >= today_start,
        Checkin.timestamp < today_end
    ).order_by(Checkin.timestamp.desc()).all()

@app.get("/api/streak", tags=["Stats"])
async def get_streak(current_user: CurrentUserDep, db: DbDep):
    DAILY_GOAL = 2000 
    TARGET_90_PERCENT = DAILY_GOAL * 0.9
    
    tz_vn = timezone(timedelta(hours=7))
    all_checkins = db.query(Checkin).filter(Checkin.user_id == current_user.id).all()
    
    daily_volumes = {}
    for c in all_checkins:
        vn_date = c.timestamp.astimezone(tz_vn).date()
        daily_volumes[vn_date] = daily_volumes.get(vn_date, 0) + c.volume_ml
        
    today = datetime.now(tz_vn).date()
    streak = 0
    current_date = today
    
    while True:
        vol = daily_volumes.get(current_date, 0)
        if vol >= TARGET_90_PERCENT:
            streak += 1
            current_date -= timedelta(days=1)
        elif current_date == today:
            current_date -= timedelta(days=1)
        else:
            break
            
    return {"streak": streak}