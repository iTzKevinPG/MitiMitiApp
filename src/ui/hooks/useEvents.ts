import { useCallback } from 'react'
import type { CreateEventInput } from '../../application/dto/eventDtos'
import { useAppStore } from '../../shared/state/appStore'

export function useEvents() {
  const {
    events,
    selectedEventId,
    hydrate,
    selectEvent,
    createEvent,
    removeEvent,
    loadEventDetailsForList,
    isEventLoaded,
  } = useAppStore()

  const loadEvents = useCallback(
    async (options?: { loadDetails?: boolean }) => {
      await hydrate(options)
    },
    [hydrate],
  )

  const createAndSelect = useCallback(
    async (input: CreateEventInput) => {
      const event = await createEvent(input)
      if (!event) return undefined
      selectEvent(event.id)
      return event
    },
    [createEvent, selectEvent],
  )

  return {
    events,
    selectedEventId,
    loadEvents,
    selectEvent,
    createAndSelect,
    removeEvent,
    loadEventDetailsForList,
    isEventLoaded,
  }
}
