# backend/tests/test_gemini_service.py
import asyncio
import base64
import os
from dotenv import load_dotenv

# .envを読み込み
load_dotenv()

from app.services.proofread import GeminiService
from app.schemas.schemas import Issue

# テスト用のTeXコンテンツ
TEST_TEX = r"""
\documentclass{article}
\begin{document}

\section{Introduction}
This is a test document. We propose a new method for solving problems.
And this sentence starts with And, which is not allowed.

The method works as follows:
\begin{itemize}
\item First step
\item Second step.
\item Third step
\end{itemize}

Fig. 1 shows the result.

\end{document}
"""

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
            tex_content=TEST_TEX,
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

def test_apply_issue():
    """apply_issueのテスト"""
    print("\n=== apply_issue テスト ===")
    
    service = GeminiService()
    
    # テスト用の指摘
    test_issue = Issue(
        issue_id="1",
        before_text="We propose a new method",
        after_text="We developed a new method",
        checklist_item="proposeの使用",
        violation_reason="実際に行ったことにproposeを使っている"
    )
    
    original_tex = "We propose a new method for solving problems."
    
    new_tex, success = service.apply_issue(original_tex, test_issue)
    
    print(f"成功: {success}")
    print(f"修正前: {original_tex}")
    print(f"修正後: {new_tex}")
    
    # 置換できなかったケース
    test_issue_not_found = Issue(
        issue_id="2",
        before_text="存在しない文",
        after_text="修正後の文",
        checklist_item="テスト",
        violation_reason="テスト"
    )
    
    new_tex2, success2 = service.apply_issue(original_tex, test_issue_not_found)
    print(f"\n存在しない文の置換: 成功={success2}")

if __name__ == "__main__":
    # 同期テスト
    test_apply_issue()
    
    # 非同期テスト
    asyncio.run(test_get_issues())