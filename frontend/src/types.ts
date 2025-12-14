// API Types matching backend schemas

export interface Issue {
  issue_id: string;
  before_text: string;
  after_text: string;
  checklist_item: string;
  violation_reason: string;
}

export interface ProofreadRequest {
  tex_content: string;
  pdf_base64: string;
  ignored_issues: string[];
  round_number: number;
}

export interface ProofreadResponse {
  issues: Issue[];
  round_number: number;
}

export interface ApplyRequest {
  tex_content: string;
  issue: Issue;
}

export interface ApplyResponse {
  success: boolean;
  new_tex_content: string;
}
