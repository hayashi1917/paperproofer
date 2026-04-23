# backend/main.py
# backend/app/main.py
from dotenv import load_dotenv
load_dotenv()

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.proofread import router as proofread_router

app = FastAPI(title="TeXProofer API")

cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173")
allow_origins = [origin.strip() for origin in cors_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(proofread_router, prefix="/api")

@app.get("/")
def root():
    return {"message": "TeXProofer API"}
