import { create } from 'zustand'
import type { StoreApi } from 'zustand'
import type { Balance } from '../../domain/settlement/Balance'
import type { Event, EventId } from '../../domain/event/Event'
import type { Invoice } from '../../domain/invoice/Invoice'
import type { Person } from '../../domain/person/Person'
import { calculateBalances, suggestTransfers } from '../../domain/settlement/SettlementService'
import type { SettlementTransfer } from '../../domain/settlement/SettlementTransfer'
import type { TransferStatus } from '../../domain/settlement/TransferStatus'
import { addInvoiceToEvent } from '../../application/use-cases/addInvoiceToEvent'
import { addPersonToEvent } from '../../application/use-cases/addPersonToEvent'
import { calculateSettlement } from '../../application/use-cases/calculateSettlement'
import { createEvent } from '../../application/use-cases/createEvent'
import { removeInvoiceFromEvent } from '../../application/use-cases/removeInvoiceFromEvent'
import { removePersonFromEvent } from '../../application/use-cases/removePersonFromEvent'
import { updateInvoiceInEvent } from '../../application/use-cases/updateInvoiceInEvent'
import { updatePersonInEvent } from '../../application/use-cases/updatePersonInEvent'
import type {
  AddInvoiceInput,
  AddPersonInput,
  CreateEventInput,
  RemoveInvoiceInput,
  RemovePersonInput,
  UpdateInvoiceInput,
  UpdatePersonInput,
} from '../../application/dto/eventDtos'
import { InMemoryEventRepository } from '../../infra/persistence/in-memory/InMemoryEventRepository'
import { InMemoryPersonRepository } from '../../infra/persistence/in-memory/InMemoryPersonRepository'
import { InMemoryInvoiceRepository } from '../../infra/persistence/in-memory/InMemoryInvoiceRepository'
import {
  createEventApi,
  deleteEventApi,
  getEventApi,
  listEventsApi,
} from '../../infra/persistence/http/eventApi'
import {
  createParticipantApi,
  deleteParticipantApi,
  listParticipantsApi,
  updateParticipantApi,
} from '../../infra/persistence/http/participantApi'
import {
  createInvoiceApi,
  deleteInvoiceApi,
  listInvoicesApi,
  updateInvoiceApi,
} from '../../infra/persistence/http/invoiceApi'
import { getSummaryApi, getTransfersApi, getPublicOverviewApi } from '../../infra/persistence/http/summaryApi'
import { getTransferStatusApi, upsertTransferStatusApi } from '../../infra/persistence/http/transferStatusApi'
import { STORAGE_EXPIRED_FLAG } from './authStore'
import { toast } from '../../shared/components/ui/sonner'

const eventRepository = new InMemoryEventRepository()
const personRepository = new InMemoryPersonRepository(eventRepository)
const invoiceRepository = new InMemoryInvoiceRepository(eventRepository)
let demoSeeded = false
const loadedEventData = new Set<string>()
const loadingEventData = new Set<string>()
// NOTE: key kept as 'fairsplit_local_state' intentionally — renaming would wipe existing user data.
// Migrate with a dual-key fallback in a future release.
const LOCAL_STORAGE_KEY = 'fairsplit_local_state'

type LocalState = Pick<
  AppState,
  'events' | 'selectedEventId' | 'transferStatusesByEvent' | 'hasSeededDemo'
>

function readLocalState(): LocalState | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as LocalState
  } catch {
    return null
  }
}

function writeLocalState(state: AppState) {
  if (typeof window === 'undefined') return
  const payload: LocalState = {
    events: state.events,
    selectedEventId: state.selectedEventId,
    transferStatusesByEvent: state.transferStatusesByEvent,
    hasSeededDemo: state.hasSeededDemo,
  }
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload))
}

function getAuthToken(): string | null {
  return typeof window !== 'undefined'
    ? localStorage.getItem('fairsplit_auth_token')
    : null
}

