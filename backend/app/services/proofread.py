from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
import os
import base64
from dotenv import load_dotenv
from app.schemas.schemas import IssueList, Issue

class GeminiService:
    def __init__(self):
        self.llm_client = ChatGoogleGenerativeAI(
            model=os.getenv("GEMINI_MODEL"),
            google_api_key=os.getenv("GOOGLE_API_KEY"),
            temperature=0,
            max_tokens=None,
            timeout=None,
            max_retries=2,
        )
    
    async def get_issues(self, tex_content: str, pdf_base64: str, ignored_issues: list[str]) -> IssueList:
        # ユーザープロンプトを組み立て
        user_prompt = GET_ISSUES_USER_PROMPT.format(
            ignored_issues=self._format_ignored_issues(ignored_issues),
            checklist=CHECKLIST,
            tex_content=tex_content,
        )
        # マルチモーダルメッセージを作成
        message = HumanMessage(
            content=[
                # PDFファイル（base64エンコード済み）
                {
                    "type": "file",
                    "source_type": "base64",
                    "mime_type": "application/pdf",
                    "data": pdf_base64,
                },
                # テキストプロンプト
                {
                    "type": "text",
                    "text": user_prompt,
                },
            ]
        )
        # SystemMessageとHumanMessageを組み合わせる
        messages = [
            SystemMessage(content=GET_ISSUES_SYSTEM_PROMPT),
            message,
        ]

        # # デバッグ: structured outputなしで生のレスポンスを確認
        # print("=== デバッグ: 生のレスポンス ===")
        # raw_response = await self.llm_client.ainvoke(messages)
        # print(f"raw_response: {raw_response.content}")
        # print("=== デバッグ終了 ===")

        llm_with_structure = self.llm_client.with_structured_output(IssueList)
        print(f"Gemini呼び出し中...")
        response = await llm_with_structure.ainvoke(messages)
        print(f"Geminiの応答: {response}")
        return response
    
    def _format_ignored_issues(self, ignored_issues: list[str]) -> str:
        if not ignored_issues:
            return "なし"
        return "\n".join(f"- {issue}" for issue in ignored_issues)

    def apply_issue(self, tex_content: str, issue: Issue) -> tuple[str, bool]:
        try:
            new_tex = tex_content.replace(issue.before_text, issue.after_text)
            if new_tex == tex_content:
                return tex_content, False
            return new_tex, True
        except Exception:
            return tex_content, False

GET_ISSUES_SYSTEM_PROMPT = """
# 指示
あなたは学術論文の形式を検証する自動Lintツールです。
与えられた論文テキスト（LaTeXとPDF）について、提供されたチェックリストに基づき、形式上の誤りを指摘してください。

## 指摘の基準
チェクリストに**明白に違反している箇所のみ**を抽出してください。
無理に指摘箇所を探す必要はありません。以下の場合は指摘を出力しないでください。
1. 違反かどうかが確実でない場合。
2. 文脈上、許容範囲内である可能性がある場合。
3. チェックリストに明記されていない事項（一般的な慣習や推測に基づく指摘）。

誤りがない場合は空のリストを返してください。

## ルール
1. **文字通りの適用**
    - チェックリストの記述を文字通りに解釈してください。拡大解釈は禁止です。
"""

GET_ISSUES_USER_PROMPT = """
# 入力
## 無視する指摘事項
{ignored_issues}

## チェックリスト
{checklist}

## 論文テキスト
{tex_content}
"""


