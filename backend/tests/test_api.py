# backend/tests/test_api.py
import pytest
from httpx import AsyncClient, ASGITransport
import base64
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.main import app

# テスト用のTeXコンテンツ
TEST_TEX = r"""
\documentclass{article}
\begin{document}
And this sentence starts with And.
Fig. 1 shows the result.
\end{document}
"""

@pytest.fixture
def pdf_base64():
    """テスト用PDFをbase64エンコード"""
    pdf_path = Path(__file__).parent.parent / "test.pdf"
    if pdf_path.exists():
        with open(pdf_path, "rb") as f:
            return base64.b64encode(f.read()).decode("utf-8")
    return ""

@pytest.mark.asyncio
async def test_proofread(pdf_base64):
    """POST /proofread のテスト"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/proofread/",
            json={
                "pdf_base64": pdf_base64,
                "ignored_issues": [],
                "round_number": 0,
            }
        )
    
    assert response.status_code == 200
    data = response.json()
    assert "issues" in data
    assert "round_number" in data
    assert data["round_number"] == 1
    print(f"検出された指摘数: {len(data['issues'])}")
    for issue in data["issues"]:
        print(f"  - {issue['issue_id']}: {issue['checklist_item']}")

@pytest.mark.asyncio
async def test_proofread_with_ignored_issues(pdf_base64):
    """無視リスト付きのテスト"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/proofread/",
            json={
                "pdf_base64": pdf_base64,
                "ignored_issues": [],
                "round_number": 1,
            }
        )
    
    assert response.status_code == 200
    data = response.json()
    assert data["round_number"] == 2
