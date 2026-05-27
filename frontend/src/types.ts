// API Types matching backend schemas

export interface Issue {
  issue_id: string;
  before_text: string;
  after_text: string;
  checklist_item: string;
  violation_reason: string;
}

export interface ProofreadRequest {
  pdf_base64: string;
  tex_source: string;
  ignored_issues: Issue[];
  round_number: number;
}

export interface ProofreadResponse {
  issues: Issue[];
  round_number: number;
}
