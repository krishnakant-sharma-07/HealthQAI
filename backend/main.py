from fastapi import FastAPI, Form
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Allow frontend to talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "HealthQAI Backend is running!"}

@app.post("/predict")
def predict(age: int = Form(...), gender: str = Form(...), symptoms: str = Form(...)):
    # Later replace this logic with actual AI/ML prediction.
    diagnosis = "Common cold" if "cold" in symptoms.lower() else "General consultation needed"
    return {
        "age": age,
        "gender": gender,
        "symptoms": symptoms,
        "diagnosis": diagnosis
    }
