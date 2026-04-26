import { API_BASE_URL } from '../../config/api';
import { withLoading } from './withLoading';

export type ApiInvoice = {
  id: string;
  description: string;
  amount: number;
  payerId: string;
  participantIds: string[];
  divisionMethod: 'equal' | 'consumption';
  tipAmount?: number;
  birthdayPersonId?: string;
  items?: ApiInvoiceItem[];
};

export type ApiInvoiceItem = {
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
  participantIds: string[];
};

type CreateInvoicePayload = {
  description: string;
  totalAmount: number;
  payerId: string;
  participantIds: string[];
  divisionMethod: 'equal' | 'consumption';
  consumptions?: Record<string, number>;
  items?: Array<{
    name: string;
    unitPrice: number;
    quantity: number;
    participantIds: string[];
  }>;
  tipAmount?: number;
  birthdayPersonId?: string;
};

function buildHeaders() {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('mitimiti_auth_token')
      : null;
  if (!token) {
    throw new Error('NO_AUTH_TOKEN');
  }
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

function buildOptionalAuthHeaders(): HeadersInit | undefined {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('mitimiti_auth_token')
      : null;
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

export async function createInvoiceApi(
  eventId: string,
  payload: CreateInvoicePayload
): Promise<ApiInvoice> {
  return withLoading(async () => {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/invoices`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let details: unknown;
      try {
        details = await response.json();
      } catch {
        // ignore
      }
      const message =
        details &&
        typeof details === 'object' &&
        details !== null &&
        'message' in details &&
        typeof (details as Record<string, unknown>).message === 'string'
          ? (details as Record<string, string>).message
          : 'Failed to create invoice';
      throw new Error(message);
    }

    return response.json();
  });
}

export async function updateInvoiceApi(
  eventId: string,
  invoiceId: string,
  payload: CreateInvoicePayload
): Promise<ApiInvoice> {
  return withLoading(async () => {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/invoices/${invoiceId}`, {
      method: 'PATCH',
      headers: buildHeaders(),
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      let details: unknown
      try {
        details = await response.json()
      } catch {
        // ignore
      }
      const message =
        details &&
        typeof details === 'object' &&
        details !== null &&
        'message' in details &&
        typeof (details as Record<string, unknown>).message === 'string'
          ? (details as Record<string, string>).message
          : 'Failed to update invoice'
      throw new Error(message)
    }

    return response.json()
  })
}

export type ApiInvoiceDetail = {
  id: string;
  eventId: string;
  description: string;
  totalAmount: number;
  divisionMethod: 'equal' | 'consumption';
  payerId: string;
  payerName: string;
  tipAmount?: number;
  birthdayPersonId?: string;
  participations: Array<{
    participantId: string;
    participantName: string;
    amountAssigned: number;
    baseAmount: number;
    tipShare: number;
    isBirthdayPerson: boolean;
  }>;
  items?: ApiInvoiceItem[];
};

export async function listInvoicesApi(eventId: string): Promise<ApiInvoiceDetail[]> {
  return withLoading(async () => {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/invoices`, {
      method: 'GET',
      headers: buildHeaders()
    });
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    if (response.status === 404) {
      throw new Error('Event not found');
    }
    if (!response.ok) {
      throw new Error('Failed to fetch invoices');
    }
    return response.json();
  });
}

export async function getInvoiceApi(
  eventId: string,
  invoiceId: string
): Promise<ApiInvoiceDetail> {
  return withLoading(async () => {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/invoices/${invoiceId}`, {
      method: 'GET',
      headers: buildHeaders()
    });
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    if (response.status === 404) {
      throw new Error('Invoice not found');
    }
    if (!response.ok) {
      throw new Error('Failed to fetch invoice');
    }
    return response.json();
  });
}

export async function deleteInvoiceApi(eventId: string, invoiceId: string): Promise<void> {
  return withLoading(async () => {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/invoices/${invoiceId}`, {
      method: 'DELETE',
      headers: buildHeaders()
    });
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    if (response.status === 404) {
      throw new Error('Invoice not found');
    }
    if (!response.ok) {
      throw new Error('Failed to delete invoice');
    }
  });
}

export type ScanInvoiceResult = {
  description: string;
  subtotal: number | null;
  tipAmount: number | null;
  totalAmount: number | null;
  currency: string | null;
  date: string | null;
  items: Array<{
    name: string;
    unitPrice: number;
    quantity: number;
  }>;
  warnings?: string[];
};

export type ScanInvoiceStatus = {
  jobId: string;
  status: string;
  progress?: number;
  result?: ScanInvoiceResult;
  failedReason?: string;
};

export async function scanInvoiceApi(
  eventId: string,
  file: File
): Promise<{ jobId: string }> {
  const body = new FormData();
  body.append('file', file);

  return withLoading(async () => {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/invoices/scan`, {
      method: 'POST',
      headers: buildOptionalAuthHeaders(),
      body
    });

    if (!response.ok) {
      let details: unknown;
      try {
        details = await response.json();
      } catch {
        // ignore
      }
      const message =
        details &&
        typeof details === 'object' &&
        details !== null &&
        'message' in details &&
        typeof (details as Record<string, unknown>).message === 'string'
          ? (details as Record<string, string>).message
          : 'Failed to scan invoice';
      throw new Error(message);
    }

    return response.json();
  });
}