function showToast(
  message: string,
  tone: 'info' | 'success' | 'warning' | 'error' = 'info',
  durationMs?: number,
) {
  const style =
    tone === 'success'
      ? {
          borderColor: 'var(--color-accent-success)',
          backgroundColor: 'var(--color-success-bg)',
          color: 'var(--color-text-main)',
        }
      : tone === 'warning'
      ? {
          borderColor: 'var(--color-accent-warning)',
          backgroundColor: 'var(--color-warning-bg)',
          color: '#ffffff',
        }
      : tone === 'error'
      ? {
          borderColor: 'var(--color-accent-danger)',
          backgroundColor: 'var(--color-danger-bg)',
          color: 'var(--color-text-main)',
        }
      : undefined
  const options = {
    ...(durationMs ? { duration: durationMs } : {}),
    ...(style ? { style } : {}),
  }
  if (tone === 'success') {
    toast.success(message, options)
  } else if (tone === 'warning') {
    toast.warning(message, options)
  } else if (tone === 'error') {
    toast.error(message, options)
  } else {
    toast(message, options)
  }
}

function notifyApiFailure(action: string) {
  showToast(`No se pudo ${action} en la nube. No se aplicaron cambios locales.`, 'error')
}

function notifySessionExpired() {
  showToast(
    'Tu sesion expiro. Vuelve al inicio para configurar tu perfil.',
    'warning',
    3000,
  )
}

async function ensureAuthOrRedirect(): Promise<string | null> {
  const token = getAuthToken()
  if (token) return token
  const expired =
    typeof window !== 'undefined' &&
    localStorage.getItem(STORAGE_EXPIRED_FLAG) === 'true'
  if (expired && typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_EXPIRED_FLAG)
    notifySessionExpired()
  }
  return null
}

async function handleUnauthorizedAndRedirect() {
  try {
    const { useAuthStore } = await import('./authStore')
    useAuthStore.getState().clearAuth({ redirect: false, expired: true })
  } catch {
    // ignore
  }
  if (typeof window !== 'undefined') {
    // evitar alertas duplicadas: consumimos el flag de expirado
    localStorage.removeItem(STORAGE_EXPIRED_FLAG)
    notifySessionExpired()
    window.setTimeout(() => {
      window.location.assign('/')
    }, 3000)
  }
}

