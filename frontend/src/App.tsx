import { useState } from 'react';
import type { Issue } from './types';
import { proofread, applyIssue, fileToBase64, readTextFile } from './api';
import CodeMirror from '@uiw/react-codemirror';
import { StreamLanguage } from '@codemirror/language';
import { stex } from '@codemirror/legacy-modes/mode/stex';
import { EditorView } from "@codemirror/view";
import './App.css';

function App() {
  // ファイルの状況
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [texContent, setTexContent] = useState<string>('');
  const [texFileName, setTexFileName] = useState<string>('');

  // 校正の状況
  const [issues, setIssues] = useState<Issue[]>([]);
  const [ignoredIssues, setIgnoredIssues] = useState<string[]>([]);
  const [roundNumber, setRoundNumber] = useState<number>(0);

  // UI
  const [loading, setLoading] = useState<boolean>(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [failedIssueIds, setFailedIssueIds] = useState<Set<string>>(new Set());
  // 簡略化: editingIssueId はモーダルで開いている指摘IDを追跡します
  const [editingIssueId, setEditingIssueId] = useState<string | null>(null);
  // モーダルではファイル全体を編集しますが、指摘箇所にフォーカスします
  // ファイル全体用の一時的な状態として modalTexContent を使用し、保存前に追跡します
  const [modalTexContent, setModalTexContent] = useState<string>('');

  const [isWaitingForNewPdf, setIsWaitingForNewPdf] = useState<boolean>(false);

  // PDFファイルの選択
  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPdfFile(file);
      setError(null);
    }
  };

  // TeXファイルの選択
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

  // 校正開始
  const handleProofread = async () => {
    if (!pdfFile || !texContent) {
      setError('PDFファイルとTeXファイルの両方をアップロードしてください');
      return;
    }

    // 校正プロセスが１以上でかつ，新しいPDFファイルが入力されていない場合
    if (roundNumber > 0 && !isWaitingForNewPdf) {
      setIsWaitingForNewPdf(true);
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    setIsWaitingForNewPdf(false);

    // 校正のAPIを叩く 
    try {
      const pdfBase64 = await fileToBase64(pdfFile);
      const response = await proofread({
        tex_content: texContent,
        pdf_base64: pdfBase64,
        ignored_issues: ignoredIssues,
        round_number: roundNumber,
      });

      console.log(response.issues)

      // 画面上に指摘事項を表示
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

  const handleReproofWithNewPdf = () => {
    handleProofread();
  };


  // 指摘事項を反映
  const handleApply = async (issue: Issue) => {
    setApplyingId(issue.issue_id);
    setError(null);

    try {
      const response = await applyIssue({
        tex_content: texContent,
        issue: issue,
      });

      if (response.success) {
        // 自動校正に成功したら
        // TeXファイルを更新
        setTexContent(response.new_tex_content);
        // 画面上の指摘事項を更新
        setIssues(issues.filter((i) => i.issue_id !== issue.issue_id));
        setMessage(`指摘「${issue.issue_id}」を反映しました`);
        // 失敗リストから削除
        const newFailed = new Set(failedIssueIds);
        newFailed.delete(issue.issue_id);
        setFailedIssueIds(newFailed);
        // 編集モードを終了
        if (editingIssueId === issue.issue_id) {
          setEditingIssueId(null);
          setModalTexContent('');
        }

      } else {
        // 自動校正に失敗したら
        setError(`反映に失敗しました：置換対象の文字列が見つかりませんでした。手動で編集してください。`);
        // 失敗リストに追加
        setFailedIssueIds(new Set(failedIssueIds).add(issue.issue_id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '反映処理でエラーが発生しました');
    } finally {
      setApplyingId(null);
    }
  };

  // 編集モードに入る（モーダルを開く）
  const handleEdit = (issue: Issue) => {
    setEditingIssueId(issue.issue_id);
    setModalTexContent(texContent); // Initialize with current global content
  };

  // モーダルから保存
  const handleSaveModal = () => {
    if (editingIssueId) {
      setTexContent(modalTexContent);
      // 手動修正によって指摘は解決したとみなしてリストから削除します
      setIssues(issues.filter(i => i.issue_id !== editingIssueId));

      // 失敗リストから削除
      const newFailed = new Set(failedIssueIds);
      if (newFailed.has(editingIssueId)) {
        newFailed.delete(editingIssueId);
        setFailedIssueIds(newFailed);
      }

      setEditingIssueId(null);
      setModalTexContent('');
      setMessage(`指摘「${editingIssueId}」を手動修正しました`);
    }
  };

  // 保存せずにモーダルを閉じる
  const handleCancelModal = () => {
    setEditingIssueId(null);
    setModalTexContent('');
  };

  // 指摘事項を無視リストに追加
  const handleIgnore = (issue: Issue) => {
    setIgnoredIssues([...ignoredIssues, issue.issue_id]);
    setIssues(issues.filter((i) => i.issue_id !== issue.issue_id));
    setMessage(`指摘「${issue.issue_id}」を無視リストに追加しました`);
  };

  // TeXファイルをダウンロード
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

  // 全てリセット
  const handleReset = () => {
    setPdfFile(null);
    setTexContent('');
    setTexFileName('');
    setIssues([]);
    setIgnoredIssues([]);
    setRoundNumber(0);
    setError(null);
    setMessage(null);
    setFailedIssueIds(new Set());
    setEditingIssueId(null);
    setModalTexContent('');
    setIsWaitingForNewPdf(false);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>論文校正システム</h1>
        <p className="subtitle">LLMによる学術論文の自動校正</p>
      </header>

      <main className="main">
        {/* ファイルアップロード */}
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

        {/* コントロールセクション */}
        <section className="section">
          <div className="controls">
            {!isWaitingForNewPdf ? (
              <button
                className="btn btn-primary"
                onClick={handleProofread}
                disabled={loading || !pdfFile || !texContent}
              >
                {loading ? '処理中...' : roundNumber === 0 ? '校正開始' : '再校正'}
              </button>
            ) : (
              <div className="reproof-prompt">
                <p>次ラウンドの校正のため、修正後のPDFをアップロードしてください。</p>
                <div className="upload-item">
                  <label htmlFor="reproof-pdf-input">修正後PDF:</label>
                  <input
                    id="reproof-pdf-input"
                    type="file"
                    accept=".pdf"
                    onChange={handlePdfChange}
                  />
                </div>
                <button
                  className="btn btn-primary"
                  onClick={handleReproofWithNewPdf}
                  disabled={loading || !pdfFile}
                >
                  再校正を開始
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setIsWaitingForNewPdf(false)}
                >
                  キャンセル
                </button>
              </div>
            )}

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
          {roundNumber > 0 && !isWaitingForNewPdf && (
            <div className="stats">
              <span>ラウンド: {roundNumber}</span>
              <span>無視済み: {ignoredIssues.length}件</span>
              <span>上限: 20ラウンド</span>
            </div>
          )}
        </section>

        {/* メッセージ/エラーメッセージ表示 */}
        {error && <div className="message error">{error}</div>}
        {message && <div className="message success">{message}</div>}

        {/* 指摘事項セクション */}
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
                    {failedIssueIds.has(issue.issue_id) && (
                      <div className="issue-error-msg">
                        自動反映に失敗しました。手動で編集してください。
                      </div>
                    )}
                  </div>
                  {editingIssueId !== issue.issue_id && (
                    <div className="issue-actions">
                      <button
                        className="btn btn-apply"
                        onClick={() => handleApply(issue)}
                        disabled={applyingId === issue.issue_id}
                      >
                        {applyingId === issue.issue_id ? '反映中...' : '反映'}
                      </button>
                      <button
                        className="btn btn-edit"
                        onClick={() => handleEdit(issue)}
                      >
                        手動修正
                      </button>
                      <button
                        className="btn btn-ignore"
                        onClick={() => handleIgnore(issue)}
                      >
                        無視
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Manual Edit Modal */}
        {editingIssueId && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>手動修正: #{editingIssueId}</h3>
                <button className="btn-close" onClick={handleCancelModal}>×</button>
              </div>
              <div className="modal-body">
                <div className="modal-info">
                  <div className="info-block">
                    <strong>修正前:</strong>
                    <pre>{issues.find(i => i.issue_id === editingIssueId)?.before_text}</pre>
                  </div>
                  <div className="info-block">
                    <strong>修正案:</strong>
                    <pre>{issues.find(i => i.issue_id === editingIssueId)?.after_text}</pre>
                  </div>
                </div>
                <div className="modal-editor">
                  <CodeMirror
                    value={modalTexContent}
                    height="100%"
                    extensions={[StreamLanguage.define(stex)]}
                    onChange={(value) => setModalTexContent(value)}
                    onCreateEditor={(view) => {
                      // 対象箇所へ自動スクロール
                      const issue = issues.find(i => i.issue_id === editingIssueId);
                      if (issue) {
                        const index = modalTexContent.indexOf(issue.before_text);
                        if (index !== -1) {
                          view.dispatch({
                            effects: EditorView.scrollIntoView(index, { y: "center" }),
                            selection: { anchor: index, head: index + issue.before_text.length }
                          });
                        }
                      }
                    }}
                    theme="light"
                    className="codemirror-wrapper"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <span className="hint">※エディタで直接修正してください</span>
                <div className="modal-actions">
                  <button className="btn btn-secondary" onClick={handleCancelModal}>キャンセル</button>
                  <button className="btn btn-primary" onClick={handleSaveModal}>修正を反映して完了</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TeXプレビュー */}
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