export async function getScanStatusApi(jobId: string): Promise<ScanInvoiceStatus> {
  const response = await fetch(`${API_BASE_URL}/invoices/scan/${jobId}`, {
    method: 'GET',
    headers: buildOptionalAuthHeaders()
  });
  if (response.status === 404) {
    throw new Error('Scan not found');
  }
  if (!response.ok) {
    throw new Error('Failed to fetch scan status');
  }
  return response.json();
}

export async function confirmScanApi(
  jobId: string,
  payload: CreateInvoicePayload & { eventId: string }
): Promise<ApiInvoice> {
  return withLoading(async () => {
    const response = await fetch(`${API_BASE_URL}/invoices/scan/${jobId}/confirm`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let details: unknown;
      try {
        details = await response.json();
      } catch {
        // ignore
      }
      const message =
        details &&
        typeof details === 'object' &&
        details !== null &&
        'message' in details &&
        typeof (details as Record<string, unknown>).message === 'string'
          ? (details as Record<string, string>).message
          : 'Failed to confirm scan';
      throw new Error(message);
    }

    return response.json();
  });
}

export async function retryScanApi(jobId: string): Promise<{ jobId: string }> {
  return withLoading(async () => {
    const response = await fetch(`${API_BASE_URL}/invoices/scan/${jobId}/retry`, {
      method: 'POST',
      headers: buildOptionalAuthHeaders()
    });

    if (!response.ok) {
      let details: unknown;
      try {
        details = await response.json();
      } catch {
        // ignore
      }
      const message =
        details &&
        typeof details === 'object' &&
        details !== null &&
        'message' in details &&
        typeof (details as Record<string, unknown>).message === 'string'
          ? (details as Record<string, string>).message
          : 'Failed to retry scan';
      throw new Error(message);
    }

    return response.json();
  });
}

export async function rescanInvoiceApi(
  jobId: string,
  eventId: string,
  file: File
): Promise<{ jobId: string }> {
  const body = new FormData();
  body.append('file', file);
  body.append('eventId', eventId);

  return withLoading(async () => {
    const response = await fetch(`${API_BASE_URL}/invoices/scan/${jobId}/rescan`, {
      method: 'POST',
      headers: buildOptionalAuthHeaders(),
      body
    });

    if (!response.ok) {
      let details: unknown;
      try {
        details = await response.json();
      } catch {
        // ignore
      }
      const message =
        details &&
        typeof details === 'object' &&
        details !== null &&
        'message' in details &&
        typeof (details as Record<string, unknown>).message === 'string'
          ? (details as Record<string, string>).message
          : 'Failed to rescan invoice';
      throw new Error(message);
    }

    return response.json();
  });
}
