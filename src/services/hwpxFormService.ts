const DEFAULT_HWPX_API_BASE_URL = 'http://127.0.0.1:8080';
const FALLBACK_HWPX_API_BASE_URL = 'http://localhost:8080';
const ENV_HWPX_API_BASE_URL = (import.meta as any)?.env?.VITE_HWPX_API_BASE_URL?.trim?.() || '';

export interface BidFormCandidate {
  fileName: string;
  fileUrl: string;
  extension: string;
  hwpx: boolean;
  source: 'bid-page' | 'open-data' | string;
}

export interface DownloadedBidFormFile {
  blob: Blob;
  fileName: string;
}

export interface DiscoverBidFormsInput {
  bidNtceNo: string;
  bidNtceOrd?: string;
  bidNtceUrl?: string;
  apiKey?: string;
  shouldEncodeKey?: boolean;
}

export const fillHwpxTemplate = async (
  templateFile: File,
  fields: Record<string, string>,
  outputFileName?: string,
  apiBaseUrl: string = DEFAULT_HWPX_API_BASE_URL
): Promise<Blob> => {
  const formData = new FormData();
  formData.append('templateFile', templateFile);
  formData.append('fieldsJson', JSON.stringify(fields));
  if (outputFileName) {
    formData.append('outputFileName', outputFileName);
  }

  const result = await fetchWithFallback('/api/hwpx/fill', {
    method: 'POST',
    body: formData
  }, apiBaseUrl);

  if (!result.response.ok) {
    const message = await safeReadText(result.response);
    throw new Error(message || `HWPX 양식 채우기에 실패했습니다. (HTTP ${result.response.status}, ${result.usedBaseUrl})`);
  }

  return result.response.blob();
};

export const discoverBidForms = async (
  input: DiscoverBidFormsInput,
  apiBaseUrl: string = DEFAULT_HWPX_API_BASE_URL
): Promise<BidFormCandidate[]> => {
  const searchParams = new URLSearchParams();
  searchParams.set('bidNtceNo', input.bidNtceNo);

  if (input.bidNtceOrd) {
    searchParams.set('bidNtceOrd', input.bidNtceOrd);
  }
  if (input.bidNtceUrl) {
    searchParams.set('bidNtceUrl', input.bidNtceUrl);
  }
  if (input.apiKey) {
    searchParams.set('apiKey', input.apiKey);
  }

  searchParams.set('shouldEncodeKey', String(input.shouldEncodeKey ?? true));

  const result = await fetchWithFallback(`/api/hwpx/forms/discover?${searchParams.toString()}`, {
    method: 'GET'
  }, apiBaseUrl);

  if (!result.response.ok) {
    const message = await safeReadText(result.response);
    throw new Error(message || `공고 양식 자동 조회에 실패했습니다. (HTTP ${result.response.status}, ${result.usedBaseUrl})`);
  }

  const data = await result.response.json();
  if (!Array.isArray(data)) {
    return [];
  }

  return data as BidFormCandidate[];
};

export const downloadBidFormFile = async (
  fileUrl: string,
  apiBaseUrl: string = DEFAULT_HWPX_API_BASE_URL
): Promise<DownloadedBidFormFile> => {
  const searchParams = new URLSearchParams();
  searchParams.set('fileUrl', fileUrl);

  const result = await fetchWithFallback(`/api/hwpx/forms/download?${searchParams.toString()}`, {
    method: 'GET'
  }, apiBaseUrl);

  if (!result.response.ok) {
    const message = await safeReadText(result.response);
    throw new Error(message || `양식 파일 다운로드에 실패했습니다. (HTTP ${result.response.status}, ${result.usedBaseUrl})`);
  }

  const blob = await result.response.blob();
  const disposition = result.response.headers.get('Content-Disposition') || result.response.headers.get('content-disposition');
  const fileName = parseFileNameFromDisposition(disposition) ?? extractNameFromUrl(fileUrl) ?? 'nara-form.hwpx';

  return { blob, fileName };
};

interface FetchResult {
  response: Response;
  usedBaseUrl: string;
}

const fetchWithFallback = async (
  path: string,
  init: RequestInit,
  preferredBaseUrl?: string
): Promise<FetchResult> => {
  const candidates = buildCandidateBaseUrls(preferredBaseUrl);
  const errors: string[] = [];

  for (const baseUrl of candidates) {
    try {
      const requestUrl = joinUrl(baseUrl, path);
      const response = await fetch(requestUrl, init);

      // When no dev proxy is configured, relative path can return Vite 404 HTML.
      if (!baseUrl && response.status === 404) {
        continue;
      }

      return { response, usedBaseUrl: baseUrl || window.location.origin };
    } catch (error) {
      errors.push(`${baseUrl || '(relative)'}: ${toErrorMessage(error)}`);
    }
  }

  throw new Error(buildConnectionError(errors));
};

const buildCandidateBaseUrls = (preferredBaseUrl?: string): string[] => {
  const bases = [
    preferredBaseUrl?.trim() || '',
    ENV_HWPX_API_BASE_URL,
    '',
    DEFAULT_HWPX_API_BASE_URL,
    FALLBACK_HWPX_API_BASE_URL
  ];

  const deduped: string[] = [];
  for (const base of bases) {
    if (base == null) {
      continue;
    }
    const normalized = base.trim();
    if (!deduped.includes(normalized)) {
      deduped.push(normalized);
    }
  }

  return deduped;
};

const joinUrl = (baseUrl: string, path: string): string => {
  if (!baseUrl) {
    return path;
  }

  return `${baseUrl.replace(/\/$/, '')}${path}`;
};

const safeReadText = async (response: Response): Promise<string> => {
  try {
    return (await response.text()).trim();
  } catch {
    return '';
  }
};

const buildConnectionError = (attemptErrors: string[]): string => {
  const detail = attemptErrors.length > 0
    ? ` (시도: ${attemptErrors.join(' | ')})`
    : '';

  return `HWPX 백엔드 연결에 실패했습니다. backend/hwpx-form-service가 실행 중인지 확인해주세요.${detail}`;
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

const parseFileNameFromDisposition = (disposition: string | null): string | null => {
  if (!disposition) {
    return null;
  }

  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const plainMatch = disposition.match(/filename="?([^"]+)"?/i);
  return plainMatch?.[1] ?? null;
};

const extractNameFromUrl = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    const file = parsed.pathname.split('/').pop();
    return file ? decodeURIComponent(file) : null;
  } catch {
    return null;
  }
};
