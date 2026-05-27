import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.schemas.schemas import IssueList
from app.services.proofread import GeminiService


TEST_TEX = r"""
\documentclass{article}
\begin{document}
And this sentence starts with And.
Fig. 1 shows the result.
\end{document}
"""


class FakeStructuredLlm:
    def __init__(self):
        self.messages = None

    async def ainvoke(self, messages):
        self.messages = messages
        return IssueList(issues=[])


class FakeLlm:
    def __init__(self, structured_llm):
        self.structured_llm = structured_llm

    def with_structured_output(self, schema):
        assert schema is IssueList
        return self.structured_llm


async def test_get_issues_includes_pdf_and_tex_inputs():
    """get_issues がPDFとTeXソースをGemini入力に含めることを確認する"""
    structured_llm = FakeStructuredLlm()
    service = GeminiService.__new__(GeminiService)
    service.llm_client = FakeLlm(structured_llm)

    result = await service.get_issues(
        pdf_base64="dummy-pdf-base64",
        tex_source=TEST_TEX,
        ignored_issues=[],
    )

    assert result.issues == []
    assert structured_llm.messages is not None

    human_message = structured_llm.messages[1]
    pdf_part = human_message.content[0]
    text_part = human_message.content[1]

    assert pdf_part["mime_type"] == "application/pdf"
    assert pdf_part["data"] == "dummy-pdf-base64"
    assert "<tex_source>" in text_part["text"]
    assert TEST_TEX in text_part["text"]
