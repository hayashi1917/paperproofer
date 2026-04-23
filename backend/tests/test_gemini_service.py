# backend/tests/test_gemini_service.py
import asyncio
import base64
import os
from dotenv import load_dotenv

# .envを読み込み
load_dotenv()

from app.services.proofread import GeminiService
async def test_get_issues():
    """get_issuesのテスト"""
    print("=== get_issues テスト ===")
    
    service = GeminiService()
    
    # テスト用PDFがある場合は読み込む
    # なければダミーのbase64を使う（エラーになる可能性あり）
    pdf_path = "test.pdf"  # テスト用PDFのパス
    
    if os.path.exists(pdf_path):
        with open(pdf_path, "rb") as f:
            pdf_base64 = base64.b64encode(f.read()).decode("utf-8")
    else:
        print("警告: test.pdfが見つかりません。PDFなしでテストします。")
        pdf_base64 = ""
    
    try:
        result = await service.get_issues(
            pdf_base64=pdf_base64,
            ignored_issues=[]
        )
        
        print(f"検出された指摘数: {len(result.issues)}")
        for issue in result.issues:
            print(f"\n--- 指摘 {issue.issue_id} ---")
            print(f"修正前: {issue.before_text}")
            print(f"修正後: {issue.after_text}")
            print(f"チェック項目: {issue.checklist_item}")
            print(f"理由: {issue.violation_reason}")
    except Exception as e:
        print(f"エラー: {e}")

if __name__ == "__main__":
    # 非同期テスト
    asyncio.run(test_get_issues())
