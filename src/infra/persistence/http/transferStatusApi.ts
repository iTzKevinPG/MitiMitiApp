import { API_BASE_URL } from '../../config/api'
import { withLoading } from './withLoading'

export type ApiTransferStatusItem = {
  fromParticipantId: string
  toParticipantId: string
  isSettled: boolean
  settledAt?: string | null
}

function buildHeaders() {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('mitimiti_auth_token')
      : null
  if (!token) {
    throw new Error('NO_AUTH_TOKEN')
  }
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export async function getTransferStatusApi(eventId: string): Promise<ApiTransferStatusItem[]> {
  return withLoading(async () => {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/transfer-status`, {
      method: 'GET',
      headers: buildHeaders(),
    })
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED')
    }
    if (!response.ok) {
      throw new Error('Failed to fetch transfer status')
    }
    return response.json()
  })
}

export async function upsertTransferStatusApi(
  eventId: string,
  payload: {
    fromParticipantId: string
    toParticipantId: string
    isSettled: boolean
  },
): Promise<ApiTransferStatusItem> {
  return withLoading(async () => {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/transfer-status`, {
      method: 'PUT',
      headers: buildHeaders(),
      body: JSON.stringify(payload),
    })
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED')
    }
    if (!response.ok) {
      throw new Error('Failed to update transfer status')
    }
    return response.json()
  })
}
