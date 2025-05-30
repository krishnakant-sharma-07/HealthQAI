# 🩺 HealthQAI — AI-Based Medical Diagnosis Assistant

**HealthQAI** is an intelligent web-based medical assistant that allows users to input symptoms in natural language and receive AI-generated disease predictions, explanations, and healthcare guidance. Built with a React frontend, a FastAPI backend, a trained machine learning model for diagnosis, and an integrated LLM for natural language understanding and interaction, HealthQAI simulates a first-level digital doctor experience.

---

## 🚀 Features

- ✅ Symptom-based disease prediction using a trained ML model (Random Forest)
- ✅ Free-text symptom input with intelligent LLM-based interpretation
- ✅ Natural language explanations of predicted diagnoses
- ✅ AI-powered Q&A for general medical queries (via LLM)
- ✅ Personalized recommendations and precautions
- ✅ User authentication (for accessing Q&A)
- ✅ Real-time backend and frontend integration

---

## 🧠 Technologies Used

| Layer | Tech |
|-------|------|
| **Frontend** | React (Vite), Tailwind CSS, React Icons |
| **Backend** | FastAPI, Uvicorn, Python |
| **Machine Learning** | Random Forest Classifier + TF-IDF |
| **LLM Functionality** | Question-answering, diagnosis explanation, symptom text normalization |
| **Model Tools** | scikit-learn, joblib |
| **Deployment** | GitHub (local setup for now, Azure-ready) |

---

## 💡 How the System Works

1. User enters symptoms (and optionally age, gender, medical history) on the frontend.
2. Backend:
   - Preprocesses input
   - Uses an LLM to interpret and normalize symptoms
   - Runs the ML model to predict disease and confidence
   - Uses LLM again to explain prediction or answer user questions
3. The result is displayed with:
   - Diagnosis
   - Confidence %
   - Recommendations
   - Optional chatbot-style Q&A (if authenticated)

---

## ⚙️ Setup Instructions

### 🔧 Clone the Repo
```bash
git clone https://github.com/krishnakant-sharma-07/healthqai.git
cd healthqai
