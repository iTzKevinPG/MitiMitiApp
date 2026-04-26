import {
  ArrowLeft,
  ArrowRightLeft,
  BarChart3,
  LayoutGrid,
  Receipt,
  Share2,
  Users,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../shared/components/ui/button'
import { toast } from '../../shared/components/ui/sonner'
import { useAuthStore } from '../../shared/state/authStore'
import { useAppStore } from '../../shared/state/appStore'
import { useEvents } from '../hooks/useEvents'
import { useConfetti } from '../hooks/useConfetti'
import { BentoOverview } from '../components/BentoOverview'
import { Footer } from '../components/Footer'
import { InvoiceSection } from '../components/InvoiceSection'
import { PeopleSection } from '../components/PeopleSection'
import { SummarySection } from '../components/SummarySection'

import { BottomNav } from '../components/BottomNav'
import { EventStepper } from '../components/EventStepper'
import { TransfersSection } from '../components/TransfersSection'
import { QuickGuideButton } from '../components/QuickGuideButton'
import { ProfileModal } from '../components/ProfileModal'
import {
  SessionMenu,
  SessionMenuButton,
  SessionStatusPill,
} from '../components/SessionMenu'
import NotFoundPage from './NotFoundPage'
import fairLogo from '../../assets/fair-logo.png'

const tabs = [
  { id: 'people', label: 'Grupo', shortLabel: 'Grupo', icon: <Users className="h-4 w-4" /> },
  { id: 'invoices', label: 'Gastos', shortLabel: 'Gastos', icon: <Receipt className="h-4 w-4" /> },
  { id: 'summary', label: 'Balance', shortLabel: 'Balance', icon: <BarChart3 className="h-4 w-4" /> },
  {
    id: 'transfers',
    label: 'Pagos',
    shortLabel: 'Pagos',
    icon: <ArrowRightLeft className="h-4 w-4" />,
  },
  { id: 'overview', label: 'General', shortLabel: 'General', icon: <LayoutGrid className="h-4 w-4" /> },
]

function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const {
    events,
    selectedEventId,
    selectEvent,
    loadEvents,
  } = useEvents()
  const {
    addPerson,
    removePerson,
    addInvoice,
    removeInvoice,
    updateInvoice,
    updatePerson,
    getBalances,
    getTransfers,
    getSelectedEvent,
    loadTransferStatuses,
    transferStatusesByEvent,
    setTransferStatus,
    refreshEventDetails,
  } = useAppStore()

  const [activeTab, setActiveTab] = useState<
    'people' | 'invoices' | 'summary' | 'transfers' | 'overview'
  >('people')
  const [tabKey, setTabKey] = useState(0)
  const [showProfile, setShowProfile] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const hasLoadedRef = useRef(false)
  const isAuthenticated = useAuthStore((state) => Boolean(state.token))

  const handleTabChange = useCallback((tabId: string) => {
    const nextTab = tabId as 'people' | 'invoices' | 'summary' | 'transfers' | 'overview'
    setActiveTab((currentTab) => {
      if (currentTab === nextTab) return currentTab
      setTabKey((k) => k + 1)
      return nextTab
    })
  }, [])

  useEffect(() => {
    if (hasLoadedRef.current || events.length > 0) return
    hasLoadedRef.current = true
    void loadEvents({ loadDetails: false })
  }, [events.length, loadEvents])

  useEffect(() => {
    if (!eventId) return
    void refreshEventDetails(eventId)
  }, [eventId, refreshEventDetails])

  useEffect(() => {
    const handler = (event: Event) => {
      if (!(event instanceof CustomEvent)) return
      const tabId = event.detail?.tabId as
        | 'people'
        | 'invoices'
        | 'summary'
        | 'transfers'
        | 'overview'
        | undefined
      if (!tabId) return
      handleTabChange(tabId)
    }
    window.addEventListener('tour:go-tab', handler)
    return () => {
      window.removeEventListener('tour:go-tab', handler)
    }
  }, [handleTabChange])

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('tour:active-tab', { detail: { tabId: activeTab } }),
    )
    const timeoutId = window.setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('tour:tab-rendered', { detail: { tabId: activeTab } }),
      )
    }, 120)
    return () => window.clearTimeout(timeoutId)
  }, [activeTab])

  useEffect(() => {
    if (!eventId) return
    if (selectedEventId === eventId) return
    if (!events.some((event) => event.id === eventId)) return
    void selectEvent(eventId)
  }, [eventId, events, selectedEventId, selectEvent])

  useEffect(() => {
    if (eventId && events.length > 0 && !getSelectedEvent()) {
      navigate('/', { replace: true })
    }
  }, [eventId, events.length, getSelectedEvent, navigate])

  const selectedEvent = getSelectedEvent()
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

  const allSettled = useMemo(() =>
    transfers.length > 0 &&
    transfers.every((t) => {
      const key = `${t.fromPersonId}::${t.toPersonId}`
      return Boolean(transferStatusMap[key]?.isSettled)
    }),
    [transfers, transferStatusMap],
  )

  useConfetti(allSettled)

  if (!eventId || !selectedEvent) {
    return <NotFoundPage />
  }

  return (
    <div className="min-h-screen bg-[color:var(--color-app-bg)]">
      <SessionMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        onOpenProfile={() => setShowProfile(true)}
        backLink={{ href: '/', label: 'Volver a eventos' }}
      />

      <ProfileModal isOpen={showProfile} onClose={() => setShowProfile(false)} />

      <header className="sticky top-0 z-40 border-b border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-card)]/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Link
              to="/"
              className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-[color:var(--color-text-muted)] transition-colors hover:bg-[color:var(--color-surface-muted)] hover:text-[color:var(--color-text-main)]"
            >
              <ArrowLeft className="h-4 w-4" />
              <img src={fairLogo} alt="MitiMiti" className="h-7 w-7 object-contain sm:h-8 sm:w-8" />
              <span className="hidden text-base font-semibold text-[color:var(--color-text-main)] sm:inline sm:text-lg">
                MitiMiti
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <QuickGuideButton />
            <SessionStatusPill />
            <SessionMenuButton onClick={() => setMenuOpen((prev) => !prev)} />
          </div>
        </div>
      </header>

      <main
        className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10 pb-24 sm:pb-10 min-h-[calc(100vh-4rem-96px)]"
        data-tour-active-tab={activeTab}
      >
        <section className="ds-card space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--color-primary-main)]">
                Evento
              </p>
              <h1 className="text-2xl font-semibold text-[color:var(--color-text-main)] sm:text-3xl">
                {selectedEvent.name}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-muted)] px-2.5 py-0.5 font-semibold text-[color:var(--color-text-main)]">
                  {selectedEvent.currency}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-muted)] px-2.5 py-0.5 text-[color:var(--color-text-muted)]">
                  <Users className="h-3 w-3" />
                  {selectedEvent.people.length}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-muted)] px-2.5 py-0.5 text-[color:var(--color-text-muted)]">
                  <Receipt className="h-3 w-3" />
                  {selectedEvent.invoices.length}
                </span>
              </div>
              {activeTab === 'overview' && isAuthenticated ? (
                <Button type="button" size="sm" variant="soft" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                  Compartir
                </Button>
              ) : null}
            </div>
          </div>

          <div className="border-t border-[color:var(--color-border-subtle)] pt-4">
            <EventStepper
              peopleCount={selectedEvent.people.length}
              invoiceCount={selectedEvent.invoices.length}
              hasBalances={balances.length > 0}
              allSettled={allSettled}
              activeTab={activeTab}
              onStepClick={(tabId) => handleTabChange(tabId)}
            />
          </div>
        </section>


        <div
          key={`tab-${tabKey}`}
          data-tour="people-section"
          className={`${activeTab === 'people' ? 'block animate-tab-enter' : 'hidden'}`}
          aria-hidden={activeTab !== 'people'}
        >
          <PeopleSection
            people={selectedEvent.people}
            onAdd={async (name) => {
              await addPerson({ name })
            }}
            onRemove={async (personId) => {
              await removePerson({ personId })
            }}
            onEdit={async (personId, name) => {
              await updatePerson({ personId, name })
            }}
          />
        </div>

        <div data-tour="invoice-section" className={activeTab === 'invoices' ? 'block animate-tab-enter' : 'hidden'}>
          <InvoiceSection
            eventId={eventId}
            invoices={selectedEvent.invoices}
            people={selectedEvent.people}
            currency={selectedEvent.currency}
            onRefreshEvent={() => refreshEventDetails(eventId)}
            onAdd={async (invoice) => {
              await addInvoice(invoice)
            }}
            onUpdate={async (invoice) => {
              await updateInvoice(invoice)
            }}
            onRemove={async (invoiceId) => {
              await removeInvoice({ invoiceId })
            }}
          />
        </div>

        <div data-tour="summary-section" className={activeTab === 'summary' ? 'block animate-tab-enter' : 'hidden'}>
          <SummarySection
            balances={balances}
            people={selectedEvent.people}
            invoices={selectedEvent.invoices}
            currency={selectedEvent.currency}
            tipTotal={tipTotal}
          />
        </div>

        <div data-tour="transfers-section" className={activeTab === 'transfers' ? 'block animate-tab-enter' : 'hidden'}>
          <TransfersSection
            transfers={transfers}
            people={selectedEvent.people}
            currency={selectedEvent.currency}
            tipTotal={tipTotal}
            transferStatusMap={transferStatusMap}
            onToggleStatus={(transfer, isSettled) => {
              void setTransferStatus({
                eventId: selectedEvent.id,
                fromPersonId: transfer.fromPersonId,
                toPersonId: transfer.toPersonId,
                isSettled,
              })
            }}
          />
        </div>

        <div data-tour="overview-section" className={activeTab === 'overview' ? 'block animate-tab-enter' : 'hidden'}>
          <BentoOverview
            people={selectedEvent.people}
            invoices={selectedEvent.invoices}
            balances={balances}
            transfers={transfers}
            currency={selectedEvent.currency}
            transferStatusMap={transferStatusMap}
            settledByPersonId={settledByPersonId}
          />
        </div>
      </main>

      <BottomNav
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tabId) => handleTabChange(tabId)}
      />

      <Footer />
    </div>
  )
}

export default EventDetailPage
