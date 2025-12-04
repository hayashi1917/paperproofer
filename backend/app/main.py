# backend/main.py
# backend/app/main.py
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.proofread import router as proofread_router

app = FastAPI(title="TeXProofer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(proofread_router, prefix="/api")

@app.get("/")
def root():
    return {"message": "TeXProofer API"}