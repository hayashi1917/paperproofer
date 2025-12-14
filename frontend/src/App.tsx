import { useState } from 'react';
import type { Issue } from './types';
import { proofread, applyIssue, fileToBase64, readTextFile } from './api';
import './App.css';

function App() {
  // File states
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [texContent, setTexContent] = useState<string>('');
  const [texFileName, setTexFileName] = useState<string>('');

  // Proofreading states
  const [issues, setIssues] = useState<Issue[]>([]);
  const [ignoredIssues, setIgnoredIssues] = useState<string[]>([]);
  const [roundNumber, setRoundNumber] = useState<number>(0);

  // UI states
  const [loading, setLoading] = useState<boolean>(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Handle PDF file selection
  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPdfFile(file);
      setError(null);
    }
  };

  // Handle TeX file selection
  const handleTexChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const content = await readTextFile(file);
        setTexContent(content);
        setTexFileName(file.name);
        setError(null);
      } catch {
        setError('TeXファイルの読み込みに失敗しました');
      }
    }
  };

  // Start proofreading
  const handleProofread = async () => {
    if (!pdfFile || !texContent) {
      setError('PDFファイルとTeXファイルの両方をアップロードしてください');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const pdfBase64 = await fileToBase64(pdfFile);
      const response = await proofread({
        tex_content: texContent,
        pdf_base64: pdfBase64,
        ignored_issues: ignoredIssues,
        round_number: roundNumber,
      });

      setIssues(response.issues);
      setRoundNumber(response.round_number);

      if (response.issues.length === 0) {
        setMessage('指摘事項が見つかりませんでした。校正完了です！');
      } else {
        setMessage(`${response.issues.length}件の指摘事項が見つかりました（ラウンド${response.round_number}）`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '校正処理でエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // Apply an issue
  const handleApply = async (issue: Issue) => {
    setApplyingId(issue.issue_id);
    setError(null);

    try {
      const response = await applyIssue({
        tex_content: texContent,
        issue: issue,
      });

      if (response.success) {
        setTexContent(response.new_tex_content);
        setIssues(issues.filter((i) => i.issue_id !== issue.issue_id));
        setMessage(`指摘「${issue.issue_id}」を反映しました`);
      } else {
        setError(`反映に失敗しました：置換対象の文字列が見つかりませんでした`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '反映処理でエラーが発生しました');
    } finally {
      setApplyingId(null);
    }
  };

  // Ignore an issue
  const handleIgnore = (issue: Issue) => {
    setIgnoredIssues([...ignoredIssues, issue.issue_id]);
    setIssues(issues.filter((i) => i.issue_id !== issue.issue_id));
    setMessage(`指摘「${issue.issue_id}」を無視リストに追加しました`);
  };

  // Download modified TeX
  const handleDownload = () => {
    const blob = new Blob([texContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = texFileName ? `modified_${texFileName}` : 'modified.tex';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Reset all
  const handleReset = () => {
    setPdfFile(null);
    setTexContent('');
    setTexFileName('');
    setIssues([]);
    setIgnoredIssues([]);
    setRoundNumber(0);
    setError(null);
    setMessage(null);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>論文校正システム</h1>
        <p className="subtitle">LLMによる学術論文の自動校正</p>
      </header>

      <main className="main">
        {/* File Upload Section */}
        <section className="section">
          <h2>ファイルアップロード</h2>
          <div className="upload-area">
            <div className="upload-item">
              <label htmlFor="pdf-input">PDFファイル:</label>
              <input
                id="pdf-input"
                type="file"
                accept=".pdf"
                onChange={handlePdfChange}
              />
              {pdfFile && <span className="file-name">{pdfFile.name}</span>}
            </div>
            <div className="upload-item">
              <label htmlFor="tex-input">TeXファイル:</label>
              <input
                id="tex-input"
                type="file"
                accept=".tex"
                onChange={handleTexChange}
              />
              {texFileName && <span className="file-name">{texFileName}</span>}
            </div>
          </div>
        </section>

        {/* Control Section */}
        <section className="section">
          <div className="controls">
            <button
              className="btn btn-primary"
              onClick={handleProofread}
              disabled={loading || !pdfFile || !texContent}
            >
              {loading ? '処理中...' : roundNumber === 0 ? '校正開始' : '再校正'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleDownload}
              disabled={!texContent}
            >
              TeXをダウンロード
            </button>
            <button className="btn btn-danger" onClick={handleReset}>
              リセット
            </button>
          </div>
          {roundNumber > 0 && (
            <div className="stats">
              <span>ラウンド: {roundNumber}</span>
              <span>無視済み: {ignoredIssues.length}件</span>
              <span>上限: 20ラウンド</span>
            </div>
          )}
        </section>

        {/* Message/Error Display */}
        {error && <div className="message error">{error}</div>}
        {message && <div className="message success">{message}</div>}

        {/* Issues Section */}
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
                      <span className="label">修正前:</span>
                      <code className="text-before">{issue.before_text}</code>
                    </div>
                    <div className="issue-row">
                      <span className="label">修正後:</span>
                      <code className="text-after">{issue.after_text}</code>
                    </div>
                    <div className="issue-row">
                      <span className="label">理由:</span>
                      <span className="reason">{issue.violation_reason}</span>
                    </div>
                  </div>
                  <div className="issue-actions">
                    <button
                      className="btn btn-apply"
                      onClick={() => handleApply(issue)}
                      disabled={applyingId === issue.issue_id}
                    >
                      {applyingId === issue.issue_id ? '反映中...' : '反映'}
                    </button>
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

        {/* TeX Preview Section */}
        {texContent && (
          <section className="section">
            <h2>TeXプレビュー</h2>
            <textarea
              className="tex-preview"
              value={texContent}
              onChange={(e) => setTexContent(e.target.value)}
              spellCheck={false}
            />
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