interface AppState {
  events: Event[]
  selectedEventId?: EventId
  hasSeededDemo: boolean
  hasHydrated: boolean
  transferStatusesByEvent: Record<string, Record<string, TransferStatus>>
  hydrate: (options?: { loadDetails?: boolean }) => Promise<void>
  seedDemoData: () => Promise<void>
  selectEvent: (eventId: EventId) => Promise<void>
  createEvent: (input: CreateEventInput) => Promise<Event | undefined>
  removeEvent: (eventId: EventId) => Promise<void>
  addPerson: (input: Omit<AddPersonInput, 'eventId'>) => Promise<Event | undefined>
  updatePerson: (
    input: Omit<UpdatePersonInput, 'eventId'>,
  ) => Promise<Event | undefined>
  removePerson: (
    input: Omit<RemovePersonInput, 'eventId'>,
  ) => Promise<Event | undefined>
  addInvoice: (
    input: Omit<AddInvoiceInput, 'eventId'>,
  ) => Promise<Event | undefined>
  updateInvoice: (
    input: Omit<UpdateInvoiceInput, 'eventId'>,
  ) => Promise<Event | undefined>
  removeInvoice: (
    input: Omit<RemoveInvoiceInput, 'eventId'>,
  ) => Promise<Event | undefined>
  getSelectedEvent: () => Event | undefined
  getBalances: () => Balance[]
  getTransfers: () => SettlementTransfer[]
  getTransferStatusMap: (eventId: EventId) => Record<string, TransferStatus>
  isEventLoaded: (eventId: EventId) => boolean
  isEventLoading: (eventId: EventId) => boolean
  loadPublicOverview: (eventId: EventId, options?: { force?: boolean }) => Promise<void>
  loadTransferStatuses: (eventId: EventId) => Promise<void>
  loadEventDetailsForList: (eventIds: EventId[]) => Promise<void>
  refreshEventDetails: (eventId: EventId) => Promise<void>
  setTransferStatus: (input: {
    eventId: EventId
    fromPersonId: string
    toPersonId: string
    isSettled: boolean
  }) => Promise<void>
  getSettlement: () => Promise<{
    balances: Balance[]
    transfers: SettlementTransfer[]
  } | null>
  resetForLogout: () => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  events: [],
  selectedEventId: undefined,
  hasSeededDemo: false,
  hasHydrated: false,
  transferStatusesByEvent: {},
  hydrate: async (options) => {
    // Fetch event headers only; load details lazily per event to reduce calls.
    const token = getAuthToken()
    let localState = token ? null : readLocalState()
    const hasInMemoryEvents = get().events.length > 0
    let shouldApplyLocalState = Boolean(localState) && !hasInMemoryEvents

    if (token) {
      try {
        const existing = await eventRepository.list()
        await Promise.all(existing.map((event) => eventRepository.delete(event.id)))
        loadedEventData.clear()
        const apiEvents = await listEventsApi()
        apiEvents.forEach((apiEvent) => {
          eventRepository.save({
            id: apiEvent.id,
            name: apiEvent.name,
            currency: apiEvent.currency,
            people: [],
            invoices: [],
            peopleCount: apiEvent.peopleCount,
            invoiceCount: apiEvent.invoiceCount,
          })
        })
      } catch (error) {
        if ((error as Error).message === 'UNAUTHORIZED') {
          // Clear auth and fall back to guest mode
          try {
            // lazy import to avoid circular deps
            const { useAuthStore } = await import('./authStore')
            useAuthStore.getState().clearAuth({ redirect: false, expired: true })
          } catch {
            // ignore
          }
          localState = readLocalState()
          shouldApplyLocalState = Boolean(localState)
        } else {
          console.warn('Falling back to local events; backend list failed', error)
        }
      }
    } else if (shouldApplyLocalState && localState) {
      const existing = await eventRepository.list()
      await Promise.all(existing.map((event) => eventRepository.delete(event.id)))
      loadedEventData.clear()
      await Promise.all(localState.events.map((event) => eventRepository.save(event)))
    }

    const events = await eventRepository.list()
    const selectedFromLocal = localState?.selectedEventId
    const selectedFromState = get().selectedEventId
    const selected =
      (selectedFromLocal &&
        events.some((event) => event.id === selectedFromLocal)
        ? selectedFromLocal
        : selectedFromState &&
          events.some((event) => event.id === selectedFromState)
        ? selectedFromState
        : events[0]?.id) ?? undefined
    set({
      events,
      selectedEventId: selected,
      transferStatusesByEvent: shouldApplyLocalState
        ? localState?.transferStatusesByEvent ?? {}
        : get().transferStatusesByEvent,
      hasSeededDemo: shouldApplyLocalState
        ? localState?.hasSeededDemo ?? false
        : get().hasSeededDemo,
      hasHydrated: true,
    })

    if (selected && (options?.loadDetails ?? true)) {
      void loadEventData(selected, set)
      if (token) {
        void get().loadTransferStatuses(selected)
      }
    }
  },
  seedDemoData: async () => {
    if (demoSeeded || get().hasSeededDemo) return
    demoSeeded = true

    const current = await eventRepository.list()
    if (current.length > 0) {
      set({ hasSeededDemo: true })
      return
    }

    const event = await createEvent(eventRepository, {
      name: 'Salida demo',
      currency: 'USD',
    })

    await addPersonToEvent(eventRepository, personRepository, {
      eventId: event.id,
      name: 'Ana',
    })
    await addPersonToEvent(eventRepository, personRepository, {
      eventId: event.id,
      name: 'Ben',
    })
    await addPersonToEvent(eventRepository, personRepository, {
      eventId: event.id,
      name: 'Carla',
    })

    const loaded = await eventRepository.getById(event.id)
    if (!loaded) return

    await addInvoiceToEvent(eventRepository, invoiceRepository, {
      eventId: loaded.id,
      description: 'Cena',
      amount: 90,
      payerId: loaded.people[0].id,
      participantIds: loaded.people.map((p) => p.id),
    })

    const finalEvent = await eventRepository.getById(event.id)
    if (!finalEvent) return

    set(() => ({
      events: [finalEvent],
      selectedEventId: finalEvent.id,
      hasSeededDemo: true,
    }))
  },
  selectEvent: async (eventId: EventId) => {
    const existing = await eventRepository.getById(eventId)
    if (!existing) {
      set({ selectedEventId: undefined })
      return
    }
    set({ selectedEventId: eventId })
    if (!loadedEventData.has(eventId)) {
      void loadEventData(eventId, set)
    }
    const token = getAuthToken()
    if (token) {
      void get().loadTransferStatuses(eventId)
    }
  },
  createEvent: async (input) => {
    let backendId: string | undefined
    const token = await ensureAuthOrRedirect()
    if (token) {
      try {
        const response = await createEventApi({
          name: input.name,
          currency: input.currency,
        })
        backendId = response.id
      } catch (error) {
        if ((error as Error).message === 'UNAUTHORIZED') {
          await handleUnauthorizedAndRedirect()
          return undefined
        }
        console.error('Failed to persist event to backend', error)
        notifyApiFailure('crear el evento')
        return undefined
      }
    }

    const created = await createEvent(eventRepository, { ...input, id: backendId })
    const events = await eventRepository.list()
    set({
      events,
      selectedEventId: created.id,
    })
    return created
  },
  removeEvent: async (eventId: EventId) => {
    const token = await ensureAuthOrRedirect()
    if (token) {
      try {
        await deleteEventApi(eventId)
      } catch (error) {
        if ((error as Error).message === 'UNAUTHORIZED') {
          await handleUnauthorizedAndRedirect()
          return
        }
        console.error('Failed to delete event in backend', error)
        notifyApiFailure('eliminar el evento')
        return
      }
    }

    await eventRepository.delete(eventId)
    loadedEventData.delete(eventId)
    const events = await eventRepository.list()
    set((state) => {
      const nextSelected =
        state.selectedEventId === eventId
          ? events[0]?.id
          : state.selectedEventId
      return {
        events,
        selectedEventId: nextSelected,
        transferStatusesByEvent: Object.fromEntries(
          Object.entries(state.transferStatusesByEvent).filter(
            ([key]) => key !== eventId,
          ),
        ),
      }
    })
  },
  addPerson: async (input) => {
    const eventId = get().selectedEventId
    if (!eventId) return undefined
    let participantId: string | undefined
    const token = await ensureAuthOrRedirect()
    if (token) {
      try {
        const created = await createParticipantApi(eventId, { name: input.name })
        participantId = created.id
      } catch (error) {
        if ((error as Error).message === 'UNAUTHORIZED') {
          await handleUnauthorizedAndRedirect()
          return undefined
        }
        console.error('Failed to persist participant to backend', error)
        notifyApiFailure('crear el participante')
        return undefined
      }
    }

    const event = await addPersonToEvent(eventRepository, personRepository, {
      ...input,
      id: participantId,
      eventId,
    })
    if (!event) return undefined
    set((state) => ({
      events: state.events.map((item) =>
        item.id === event.id ? event : item,
      ),
    }))
    return event
  },
  updatePerson: async (input) => {
    const eventId = get().selectedEventId
    if (!eventId) return undefined
    const token = await ensureAuthOrRedirect()
    if (token) {
      try {
        await updateParticipantApi(eventId, input.personId, { name: input.name })
      } catch (error) {
        if ((error as Error).message === 'UNAUTHORIZED') {
          await handleUnauthorizedAndRedirect()
          return undefined
        }
        console.error('Failed to update participant in backend', error)
        notifyApiFailure('actualizar el participante')
        return undefined
      }
    }
    const event = await updatePersonInEvent(
      eventRepository,
      personRepository,
      {
        ...input,
        eventId,
      },
    )
    if (!event) return undefined
    set((state) => ({
      events: state.events.map((item) =>
        item.id === event.id ? event : item,
      ),
    }))
    return event
  },
  removePerson: async (input) => {
    const eventId = get().selectedEventId
    if (!eventId) return undefined
    const token = await ensureAuthOrRedirect()
    if (token) {
      try {
        await deleteParticipantApi(eventId, input.personId)
      } catch (error) {
        if ((error as Error).message === 'UNAUTHORIZED') {
          await handleUnauthorizedAndRedirect()
          return undefined
        }
        console.error('Failed to delete participant in backend', error)
        const message = (error as Error).message
        if (
          message.includes('No puedes eliminar') ||
          message.includes('Cannot delete participant')
        ) {
          const friendly = message.includes('Cannot delete participant')
            ? 'No puedes eliminar este participante porque tiene gastos o consumos asociados.'
            : message
          showToast(friendly, 'warning', 3500)
        } else {
          notifyApiFailure('eliminar el participante')
        }
        return undefined
      }
    }
    const event = await removePersonFromEvent(
      eventRepository,
      {
        ...input,
        eventId,
      },
    )
    if (!event) return undefined
    set((state) => ({
      events: state.events.map((item) =>
        item.id === event.id ? event : item,
      ),
    }))
    return event
  },
  addInvoice: async (input) => {
    const eventId = get().selectedEventId
    if (!eventId) return undefined
    let invoiceId: string | undefined
    const token = await ensureAuthOrRedirect()
    if (token) {
      try {
        const created = await createInvoiceApi(eventId, {
          description: input.description,
          totalAmount: input.amount,
          payerId: input.payerId,
          participantIds: input.participantIds,
          divisionMethod: input.divisionMethod ?? 'equal',
          consumptions: input.consumptions,
          items: input.items?.map((item) => ({
            name: item.name,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            participantIds: item.participantIds,
          })),
          tipAmount: input.tipAmount,
          birthdayPersonId: input.birthdayPersonId,
        })
        invoiceId = created.id
      } catch (error) {
        if ((error as Error).message === 'UNAUTHORIZED') {
          await handleUnauthorizedAndRedirect()
          return undefined
        }
        console.error('Failed to persist invoice to backend', error)
        notifyApiFailure('crear la factura')
        return undefined
      }
    }

    const event = await addInvoiceToEvent(
      eventRepository,
      invoiceRepository,
      {
        id: invoiceId,
        ...input,
        eventId,
      },
    )
    if (!event) return undefined
    set((state) => ({
      events: state.events.map((item) =>
        item.id === event.id ? event : item,
      ),
    }))
    return event
  },
  updateInvoice: async (input) => {
    const eventId = get().selectedEventId
    if (!eventId) return undefined
    const token = await ensureAuthOrRedirect()
    if (token) {
      try {
        await updateInvoiceApi(eventId, input.invoiceId, {
          description: input.description,
          totalAmount: input.amount,
          payerId: input.payerId,
          participantIds: input.participantIds,
          divisionMethod: input.divisionMethod ?? 'equal',
          consumptions: input.consumptions,
          items: input.items?.map((item) => ({
            name: item.name,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            participantIds: item.participantIds,
          })),
          tipAmount: input.tipAmount,
          birthdayPersonId: input.birthdayPersonId,
        })
      } catch (error) {
        if ((error as Error).message === 'UNAUTHORIZED') {
          await handleUnauthorizedAndRedirect()
          return undefined
        }
        console.error('Failed to update invoice in backend', error)
        notifyApiFailure('actualizar la factura')
        return undefined
      }
    }
    const event = await updateInvoiceInEvent(
      eventRepository,
      invoiceRepository,
      {
        ...input,
        eventId,
      },
    )
    if (!event) return undefined
    set((state) => ({
      events: state.events.map((item) =>
        item.id === event.id ? event : item,
      ),
    }))
    return event
  },
  removeInvoice: async (input) => {
    const eventId = get().selectedEventId
    if (!eventId) return undefined
    const token = await ensureAuthOrRedirect()
    if (token) {
      try {
        await deleteInvoiceApi(eventId, input.invoiceId)
      } catch (error) {
        if ((error as Error).message === 'UNAUTHORIZED') {
          await handleUnauthorizedAndRedirect()
          return undefined
        }
        console.error('Failed to delete invoice in backend', error)
        notifyApiFailure('eliminar la factura')
        return undefined
      }
    }
    const event = await removeInvoiceFromEvent(
      eventRepository,
      invoiceRepository,
      {
        ...input,
        eventId,
      },
    )
    if (!event) return undefined
    set((state) => ({
      events: state.events.map((item) =>
        item.id === event.id ? event : item,
      ),
    }))
    return event
  },
  getSelectedEvent: () => {
    const { events, selectedEventId } = get()
    return events.find((event) => event.id === selectedEventId)
  },
  getBalances: () => {
    const event = get().getSelectedEvent()
    return event ? calculateBalances(event) : []
  },
  getTransfers: () => {
    const eventId = get().selectedEventId
    if (!eventId) return []
    const balances = get().getBalances()
    return suggestTransfers(balances)
  },
  getTransferStatusMap: (eventId: EventId) => {
    return get().transferStatusesByEvent[eventId] ?? {}
  },
  isEventLoaded: (eventId: EventId) => loadedEventData.has(eventId),
  isEventLoading: (eventId: EventId) => loadingEventData.has(eventId),
  loadPublicOverview: async (
    eventId: EventId,
    options?: { force?: boolean },
  ) => {
    const force = options?.force ?? false
    if (!force && (loadedEventData.has(eventId) || loadingEventData.has(eventId))) {
      return
    }
    if (force) {
      loadedEventData.delete(eventId)
    }
    loadingEventData.add(eventId)
    try {
      const payload = await getPublicOverviewApi(eventId)
      const people = payload.participants.map((person) => ({
        id: person.id,
        name: person.name,
      }))
      const invoices = payload.invoices.map((det) => {
        const consumptions = det.participations.reduce<Record<string, number>>((acc, p) => {
          acc[p.participantId] = p.baseAmount
          return acc
        }, {})
        return {
          id: det.id,
          description: det.description,
          amount: det.totalAmount,
          payerId: det.payerId,
          participantIds: det.participations.map((p) => p.participantId),
          divisionMethod: det.divisionMethod,
          consumptions,
          items: det.items?.map((item) => ({
            id: item.id,
            name: item.name,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            participantIds: item.participantIds,
          })),
          tipAmount: det.tipAmount,
          birthdayPersonId: det.birthdayPersonId,
        }
      })
      const transferStatusMap = (payload.transferStatuses ?? []).reduce<
        Record<string, TransferStatus>
      >((acc, status) => {
        const key = buildTransferStatusKey(status.fromParticipantId, status.toParticipantId)
        acc[key] = {
          eventId: payload.event.id,
          fromPersonId: status.fromParticipantId,
          toPersonId: status.toParticipantId,
          isSettled: status.isSettled,
          settledAt: status.settledAt ?? null,
        }
        return acc
      }, {})

      await eventRepository.save({
        id: payload.event.id,
        name: payload.event.name,
        currency: payload.event.currency,
        people,
        invoices,
        peopleCount: people.length,
        invoiceCount: invoices.length,
        isPublic: true,
      })

      const events = await eventRepository.list()
      set((state) => ({
        events,
        selectedEventId: state.selectedEventId ?? payload.event.id,
        transferStatusesByEvent: {
          ...state.transferStatusesByEvent,
          [payload.event.id]: transferStatusMap,
        },
      }))
      loadedEventData.add(eventId)
    } catch (error) {
      console.warn(`Failed to load public overview for ${eventId}`, error)
    } finally {
      loadingEventData.delete(eventId)
    }
  },
  loadTransferStatuses: async (eventId: EventId) => {
    const token = await ensureAuthOrRedirect()
    if (!token) return
    try {
      const statuses = await getTransferStatusApi(eventId)
      const map = statuses.reduce<Record<string, TransferStatus>>((acc, status) => {
        const key = buildTransferStatusKey(
          status.fromParticipantId,
          status.toParticipantId,
        )
        acc[key] = {
          eventId,
          fromPersonId: status.fromParticipantId,
          toPersonId: status.toParticipantId,
          isSettled: status.isSettled,
          settledAt: status.settledAt ?? null,
        }
        return acc
      }, {})
      set((state) => ({
        transferStatusesByEvent: {
          ...state.transferStatusesByEvent,
          [eventId]: map,
        },
      }))
    } catch (error) {
      if ((error as Error).message === 'UNAUTHORIZED') {
        await handleUnauthorizedAndRedirect()
        return
      }
      console.warn('Failed to fetch transfer statuses', error)
    }
  },
  loadEventDetailsForList: async (eventIds: EventId[]) => {
    if (eventIds.length === 0) return
    const pending = eventIds.filter((id) => !loadedEventData.has(id))
    if (pending.length === 0) return
    await Promise.all(pending.map((id) => loadEventData(id, set)))
  },
  refreshEventDetails: async (eventId: EventId) => {
    loadedEventData.delete(eventId)
    loadingEventData.delete(eventId)
    await loadEventData(eventId, set)
  },
  setTransferStatus: async (input) => {
    const { eventId, fromPersonId, toPersonId, isSettled } = input
    const key = buildTransferStatusKey(fromPersonId, toPersonId)
    set((state) => ({
      transferStatusesByEvent: {
        ...state.transferStatusesByEvent,
        [eventId]: {
          ...(state.transferStatusesByEvent[eventId] ?? {}),
          [key]: {
            eventId,
            fromPersonId,
            toPersonId,
            isSettled,
            settledAt: isSettled ? new Date().toISOString() : null,
          },
        },
      },
    }))

    const token = await ensureAuthOrRedirect()
    if (!token) {
      return
    }
    try {
      const updated = await upsertTransferStatusApi(eventId, {
        fromParticipantId: fromPersonId,
        toParticipantId: toPersonId,
        isSettled,
      })
      set((state) => ({
        transferStatusesByEvent: {
          ...state.transferStatusesByEvent,
          [eventId]: {
            ...(state.transferStatusesByEvent[eventId] ?? {}),
            [key]: {
              eventId,
              fromPersonId,
              toPersonId,
              isSettled: updated.isSettled,
              settledAt: updated.settledAt ?? null,
            },
          },
        },
      }))
    } catch (error) {
      if ((error as Error).message === 'UNAUTHORIZED') {
        await handleUnauthorizedAndRedirect()
        return
      }
      console.error('Failed to update transfer status', error)
      notifyApiFailure('actualizar el estado de transferencia')
    }
  },
  getSettlement: async () => {
    const eventId = get().selectedEventId
    if (!eventId) return null
    const token = await ensureAuthOrRedirect()
    try {
      const summaryPromise = getSummaryApi(eventId)
      const transfersPromise = getTransfersApi(eventId).catch(() => null)

      const [summary, transfers] = await Promise.all([summaryPromise, transfersPromise])
      const balances: Balance[] = summary.map((item) => ({
        personId: item.participantId,
        totalPaid: item.totalPaid,
        totalOwed: item.totalShouldPay,
        net: item.netBalance,
      }))
      return {
        balances,
        transfers:
          transfers?.map((t) => ({
            fromPersonId: t.fromParticipantId,
            toPersonId: t.toParticipantId,
            amount: t.amount,
          })) ?? suggestTransfers(balances),
      }
    } catch (error) {
      console.error('Failed to fetch summary from backend', error)
      if (token) {
        notifyApiFailure('calcular el resumen')
        return null
      }
      return calculateSettlement(eventRepository, eventId)
    }
  },
  resetForLogout: async () => {
    const existing = await eventRepository.list()
    await Promise.all(existing.map((event) => eventRepository.delete(event.id)))
    loadedEventData.clear()
    demoSeeded = false
    set({
      events: [],
      selectedEventId: undefined,
      hasSeededDemo: false,
      transferStatusesByEvent: {},
    })
  },
}))

