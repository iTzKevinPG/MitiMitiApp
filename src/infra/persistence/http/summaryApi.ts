import { API_BASE_URL } from '../../config/api';
import { withLoading } from './withLoading';
import type { ApiInvoiceDetail } from './invoiceApi';
import type { ApiTransferStatusItem } from './transferStatusApi';

export type ApiSummaryItem = {
  participantId: string;
  participantName: string;
  totalPaid: number;
  totalShouldPay: number;
  netBalance: number;
  status: 'creditor' | 'debtor' | 'settled';
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

export async function getSummaryApi(eventId: string): Promise<ApiSummaryItem[]> {
  return withLoading(async () => {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/summary`, {
      method: 'GET',
      headers: buildHeaders()
    });
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED')
    }
    if (response.status === 404) {
      throw new Error('Event not found');
    }
    if (!response.ok) {
      throw new Error('Failed to fetch summary');
    }
    return response.json();
  });
}

export type ApiTransferItem = {
  fromParticipantId: string;
  fromName: string;
  toParticipantId: string;
  toName: string;
  amount: number;
};

export async function getTransfersApi(eventId: string): Promise<ApiTransferItem[]> {
  return withLoading(async () => {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/transfers`, {
      method: 'GET',
      headers: buildHeaders()
    });
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED')
    }
    if (response.status === 404) {
      throw new Error('Event not found');
    }
    if (!response.ok) {
      throw new Error('Failed to fetch transfers');
    }
    return response.json();
  });
}

export type ApiPublicOverview = {
  event: {
    id: string;
    name: string;
    currency: string;
  };
  participants: Array<{ id: string; name: string }>;
  invoices: ApiInvoiceDetail[];
  balances: ApiSummaryItem[];
  transfers: ApiTransferItem[];
  transferStatuses: ApiTransferStatusItem[];
};

export async function getPublicOverviewApi(eventId: string): Promise<ApiPublicOverview> {
  return withLoading(async () => {
    const response = await fetch(`${API_BASE_URL}/public/events/${eventId}/overview`, {
      method: 'GET'
    });
    if (response.status === 404) {
      throw new Error('Event not found');
    }
    if (!response.ok) {
      throw new Error('Failed to fetch public overview');
    }
    return response.json();
  });
}
