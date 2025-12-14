import type { ProofreadRequest, ProofreadResponse, ApplyRequest, ApplyResponse } from './types';

const API_BASE_URL = 'http://localhost:8000/api';

export async function proofread(request: ProofreadRequest): Promise<ProofreadResponse> {
  const response = await fetch(`${API_BASE_URL}/proofread/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Proofread API error: ${response.status}`);
  }

  return response.json();
}

export async function applyIssue(request: ApplyRequest): Promise<ApplyResponse> {
  const response = await fetch(`${API_BASE_URL}/proofread/apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Apply API error: ${response.status}`);
  }

  return response.json();
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:application/pdf;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

export function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}
