# 論文校正システム

LLMによる学術論文の自動校正システム（卒業研究成果物）

## 概要

PDFとTeXファイルをアップロードすると、Gemini APIを使って学術論文のフォーマットエラーを検出・修正するシステムです。

## 環境構築（Ubuntu）

### 必要なツール

- Python 3.12以上
- Node.js 20以上
- uv（Pythonパッケージマネージャー）

### 1. uvのインストール

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
source ~/.bashrc  # または ~/.zshrc
```

### 2. Node.jsのインストール（未インストールの場合）

```bash
# nodenvを使う場合
git clone https://github.com/nodenv/nodenv.git ~/.nodenv
echo 'export PATH="$HOME/.nodenv/bin:$PATH"' >> ~/.bashrc
echo 'eval "$(nodenv init -)"' >> ~/.bashrc
source ~/.bashrc

git clone https://github.com/nodenv/node-build.git ~/.nodenv/plugins/node-build
nodenv install 22.12.0
nodenv global 22.12.0

# または直接インストール
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3. バックエンドのセットアップ

```bash
cd backend

# 仮想環境を作成して依存関係をインストール
uv venv
uv pip install -e ".[dev]"

# 環境変数を設定
cp .env.example .env  # .env.exampleがない場合は下記参照
# .envファイルを編集してAPIキーを設定
```

`.env`ファイルの内容：
```
GOOGLE_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-pro
```

### 4. フロントエンドのセットアップ

```bash
cd frontend

# 依存関係をインストール
npm install
```

## 起動方法

### バックエンドの起動

```bash
cd backend
uv run uvicorn app.main:app --reload --port 8000
```

バックエンドは http://localhost:8000 で起動します。
API仕様は http://localhost:8000/docs で確認できます。

### フロントエンドの起動

```bash
cd frontend
npm run dev
```

フロントエンドは http://localhost:5173 で起動します。

## 使い方

1. ブラウザで http://localhost:5173 にアクセス
2. PDFファイルとTeXファイルをアップロード
3. 「校正開始」ボタンをクリック
4. 検出された指摘事項に対して「反映」または「無視」を選択
5. 必要に応じてTeXプレビューで手動編集
6. 「再校正」で追加のチェック（最大20ラウンド）
7. 「TeXをダウンロード」で修正後のファイルを保存

## プロジェクト構成

```
paperproofer/
├── backend/               # FastAPI バックエンド
│   ├── app/
│   │   ├── main.py       # エントリーポイント
│   │   ├── api/          # APIエンドポイント
│   │   ├── services/     # Geminiサービス
│   │   └── schemas/      # Pydanticスキーマ
│   ├── tests/            # テスト
│   └── pyproject.toml    # Python依存関係
│
└── frontend/             # React + Vite フロントエンド
    ├── src/
    │   ├── App.tsx       # メインコンポーネント
    │   ├── api.ts        # APIクライアント
    │   └── types.ts      # 型定義
    └── package.json      # Node.js依存関係
```

## テストの実行

```bash
cd backend
uv run pytest
```

## API仕様

### POST /api/proofread/
PDFとTeXを解析して指摘事項を返す

### POST /api/proofread/apply
指摘事項をTeXに反映する

詳細は http://localhost:8000/docs を参照
