import { API_BASE_URL } from '../../config/api';
import { withLoading } from './withLoading';

type CreateEventPayload = {
  name: string;
  currency: string;
};

export type ApiEvent = {
  id: string;
  name: string;
  currency: string;
  peopleCount?: number;
  invoiceCount?: number;
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
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function createEventApi(
  payload: CreateEventPayload
): Promise<ApiEvent> {
  return withLoading(async () => {
    const response = await fetch(`${API_BASE_URL}/events`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let details: unknown;
      try {
        details = await response.json();
      } catch {
        // ignore parsing errors
      }
      throw new Error(
        details &&
        typeof details === 'object' &&
        details !== null &&
        'message' in details &&
        typeof (details as Record<string, unknown>).message === 'string'
          ? (details as Record<string, string>).message
          : 'Failed to create event'
      );
    }

    return response.json();
  });
}

export async function listEventsApi(): Promise<ApiEvent[]> {
  return withLoading(async () => {
    const response = await fetch(`${API_BASE_URL}/events`, {
      method: 'GET',
      headers: buildHeaders()
    });
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    if (!response.ok) {
      throw new Error('Failed to fetch events');
    }
    return response.json();
  });
}

export async function getEventApi(id: string): Promise<ApiEvent> {
  return withLoading(async () => {
    const response = await fetch(`${API_BASE_URL}/events/${id}`, {
      method: 'GET',
      headers: buildHeaders()
    });
    if (response.status === 404) {
      throw new Error('Event not found');
    }
    if (!response.ok) {
      throw new Error('Failed to fetch event');
    }
    return response.json();
  });
}

export async function deleteEventApi(id: string): Promise<void> {
  return withLoading(async () => {
    const response = await fetch(`${API_BASE_URL}/events/${id}`, {
      method: 'DELETE',
      headers: buildHeaders()
    });
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    if (response.status === 404) {
      throw new Error('Event not found');
    }
    if (!response.ok) {
      throw new Error('Failed to delete event');
    }
  });
}
