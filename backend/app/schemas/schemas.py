from pydantic import BaseModel, Field

class ProofreadRequest(BaseModel):
    tex_content: str
    pdf_base64: str
    ignored_issues: list[str]
    round_number: int

# backend/app/schemas/issue.py
class Issue(BaseModel):
    issue_id: str = Field(description="指摘事項の一意なID（例: 1, 2, 3）")
    before_text: str = Field(description="入力テキストから抜粋した完全な文字列（改行・空白含む）")
    after_text: str = Field(description="修正前の文をそのまま置換可能な、修正済みの完全な文字列")
    checklist_item: str = Field(description="チェックリストの該当項目を正確に引用")
    violation_reason: str = Field(description="なぜこの箇所がチェックリストに違反しているかの説明")

class IssueList(BaseModel):
    issues: list[Issue]

class ProofreadResponse(BaseModel):
    issues: list[Issue]
    round_number: int

class ApplyRequest(BaseModel):
    tex_content: str
    issue: Issue

class ApplyResponse(BaseModel):
    success: bool
    new_tex_content: str