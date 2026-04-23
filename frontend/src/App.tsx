import { useState } from 'react';
import type { Issue } from './types';
import { fileToBase64, proofread } from './api';
import './App.css';

function App() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [ignoredIssues, setIgnoredIssues] = useState<Issue[]>([]);
  const [roundNumber, setRoundNumber] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isWaitingForNewPdf, setIsWaitingForNewPdf] = useState<boolean>(false);

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    setPdfFile(file);
    setError(null);
  };

  const runProofread = async () => {
    if (!pdfFile) {
      setError('PDFファイルをアップロードしてください');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const pdfBase64 = await fileToBase64(pdfFile);
      const response = await proofread({
        pdf_base64: pdfBase64,
        ignored_issues: ignoredIssues,
        round_number: roundNumber,
      });

      setIssues(response.issues);
      setRoundNumber(response.round_number);
      setIsWaitingForNewPdf(false);

      if (response.issues.length === 0) {
        setMessage('指摘事項が見つかりませんでした。校正完了です。');
      } else {
        setMessage(`${response.issues.length}件の指摘事項が見つかりました（ラウンド${response.round_number}）`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '校正処理でエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleProofread = async () => {
    if (roundNumber > 0 && !isWaitingForNewPdf) {
      setIsWaitingForNewPdf(true);
      setMessage('再校正を行うには、修正後のPDFをアップロードしてください。');
      return;
    }

    await runProofread();
  };

  const handleIgnore = (issue: Issue) => {
    setIgnoredIssues((prev) => [...prev, issue]);
    setIssues((prev) => prev.filter((item) => item.issue_id !== issue.issue_id));
    setMessage(`指摘「${issue.issue_id}」を無視リストに追加しました`);
  };

  const handleReset = () => {
    setPdfFile(null);
    setIssues([]);
    setIgnoredIssues([]);
    setRoundNumber(0);
    setLoading(false);
    setError(null);
    setMessage(null);
    setIsWaitingForNewPdf(false);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>論文校正システム</h1>
        <p className="subtitle">PDFを入力して論文の体裁上の問題点をチェック</p>
      </header>

      <main className="main">
        <section className="section">
          <h2>PDFアップロード</h2>
          <div className="upload-area">
            <div className="upload-item">
              <label htmlFor="pdf-input">論文PDF:</label>
              <input
                id="pdf-input"
                type="file"
                accept=".pdf,application/pdf"
                onChange={handlePdfChange}
              />
              {pdfFile && <span className="file-name">{pdfFile.name}</span>}
            </div>
          </div>
          <p className="description">
            PDF の内容を Gemini が確認し、チェックリストに基づく指摘事項を返します。
          </p>
        </section>

        <section className="section">
          <div className="controls">
            {!isWaitingForNewPdf ? (
              <button
                className="btn btn-primary"
                onClick={handleProofread}
                disabled={loading || !pdfFile}
              >
                {loading ? '処理中...' : roundNumber === 0 ? '校正開始' : '再校正'}
              </button>
            ) : (
              <div className="reproof-prompt">
                <p>次ラウンドの校正には、修正後のPDFを選択してから実行してください。</p>
                <div className="upload-item">
                  <label htmlFor="reproof-pdf-input">修正後PDF:</label>
                  <input
                    id="reproof-pdf-input"
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handlePdfChange}
                  />
                </div>
                <div className="controls">
                  <button
                    className="btn btn-primary"
                    onClick={runProofread}
                    disabled={loading || !pdfFile}
                  >
                    {loading ? '処理中...' : '再校正を開始'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setIsWaitingForNewPdf(false);
                      setMessage(null);
                    }}
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            )}

            <button className="btn btn-danger" onClick={handleReset}>
              リセット
            </button>
          </div>

          {roundNumber > 0 && !isWaitingForNewPdf && (
            <div className="stats">
              <span>ラウンド: {roundNumber}</span>
              <span>無視済み: {ignoredIssues.length}件</span>
              <span>上限目安: 20ラウンド</span>
            </div>
          )}
        </section>

        {error && <div className="message error">{error}</div>}
        {message && <div className="message success">{message}</div>}

        {issues.length > 0 && (
          <section className="section">
            <h2>指摘事項 ({issues.length}件)</h2>
            <div className="issues-list">
              {issues.map((issue) => (
                <div key={issue.issue_id} className="issue-card">
                  <div className="issue-header">
                    <span className="issue-id">#{issue.issue_id}</span>
                    <span className="checklist-item">{issue.checklist_item}</span>
                  </div>
                  <div className="issue-content">
                    <div className="issue-row">
                      <span className="label">問題箇所:</span>
                      <code className="text-before">{issue.before_text}</code>
                    </div>
                    <div className="issue-row">
                      <span className="label">修正候補:</span>
                      <code className="text-after">{issue.after_text}</code>
                    </div>
                    <div className="issue-row">
                      <span className="label">理由:</span>
                      <span className="reason">{issue.violation_reason}</span>
                    </div>
                  </div>
                  <div className="issue-actions">
                    <button
                      className="btn btn-ignore"
                      onClick={() => handleIgnore(issue)}
                    >
                      無視
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="footer">
        <p>卒業研究成果物 - LLMによる学術論文の自動校正システム</p>
      </footer>
    </div>
  );
}

export default App;
