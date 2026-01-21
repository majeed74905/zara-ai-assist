from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routes import router

# Create Tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Zara AI Assist Backend")

# CORS
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/auth", tags=["Authentication"])

@app.get("/")
def read_root():
    return {"message": "Zara AI Assist Backend is running"}
