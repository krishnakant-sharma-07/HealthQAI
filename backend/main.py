from fastapi import FastAPI, Form, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Optional
import logging
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import secrets
import joblib
import numpy as np
import os

# Initialize logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Security configurations
SECRET_KEY = secrets.token_hex(32)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Mock user database
fake_users_db = {
    "doctor": {
        "username": "doctor",
        "hashed_password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",
        "disabled": False,
        "role": "doctor"
    },
    "patient": {
        "username": "patient",
        "hashed_password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",
        "disabled": False,
        "role": "patient"
    }
}

# Security setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

app = FastAPI(title="HealthQAI Backend", version="1.0.0")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load ML model with proper error handling
MODEL_PATH = os.path.join(os.path.dirname(__file__), "healthqai_model.pkl")
try:
    model = joblib.load(MODEL_PATH)
    logger.info(f"✅ Model loaded successfully from {MODEL_PATH}")
    logger.info(f"Model type: {type(model)}")
    
    # Test prediction
    try:
        dummy_input = np.array([[35, 1, 1, 0, 0]])  # Adjust based on your model's expected features
        dummy_pred = model.predict(dummy_input)
        logger.info(f"🧪 Test prediction successful: {dummy_pred}")
    except Exception as test_error:
        logger.error(f"❌ Test prediction failed: {str(test_error)}")
        model = None
except Exception as e:
    logger.error(f"❌ Failed to load model: {str(e)}")
    model = None

# Pydantic models
class User(BaseModel):
    username: str
    disabled: bool = False
    role: str

class UserInDB(User):
    hashed_password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: str | None = None

class PredictionRequest(BaseModel):
    age: int
    gender: str
    symptoms: str
    medical_history: Optional[str] = None

class PredictionResponse(BaseModel):
    diagnosis: str
    confidence: float
    recommendations: list[str]

class QuestionResponse(BaseModel):
    question: str
    answer: str
    sources: list[str]

# Helper functions
def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str):
    return pwd_context.hash(password)

def get_user(db, username: str):
    if username in db:
        user_dict = db[username]
        return UserInDB(**user_dict)

def authenticate_user(fake_db, username: str, password: str):
    user = get_user(fake_db, username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = get_user(fake_users_db, username=token_data.username)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)):
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

@app.get("/")
def health_check():
    return {"status": "healthy", "model_loaded": model is not None}

@app.post("/predict")
async def predict(
    age: int = Form(...),
    gender: str = Form(...),
    symptoms: str = Form(...),
    medical_history: str = Form(None)
):
    try:
        logger.info(f"📥 Received prediction request - Age: {age}, Gender: {gender}, Symptoms: {symptoms}")

        # Default response
        base_response = {
            "recommendations": [
                "Rest and hydration",
                "Over-the-counter medication",
                "Consult a doctor if symptoms worsen"
            ]
        }

        if not model:
            logger.warning("⚠️ Model not available - using fallback diagnosis")
            return {
                **base_response,
                "diagnosis": "System temporarily unavailable",
                "confidence": 0.6,
                "model_used": False
            }

        try:
            # Preprocess input
            gender_encoded = 1 if gender.lower() in ['male', 'm'] else 0
            
            # Simple symptom processing (adjust based on your model's needs)
            symptom_count = len(symptoms.split())
            
            # Create feature vector (adjust based on your model's expected input)
            features = np.array([[age, gender_encoded, symptom_count]])
            
            # Make prediction
            prediction = model.predict(features)[0]
            probabilities = model.predict_proba(features)[0] if hasattr(model, 'predict_proba') else None
            
            return {
                **base_response,
                "diagnosis": str(prediction),
                "confidence": float(probabilities.max()) if probabilities is not None else 0.85,
                "model_used": True
            }
            
        except Exception as model_error:
            logger.error(f"🤖 Model prediction error: {str(model_error)}")
            # Fallback based on symptoms
            symptoms_lower = symptoms.lower()
            if "fever" in symptoms_lower and "cough" in symptoms_lower:
                return {
                    **base_response,
                    "diagnosis": "Possible respiratory infection",
                    "confidence": 0.75,
                    "model_used": False
                }
            elif "headache" in symptoms_lower:
                return {
                    **base_response,
                    "diagnosis": "Tension headache",
                    "confidence": 0.65,
                    "model_used": False
                }
            else:
                return {
                    **base_response,
                    "diagnosis": "General consultation needed",
                    "confidence": 0.7,
                    "model_used": False
                }

    except Exception as e:
        logger.error(f"🔥 Prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# [Keep all other endpoints the same as in your original code]
# ... (Q&A, authentication endpoints remain unchanged)