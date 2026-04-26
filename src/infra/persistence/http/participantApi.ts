import { API_BASE_URL } from '../../config/api';
import { withLoading } from './withLoading';

export type ApiParticipant = {
  id: string;
  name: string;
  eventId: string;
};

type CreateParticipantPayload = {
  name: string;
};

type UpdateParticipantPayload = {
  name: string;
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

export async function listParticipantsApi(eventId: string): Promise<ApiParticipant[]> {
  return withLoading(async () => {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/participants`, {
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
      throw new Error('Failed to fetch participants');
    }
    return response.json();
  });
}

export async function createParticipantApi(
  eventId: string,
  payload: CreateParticipantPayload
): Promise<ApiParticipant> {
  return withLoading(async () => {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/participants`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(payload)
    });
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    if (!response.ok) {
      let details: unknown;
      try {
        details = await response.json();
      } catch {
        // ignore
      }
      throw new Error(
        details &&
        typeof details === 'object' &&
        details !== null &&
        'message' in details &&
        typeof (details as Record<string, unknown>).message === 'string'
          ? (details as Record<string, string>).message
          : 'Failed to create participant'
      );
    }
    return response.json();
  });
}

export async function updateParticipantApi(
  eventId: string,
  participantId: string,
  payload: UpdateParticipantPayload
): Promise<ApiParticipant> {
  return withLoading(async () => {
    const response = await fetch(
      `${API_BASE_URL}/events/${eventId}/participants/${participantId}`,
      {
        method: 'PATCH',
        headers: buildHeaders(),
        body: JSON.stringify(payload)
      }
    );
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    if (response.status === 404) {
      throw new Error('Participant not found');
    }
    if (!response.ok) {
      throw new Error('Failed to update participant');
    }
    return response.json();
  });
}

export async function deleteParticipantApi(
  eventId: string,
  participantId: string
): Promise<void> {
  return withLoading(async () => {
    const response = await fetch(
      `${API_BASE_URL}/events/${eventId}/participants/${participantId}`,
      {
        method: 'DELETE',
        headers: buildHeaders()
      }
    );
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    if (response.status === 404) {
      throw new Error('Participant not found');
    }
    if (!response.ok) {
      let details: unknown;
      try {
        details = await response.json();
      } catch {
        // ignore
      }
      const apiMessage =
        details &&
        typeof details === 'object' &&
        details !== null &&
        'message' in details &&
        typeof (details as Record<string, unknown>).message === 'string'
          ? (details as Record<string, string>).message
          : null;
      const apiCode =
        details &&
        typeof details === 'object' &&
        details !== null &&
        'code' in details &&
        typeof (details as Record<string, unknown>).code === 'string'
          ? (details as Record<string, string>).code
          : null;
      const businessMessage =
        apiCode === 'PARTICIPANT_HAS_INVOICES' ||
        (apiMessage && apiMessage.toLowerCase().includes('associated invoices'))
          ? 'No puedes eliminar este participante porque tiene gastos o consumos asociados.'
          : null;
      const message =
        businessMessage ?? apiMessage ?? 'Failed to delete participant';
      throw new Error(message);
    }
  });
}
