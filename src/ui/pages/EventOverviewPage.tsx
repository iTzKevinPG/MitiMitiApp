import { Share2 } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Badge } from '../../shared/components/ui/badge'
import { Button } from '../../shared/components/ui/button'
import { toast } from '../../shared/components/ui/sonner'
import { useAuthStore } from '../../shared/state/authStore'
import { useAppStore } from '../../shared/state/appStore'
import { BentoOverview } from '../components/BentoOverview'
import { Footer } from '../components/Footer'
import { useEvents } from '../hooks/useEvents'
import NotFoundPage from './NotFoundPage'
import { ThemeToggle } from '../components/ThemeToggle'
import fairLogo from '../../assets/fair-logo.png'

function EventOverviewPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const {
    events,
    selectedEventId,
    selectEvent,
    loadEvents,
  } = useEvents()
  const {
    getBalances,
    getTransfers,
    getSelectedEvent,
    hasHydrated,
    isEventLoading,
    loadPublicOverview,
    refreshEventDetails,
    loadTransferStatuses,
    transferStatusesByEvent,
  } = useAppStore()
  const hasLoadedRef = useRef(false)
  const isAuthenticated = useAuthStore((state) => Boolean(state.token))

  useEffect(() => {
    if (hasLoadedRef.current || events.length > 0) return
    hasLoadedRef.current = true
    void loadEvents({ loadDetails: false })
  }, [events.length, loadEvents])

  useEffect(() => {
    if (!eventId) return
    const hasAuthToken =
      typeof window !== 'undefined' &&
      Boolean(window.localStorage.getItem('fairsplit_auth_token'))
    if (hasAuthToken) {
      void refreshEventDetails(eventId)
      return
    }
    void loadPublicOverview(eventId, { force: true })
  }, [eventId, loadPublicOverview, refreshEventDetails])

  useEffect(() => {
    if (!eventId) return
    if (selectedEventId === eventId) return
    if (!events.some((event) => event.id === eventId)) return
    void selectEvent(eventId)
  }, [eventId, events, selectedEventId, selectEvent])

  const selectedEvent = getSelectedEvent()
  const hasEventInStore = eventId
    ? events.some((event) => event.id === eventId)
    : false
  useEffect(() => {
    const hasAuthToken =
      typeof window !== 'undefined' &&
      Boolean(window.localStorage.getItem('fairsplit_auth_token'))
    if (!hasAuthToken || !selectedEvent) return
    void loadTransferStatuses(selectedEvent.id)
  }, [loadTransferStatuses, selectedEvent])
  const balances = useMemo(
    () => (selectedEvent ? getBalances() : []),
    [getBalances, selectedEvent],
  )
  const transfers = useMemo(
    () => (selectedEvent ? getTransfers() : []),
    [getTransfers, selectedEvent],
  )
  const transferStatusMap = useMemo(() => {
    if (!selectedEvent) return {}
    return transferStatusesByEvent[selectedEvent.id] ?? {}
  }, [selectedEvent, transferStatusesByEvent])
  const tipTotal = useMemo(
    () =>
      selectedEvent?.invoices.reduce(
        (acc, invoice) => acc + (invoice.tipAmount ?? 0),
        0,
      ) ?? 0,
    [selectedEvent],
  )
  const shareUrl =
    typeof window !== 'undefined' && eventId && isAuthenticated
      ? `${window.location.origin}/events/${eventId}/overview`
      : ''
  const handleShare = async () => {
    if (!shareUrl) return
    const isMobile =
      window.matchMedia('(max-width: 640px)').matches ||
      /Mobi|Android/i.test(navigator.userAgent)
    if (isMobile && navigator.share) {
      try {
        await navigator.share({
          title: 'MitiMiti',
          text: 'Vista general del evento',
          url: shareUrl,
        })
        return
      } catch {
        // fallback to copy
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Link copiado al portapapeles.')
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = shareUrl
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(textarea)
      if (ok) {
        toast.success('Link copiado al portapapeles.')
      } else {
        toast.error('No se pudo copiar el link.')
      }
    }
  }
  const settledByPersonId = useMemo(() => {
    if (!selectedEvent) return {}
    const netByPersonId = new Map<string, number>()
    balances.forEach((balance) => {
      netByPersonId.set(balance.personId, balance.net)
    })

    const totals = new Map<string, { total: number; settled: number }>()
    transfers.forEach((transfer) => {
      const key = `${transfer.fromPersonId}::${transfer.toPersonId}`
      const isSettled = Boolean(transferStatusMap[key]?.isSettled)
      const fromEntry = totals.get(transfer.fromPersonId) ?? { total: 0, settled: 0 }
      fromEntry.total += 1
      if (isSettled) fromEntry.settled += 1
      totals.set(transfer.fromPersonId, fromEntry)

      const toEntry = totals.get(transfer.toPersonId) ?? { total: 0, settled: 0 }
      toEntry.total += 1
      if (isSettled) toEntry.settled += 1
      totals.set(transfer.toPersonId, toEntry)
    })

    const result: Record<string, boolean> = {}
    selectedEvent.people.forEach((person) => {
      const net = netByPersonId.get(person.id) ?? 0
      if (Math.abs(net) < 0.01) {
        result[person.id] = true
        return
      }
      const entry = totals.get(person.id)
      if (!entry || entry.total === 0) {
        result[person.id] = false
        return
      }
      result[person.id] = entry.settled === entry.total
    })
    return result
  }, [balances, selectedEvent, transfers, transferStatusMap])

  if (!eventId) {
    return <NotFoundPage />
  }

  if (!selectedEvent) {
    if (!hasHydrated || isEventLoading(eventId) || hasEventInStore) {
      return (
        <div className="flex min-h-screen flex-col bg-[color:var(--color-app-bg)]">
          <header className="sticky top-0 z-40 border-b border-[color:var(--color-border-subtle)] bg-[color:var(--color-app-bg)]/95 backdrop-blur">
            <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-[color:var(--color-surface-card)]">
                  <img src={fairLogo} alt="MitiMiti" className="h-8 w-8 object-contain" />
                </div>
                <span className="text-lg font-semibold text-[color:var(--color-text-main)]">
                  MitiMiti
                </span>
              </div>
            </div>
          </header>
          <main className="mx-auto flex max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
            <div className="rounded-lg border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-card)] p-6 text-sm text-[color:var(--color-text-muted)]">
              Cargando vista general...
            </div>
          </main>
          <Footer />
        </div>
      )
    }
    return <NotFoundPage />
  }

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--color-app-bg)]">
      <header className="sticky top-0 z-40 border-b border-[color:var(--color-border-subtle)] bg-[color:var(--color-app-bg)]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-[color:var(--color-surface-card)]">
              <img src={fairLogo} alt="MitiMiti" className="h-8 w-8 object-contain" />
            </div>
            <span className="text-lg font-semibold text-[color:var(--color-text-main)]">
              MitiMiti
            </span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[color:var(--color-primary-main)]">
            Vista general
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-3xl font-semibold text-[color:var(--color-text-main)] sm:text-4xl">
              {selectedEvent.name}
            </h1>
            {isAuthenticated ? (
              <Button type="button" size="sm" variant="soft" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
                Compartir
              </Button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-[color:var(--color-text-muted)]">
            <span className="rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-muted)] px-3 py-1">
              Moneda:{' '}
              <span className="font-semibold text-[color:var(--color-text-main)]">
                {selectedEvent.currency}
              </span>
            </span>
            <Badge variant="outline" className="text-[10px] font-semibold">
              Integrantes: {selectedEvent.people.length}
            </Badge>
            <Badge variant="outline" className="text-[10px] font-semibold">
              Gastos: {selectedEvent.invoices.length}
            </Badge>
            {tipTotal > 0 ? (
              <Badge variant="outline" className="text-[10px] font-semibold">
                Propina: {selectedEvent.currency} {tipTotal.toFixed(2)}
              </Badge>
            ) : null}
          </div>
        </section>

        <BentoOverview
          people={selectedEvent.people}
          invoices={selectedEvent.invoices}
          balances={balances}
          transfers={transfers}
          currency={selectedEvent.currency}
          transferStatusMap={transferStatusMap}
          settledByPersonId={settledByPersonId}
        />
      </main>

      <Footer />
    </div>
  )
}

export default EventOverviewPage