CHECKLIST = r"""
# 英語論文用チェックリスト

### 1.1 書式

* すべての文字が半角文字であり、全角文字（全角スペースを含む）は使われていない。
* 単語の前後には半角スペースを入れている
* 単語の省略表現に使うピリオドの後ろは半角スペース1つである。英語の組版では通常文末に半角スペースを二つ挿入する。を使う場合、が勝手にピリオドの後ろに半角スペースをついれてくれる。一方、「」や「」のような省略を表すピリオドの後ろにも半角スペースをいれてしまうことがあるため、明示的に半角スペースつであることを示す必要がある。バックスラッシュ半角スペースで半角スペースつを明示的に指示できる。

### 1.5. 参考文献

* 参考文献の引用は文中にある。すなわち「～.[xx] 」ではなく「～[xx].」となっている。
* 論文中で人名を挙げて引用する場合には敬称をつけていない。
* 引用符中でのコンマとピリオドについて、コンマとピリオドが引用符の中に書かれている。 ただし、引用符の中が1文字か数字の場合は外に書く。疑問符、感嘆符、ダッシュはそれ らが引用部の一部でないかぎり、引用符の外に書く。セミコロンとコロンは引用符の外に書く。
* 引用について参考文献を示したい場合に参考文献番号が引用符の外にある。つまり、「＂～．＂ ［xx］」としてある。

### 2.1図、表、例題

* 図、表、例題にタイトル（キャプション）がちゃんとついている。
* 表の縦と横の欄にはそれぞれ見出しをつけている 
* 表において、単位のある数字が入る欄の見出しには単位が書き加えられている。すなわち、数字自体に単位をつけない

### 2.2 箇条書き

* 数字なし箇条書き（ LaTeX の場合は itemize 環境）で列挙されているものの表現はすべて同じである。つまり、主語や時制、文なのか非文なのか、英語ならば、名詞なのか、動名詞 なのか、不定詞なのか、能動態なのか、受動態なのかが同じである。
* 箇条書きの入れ子は、概念の抽象度や説明の詳しさが同レベルの事柄が2個以上あるときだ け使われている。
* 文中で箇条書きが使われている場合は、適切にカンマや and や or が使われている。たとえ ば以下のように。 
Requirements are as follows：
    - A，
    - B，and
    - C．

### 2.3数式

* 重要な数式にはすべて番号がふられている。
* 数式もしくは文中の変数はイタリックで記載されている（LaTeX であるならば、ちゃんと数式環境を用いている）。
* 論文中では変数は可能な限り一意に使われている。つまり、ある場所では「logical formula $A$ is」、別の場所で「set $A$ is」、別の場所で「Let $A$ denote a number of lines of the program．」 というような使い方をしていない。
* 変数を固有名詞として扱っている。たとえば、「a set $B$ 」ではなく「set $B$ 」と表記している。
* 数式にちゃんと句読点がついている。

### 2.4アルゴリズム、疑似コード

* 行番号がついている。
* 予約語は一目でわかるようになっている。たとえば、if－else－then や while、for などが太字 やすべて大文字で強調されている。

### 4.単語

* 加算名詞が裸（冠詞がついてなく、複数形でもない）で登場していない。
* 三単現の「s」が落ちていない。 特に関係代名詞で複文にしているときに注意が必要。また、不可算名詞（固有名詞も含む）も、三単現の「s」の対象なので注意する。
* ある事柄や概念は論文中では常に一つの用語で表現している。論文においては言い換えは避 ける
* 造語を使うときには必ず定義後に使用している。
* 略語は必要なものだけ利用している。
* 略語は、初回使用時に必ずフルスペルを示したのちに使用している。
* 実際にしたことや今進展中のことに対して propose を使っていない。propose は、「ある考えを良く検討してみようと提案する」という意味なので、実際にしたことや今進展中のこと に対して使うのは不適当である。多くの場合は deveop（ed）のように仕事が完了したことが具体的にわかる言葉に置き換えた方がよい
* and，but，so を文頭で使ってはいけない。口語的表現であるため。
* since や as を because の意味で使っていない。その意味で使うならばすべて because を使う
* 関係代名詞の制限用法の場合はthatを用い、非制限用法の場合は which を使っている。関係代名詞による修飾句を取り除いても意味が通じる場合は which、通じない場合は that を使う 
* 対照や比較を示す言葉としては while ではなく whereas を使っている
* fewerは数えられるものを表すときに使い。lessは数えられないものの量を表すときに使っ ている
* numberは数えられるものの数を表すときに用いており、amountは数えられないものの量示すときに用いている
* overという言葉をmore thanの意味で使っていない。overという言葉は相互の位置関係を表す
* つづりは米国式か英国式で統一されている

### 5.文

* 主語と述語がちゃんと対応している。文中で不必要な単語を取り除き、文の骨格を抜き出 してみると構文上の間違いがわかりやすい 
* 量は $10 \mathrm{~g}, 500 \mathrm{ml}$ というように一つのまとまりと考え、動詞を単数形にしている。ただし、 10 g を 1 g ずつに分けて加えるような場合には動詞を複数形にする
* 数字で文章を書き始めてはいない。数字で始めたいときには単語で書く。たとえば、 500 g of the sample ではなく、＂Five hundred grams of the sample＂と書く。でも、一番良いの は＂The sample（ 500 g ）～＂となる
* and / or が使われていない。and／or は読者が複数の可能性を検討した上で筆者の意図を読 み取らなくてはいけないのでなるべく使わない
* 修飾語、形容詞、副詞の修飾先がはつきりしている。つまり、ある文が複数の意味に解釈されない。
* 形容詞（long、heavy、fast など）や形容動詞（beautiful、fresh など）を使うときには量 をはっきりさせている。
* 略語に冠詞をつけるとき、略語の発音に応じて a と an を使い分けている。
* et al．の前のカンマの使い方が正しい。「et al．」の前が一つだけならばカンマは不要。例 えば「Smith et al．」2つ以上ならば、カンマが必要。例えば「Smith，Jones，et al．」
* 文章の最初に略語を使っていない。「～Fig．3」というのはよいが、「Fig．3 」はダメ。 Figure 3 ～とする。
* 記号を文の最初にしていない。具体的にいうと、 $\beta$ などの記号で文を始めてはいけない。どうしても使いたいならば、「The Greek letter $\beta$ was used to symbolize～」などと書く
* 句読点の前にはスペースはとらず、句読点の後ろに 1 文字分スペースがとられている。句読点には、ピリオド、コンマ、コロン、セミコロン、疑問符、感嘆符がある。
* 引用符の中や括弧のあとに句読点を使う場合には、スペースをとらず続けて書いている。
* 文末にピリオドを含む省略語がくる場合にピリオドが一つだけである。ただし、疑問符や感嘆符の場合は、省略記号のピリオドと並べてつける。たとえば、＂～etc．？＂のようにする 
* 各形容詞が独立して同等に単語を修飾している場合にはコンマを使っている。たとえば ＂The reaction produced shiny，multifaceted crystals＂となる
* コロンは、コロンに続く項目を紹介する場合か各項目を区分けする場合にのみ使っている。
* コロンを一塊の句や節として文章中で使っていない。コロンの前後は独立している。たとえば、＂The three key factors are：temperature，concentration，and time．＂はコロンの悪い使用例。＂The three key factors are as follows：temperature，concentration，and time．＂ のように使う
* ハイフンとダッシュを使い分けている。ハイフンとダッシュの違いは、ダッシュの方が長い。 TeXではダッシュは、ハイフン二個で表す。科学論文ではダッシュはあまり使われない
* アポストロフィーを使った文字の省略は本文中で使っていない。科学論文では、アポストロフィーを使った文字の省略は本文中では使わず、完全な綴りで書く。たとえば、can’t や don＇t ではなく cannot や do not と書く。

### 6.1文章

* 同じ接続詞をすぐ次の文で使っていない。
"""