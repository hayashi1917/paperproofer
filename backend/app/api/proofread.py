from fastapi import APIRouter
from app.schemas.schemas import ProofreadRequest, ProofreadResponse
from app.services.proofread import GeminiService

router = APIRouter(prefix="/proofread", tags=["proofread"])
service = GeminiService()


@router.post("/")
async def proofread(request: ProofreadRequest):
    results = await service.get_issues(request.pdf_base64, request.tex_source, request.ignored_issues)
    print(results)
    return ProofreadResponse(issues=results.issues, round_number=request.round_number+1)