if (typeof window !== 'undefined') {
  let saveTimeout: number | null = null
  useAppStore.subscribe((state) => {
    if (getAuthToken()) return
    if (saveTimeout !== null) {
      window.clearTimeout(saveTimeout)
    }
    saveTimeout = window.setTimeout(() => {
      writeLocalState(state)
      saveTimeout = null
    }, 200)
  })
}

function buildTransferStatusKey(fromPersonId: string, toPersonId: string) {
  return `${fromPersonId}::${toPersonId}`
}

async function loadEventData(
  eventId: EventId,
  setFn: StoreApi<AppState>['setState'],
) {
  if (loadedEventData.has(eventId) || loadingEventData.has(eventId)) {
    return
  }
  loadingEventData.add(eventId)
  const token = getAuthToken()
  if (!token) {
    loadingEventData.delete(eventId)
    return
  }
  try {
    const existing = await eventRepository.getById(eventId)
    const needsEventMeta = !existing?.name || !existing?.currency
    const eventMetaPromise = needsEventMeta
      ? getEventApi(eventId)
          .then((event) => event)
          .catch((error) => {
            if ((error as Error).message === 'UNAUTHORIZED') {
              throw error
            }
            console.warn(`Failed to fetch event metadata for ${eventId}`, error)
            return null
          })
      : Promise.resolve(null)

    const [eventMeta, participants, invoices] = await Promise.all([
      eventMetaPromise,
      listParticipantsApi(eventId).catch((error) => {
        console.warn(`Failed to fetch participants for event ${eventId}`, error)
        return null
      }),
      listInvoicesApi(eventId).catch((error) => {
        console.warn(`Failed to fetch invoices list for event ${eventId}`, error)
        return null
      }),
    ])

    const current: Event = {
      id: eventId,
      name: eventMeta?.name ?? existing?.name ?? '',
      currency: eventMeta?.currency ?? existing?.currency ?? '',
      people: existing?.people ?? [],
      invoices: existing?.invoices ?? [],
      peopleCount: eventMeta?.peopleCount ?? existing?.peopleCount,
      invoiceCount: eventMeta?.invoiceCount ?? existing?.invoiceCount,
    }

    const mappedParticipants =
      participants?.map((p) => ({ id: p.id, name: p.name })) ?? current.people

    const mappedInvoices =
      invoices
        ?.filter((det): det is NonNullable<typeof det> => Boolean(det))
        .map((det) => {
          const consumptions = det.participations.reduce<Record<string, number>>((acc, p) => {
            acc[p.participantId] = p.baseAmount
            return acc
          }, {})
          return {
            id: det.id,
            description: det.description,
            amount: det.totalAmount,
            payerId: det.payerId,
            participantIds: det.participations.map((p) => p.participantId),
            divisionMethod: det.divisionMethod,
            consumptions,
            items: det.items?.map((item) => ({
              id: item.id,
              name: item.name,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              participantIds: item.participantIds,
            })),
            tipAmount: det.tipAmount,
            birthdayPersonId: det.birthdayPersonId,
          }
        }) ?? current.invoices

    await eventRepository.save({
      ...current,
      people: mappedParticipants,
      invoices: mappedInvoices,
    })

    const events = await eventRepository.list()
    setFn((state: AppState) => ({
      events,
      selectedEventId: state.selectedEventId ?? eventId,
    }))
  } catch (error) {
    console.warn(`Failed to load event data for ${eventId}`, error)
  } finally {
    loadingEventData.delete(eventId)
    loadedEventData.add(eventId)
  }
}

export type EventForUI = Event
export type PersonForUI = Person
export type InvoiceForUI = Invoice
