from fastapi import APIRouter
from app.schemas.schemas import ProofreadRequest, ProofreadResponse, ApplyRequest, ApplyResponse
from app.services.proofread import GeminiService

router = APIRouter(prefix="/proofread", tags=["proofread"])
service = GeminiService()


@router.post("/")
async def proofread(request: ProofreadRequest):
    results = await service.get_issues(request.tex_content, request.pdf_base64, request.ignored_issues)
    print(results)
    return ProofreadResponse(issues=results.issues, round_number=request.round_number+1)

@router.post("/apply")
async def apply(request: ApplyRequest):
    new_tex_content, success = service.apply_issue(request.tex_content, request.issue)
    return ApplyResponse(success=success, new_tex_content=new_tex_content)