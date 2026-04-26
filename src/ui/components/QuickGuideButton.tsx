import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTour, type PopoverContentProps, type StepType } from '@reactour/tour'
import { Sparkles } from 'lucide-react'
import { Button } from '../../shared/components/ui/button'
import { useAppStore } from '../../shared/state/appStore'

type RequirementKey =
  | 'none'
  | 'event-created'
  | 'people-added'
  | 'invoice-added'
  | 'invoice-add-menu-open'
  | 'invoice-form-open'
  | 'invoice-split-step'
  | 'invoice-description'
  | 'invoice-amount'
  | 'tab-people'
  | 'tab-invoices'
  | 'tab-summary'
  | 'tab-transfers'
  | 'tab-overview'

type GuideStepConfig = {
  selector: string
  selectorMobile?: string
  title: string
  description: string
  requirement: RequirementKey
  tabId?: 'people' | 'invoices' | 'summary' | 'transfers' | 'overview'
  bypassElem?: boolean
  position?: StepType['position']
  highlightedSelectors?: string[]
  mutationObservables?: string[]
  resizeObservables?: string[]
  hint?: string
}

const smartPosition: StepType['position'] = (posProps) => {
  const { windowHeight, top, height, bottom } = posProps
  const isMobile = (posProps.windowWidth ?? window.innerWidth) <= 640
  if (!isMobile) return 'bottom'

  const targetBottom = bottom ?? top + height
  const viewportPadding = 16
  const estimatedPopoverHeight = 260
  const spaceAbove = Math.max(top - viewportPadding, 0)
  const spaceBelow = Math.max(windowHeight - targetBottom - viewportPadding, 0)

  const fitsAbove = spaceAbove >= estimatedPopoverHeight
  const fitsBelow = spaceBelow >= estimatedPopoverHeight

  if (fitsAbove && !fitsBelow) return 'top'
  if (fitsBelow && !fitsAbove) return 'bottom'

  // If both sides are tight, prefer the side with more available space.
  if (!fitsAbove && !fitsBelow) {
    return spaceAbove > spaceBelow ? 'top' : 'bottom'
  }

  // If both sides fit, bias with the target vertical position.
  const elementCenter = top + height / 2
  if (elementCenter > windowHeight * 0.55) return 'top'
  if (elementCenter < windowHeight * 0.45) return 'bottom'

  return spaceAbove > spaceBelow ? 'top' : 'bottom'
}

const autoAdvanceRequirements: RequirementKey[] = [
  'invoice-added',
  'invoice-form-open',
  'invoice-add-menu-open',
  'invoice-split-step',
]

const homeSteps: GuideStepConfig[] = [
  {
    selector: '[data-tour="session-status"]',
    title: 'Estado de sesion',
    description: 'El icono indica si estas en modo local o con perfil activo.',
    requirement: 'none',
  },
  {
    selector: '[data-tour="menu-button"]',
    title: 'Menu',
    description: 'Abre el menu para gestionar tu perfil y preferencias.',
    requirement: 'none',
  },
  {
    selector: '[data-tour="event-create"]',
    title: 'Crear evento',
    description: 'Crea un evento con nombre y moneda para empezar.',
    requirement: 'event-created',
    hint: 'Completa el formulario y crea un evento para continuar.',
  },
]

const eventSteps: GuideStepConfig[] = [
  {
    selector: '[data-tour="tab-nav"]',
    selectorMobile: '[data-tour="tab-nav-mobile"]',
    title: 'Navegacion',
    description: 'Usa estas pestañas para moverte por el evento.',
    requirement: 'none',
    position: smartPosition,
  },
  {
    selector: '[data-tour="people-add-form"]',
    title: 'Integrantes',
    description: 'Agrega personas para poder registrar gastos.',
    requirement: 'people-added',
    tabId: 'people',
    hint: 'Agrega al menos dos integrantes para continuar.',
    mutationObservables: ['[data-tour-active-tab]'],
    resizeObservables: ['[data-tour-active-tab]'],
  },
  {
    selector: '[data-tour="invoice-section"]',
    title: 'Gastos',
    description: 'Registra los gastos del grupo. El total incluye propinas automaticamente.',
    requirement: 'none',
    tabId: 'invoices',
    mutationObservables: ['[data-tour-active-tab]'],
    resizeObservables: ['[data-tour-active-tab]'],
  },
  {
    selector: '[data-tour="invoice-add"]',
    title: 'Agregar gasto',
    description: 'Abre el menu para empezar el nuevo flujo de gasto.',
    requirement: 'invoice-add-menu-open',
    tabId: 'invoices',
    hint: 'Pulsa "Agregar gasto" para ver las opciones.',
    mutationObservables: ['[data-tour-active-tab]'],
    resizeObservables: ['[data-tour-active-tab]'],
  },
  {
    selector: '[data-tour="invoice-add-manual"]',
    title: 'Tipo de gasto',
    description: 'Selecciona Manual para abrir el modal por pasos.',
    requirement: 'invoice-form-open',
    tabId: 'invoices',
    hint: 'Selecciona Manual para continuar.',
    mutationObservables: ['[data-tour-active-tab]'],
    resizeObservables: ['[data-tour-active-tab]'],
  },
  {
    selector: '[data-tour="invoice-description"]',
    title: 'Concepto',
    description: 'Escribe el concepto del gasto.',
    requirement: 'invoice-description',
    tabId: 'invoices',
    mutationObservables: ['[data-tour-active-tab]'],
    resizeObservables: ['[data-tour-active-tab]'],
  },
  {
    selector: '[data-tour="invoice-amount"]',
    title: 'Monto',
    description: 'Ingresa el monto total del gasto.',
    requirement: 'invoice-amount',
    tabId: 'invoices',
    mutationObservables: ['[data-tour-active-tab]'],
    resizeObservables: ['[data-tour-active-tab]'],
  },
  {
    selector: '[data-tour="invoice-payer"]',
    title: 'Pagador',
    description: 'Selecciona quien pago este gasto.',
    requirement: 'none',
    tabId: 'invoices',
    bypassElem: true,
    mutationObservables: ['[data-tour-active-tab]'],
    resizeObservables: ['[data-tour-active-tab]'],
  },
  {
    selector: '[data-tour="invoice-step-next"]',
    title: 'Continuar',
    description: 'Usa este boton del modal para pasar del paso Basico al paso Reparto.',
    requirement: 'none',
    tabId: 'invoices',
    hint: 'Pulsa "Continuar" dentro del modal para abrir el paso de reparto.',
    position: 'top',
    mutationObservables: ['[data-tour-active-tab]'],
    resizeObservables: ['[data-tour-active-tab]'],
  },
  {
    selector: '[data-tour="invoice-split-step"]',
    title: 'Reparto',
    description:
      'Aqui eliges si el gasto va por partes iguales o por consumo y activas extras como propina, participantes e invitado especial.',
    requirement: 'none',
    tabId: 'invoices',
    mutationObservables: ['[data-tour-active-tab]'],
    resizeObservables: ['[data-tour-active-tab]'],
  },
  {
    selector: '[data-tour="invoice-save"]',
    title: 'Guardar gasto',
    description: 'En la confirmacion final guardas el gasto para ver el resumen.',
    requirement: 'invoice-added',
    tabId: 'invoices',
    hint: 'Avanza en el modal hasta la confirmacion final y guarda el gasto.',
    mutationObservables: ['[data-tour-active-tab]', '[data-tour="invoice-section"]'],
    resizeObservables: ['[data-tour-active-tab]', '[data-tour="invoice-section"]'],
  },
  {
    selector: '[data-tour="summary-section"]',
    title: 'Balance',
    description: 'Ve el subtotal, propinas y total del evento, mas los saldos por persona.',
    requirement: 'tab-summary',
    tabId: 'summary',
    mutationObservables: ['[data-tour-active-tab]'],
    resizeObservables: ['[data-tour-active-tab]'],
  },
  {
    selector: '[data-tour="transfers-section"]',
    title: 'Transferencias',
    description: 'Aqui ves quien paga a quien para saldar cuentas.',
    requirement: 'tab-transfers',
    tabId: 'transfers',
    mutationObservables: ['[data-tour-active-tab]'],
    resizeObservables: ['[data-tour-active-tab]'],
  },
  {
    selector: '[data-tour="overview-section"]',
    title: 'Vista general',
    description: 'Total del evento con desglose, estadisticas y estado de pagos en un solo lugar.',
    requirement: 'tab-overview',
    tabId: 'overview',
    mutationObservables: ['[data-tour-active-tab]'],
    resizeObservables: ['[data-tour-active-tab]'],
  },
]

function hasVisibleSection(selector: string) {
  if (typeof document === 'undefined') return false
  const element = document.querySelector<HTMLElement>(selector)
  if (!element) return false
  if (element.getAttribute('aria-hidden') === 'true') return false
  const style = window.getComputedStyle(element)
  if (style.display === 'none' || style.visibility === 'hidden') return false
  return element.getClientRects().length > 0
}

function getInputValue(selector: string) {
  if (typeof document === 'undefined') return ''
  const input = document.querySelector<HTMLInputElement>(selector)
  return input?.value ?? ''
}

function getConfigsForPath(pathname: string): GuideStepConfig[] {
  if (pathname === '/') return homeSteps
  if (pathname.startsWith('/events/')) return eventSteps
  return []
}

function getStepContent(config: GuideStepConfig): StepType['content'] {
  return (props) => <GuideStepContent {...props} config={config} />
}

function GuideStepContent({
  config,
  setCurrentStep,
  currentStep,
  steps,
  setIsOpen,
  setMeta,
}: PopoverContentProps & { config: GuideStepConfig }) {
  const { isOpen } = useTour()
  const pathname = typeof window !== 'undefined' ? window.location.pathname : ''
  const selectedEvent = useAppStore((state) => state.getSelectedEvent())
  const [activeTab, setActiveTab] = useState<string | null>(() => {
    if (typeof document === 'undefined') return null
    return (
      document.querySelector('[data-tour-active-tab]')?.getAttribute('data-tour-active-tab') ??
      null
    )
  })
  const lastAutoAdvanceRef = useRef<number | null>(null)
  const lastTabDispatchRef = useRef<string | null>(null)
  const pendingStepRef = useRef<number | null>(null)
  const pendingSelectorRef = useRef<string | null>(null)
  const pendingTabRef = useRef<string | null>(null)
  const pendingTimeoutRef = useRef<number | null>(null)
  const pendingObserverRef = useRef<MutationObserver | null>(null)
  const peopleCount = selectedEvent?.people.length ?? 0
  const invoiceCount = selectedEvent?.invoices.length ?? 0

  useEffect(() => {
    const handler = (event: Event) => {
      if (!(event instanceof CustomEvent)) return
      const tabId = event.detail?.tabId as string | undefined
      if (!tabId) return
      setActiveTab(tabId)
    }
    window.addEventListener('tour:active-tab', handler)
    return () => {
      window.removeEventListener('tour:active-tab', handler)
    }
  }, [])

  const [requirementTick, setRequirementTick] = useState(0)

  useEffect(() => {
    if (!isOpen) return
    const intervalId = window.setInterval(() => {
      setRequirementTick((tick) => tick + 1)
    }, 250)
    return () => {
      window.clearInterval(intervalId)
    }
  }, [isOpen])

  void requirementTick

  useEffect(() => {
    if (!isOpen) return
    const markSelectPopovers = () => {
      document.querySelectorAll('[data-tour="active-select-popover"]').forEach((el) => {
        el.removeAttribute('data-tour')
      })
      document.querySelectorAll('[data-tour-select-content]').forEach((content) => {
        const wrapper =
          content.closest('[data-radix-popper-content-wrapper]') ??
          content.parentElement
        if (!wrapper) return
        wrapper.setAttribute('data-tour', 'active-select-popover')
      })
    }

    markSelectPopovers()
    const observer = new MutationObserver(markSelectPopovers)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      document.querySelectorAll('[data-tour="active-select-popover"]').forEach((el) => {
        el.removeAttribute('data-tour')
      })
    }
  }, [isOpen])
  const requirementMet = (() => {
    switch (config.requirement) {
      case 'none':
        return true
      case 'event-created':
        return pathname.startsWith('/events/')
      case 'people-added':
        return peopleCount >= 2
      case 'invoice-added':
        return invoiceCount > 0
      case 'invoice-add-menu-open':
        return hasVisibleSection('[data-tour="invoice-add-menu"] [data-state="open"]')
      case 'invoice-form-open':
        return hasVisibleSection('[data-tour="invoice-form"]')
      case 'invoice-split-step':
        return hasVisibleSection('[data-tour="invoice-split-step"]')
      case 'invoice-description': {
        const value = getInputValue('[data-tour="invoice-description"]')
        return value.trim().length > 0
      }
      case 'invoice-amount': {
        const value = getInputValue('[data-tour="invoice-amount"]')
        const numeric = Number(value)
        return Number.isFinite(numeric) && numeric > 0
      }
      case 'tab-people':
        return activeTab === 'people' || hasVisibleSection('[data-tour="people-section"]')
      case 'tab-invoices':
        return activeTab === 'invoices' || hasVisibleSection('[data-tour="invoice-section"]')
      case 'tab-summary':
        return activeTab === 'summary' || hasVisibleSection('[data-tour="summary-section"]')
      case 'tab-transfers':
        return activeTab === 'transfers' || hasVisibleSection('[data-tour="transfers-section"]')
      case 'tab-overview':
        return activeTab === 'overview' || hasVisibleSection('[data-tour="overview-section"]')
      default:
        return true
    }
  })()

  useEffect(() => {
    if (!isOpen) return
    document.querySelectorAll('[data-tour-select-content]').forEach((content) => {
      const wrapper =
        content.closest('[data-radix-popper-content-wrapper]') ??
        content.parentElement
      wrapper?.setAttribute('data-tour', 'active-select-popover')
    })
  }, [isOpen, requirementTick])

  const clearPendingStep = useCallback(() => {
    if (pendingTimeoutRef.current) {
      window.clearTimeout(pendingTimeoutRef.current)
    }
    pendingTimeoutRef.current = null
    pendingStepRef.current = null
    pendingSelectorRef.current = null
    pendingTabRef.current = null
    pendingObserverRef.current?.disconnect()
    pendingObserverRef.current = null
  }, [])

  const waitForSelector = useCallback(
    (selector: string, onFound: () => void) => {
      if (typeof document === 'undefined') {
        onFound()
        return
      }
      const existing = document.querySelector(selector)
      if (existing) {
        onFound()
        return
      }
      pendingObserverRef.current?.disconnect()
      const observer = new MutationObserver(() => {
        const target = document.querySelector(selector)
        if (target) {
          observer.disconnect()
          onFound()
        }
      })
      pendingObserverRef.current = observer
      observer.observe(document.body, { childList: true, subtree: true })
      window.setTimeout(() => observer.disconnect(), 1500)
    },
    [],
  )

  const totalSteps = steps?.length ?? getConfigsForPath(pathname).length
  const isLastStep = totalSteps > 0 ? currentStep === totalSteps - 1 : false
  const disablePrev =
    config.selector === '[data-tour="summary-section"]' ||
    config.selector === '[data-tour="transfers-section"]' ||
    config.selector === '[data-tour="overview-section"]'
  const autoAdvance = config.requirement === 'event-created'
  const handleStepChange = useCallback(
    (nextIndex: number) => {
      const fallbackSteps =
        steps && steps.length > 0
          ? steps
          : getConfigsForPath(pathname).map((cfg) => ({
              selector: cfg.selector,
              tabId: cfg.tabId,
            }))
      const target = fallbackSteps[nextIndex] as (StepType & { tabId?: string }) | undefined
      if (!target) return
      const selector = target?.selector as string | undefined
      const resolvedActiveTab =
        activeTab ??
        document
          .querySelector('[data-tour-active-tab]')
          ?.getAttribute('data-tour-active-tab') ??
        null
      const waitForPendingSelector = () => {
        if (!selector) {
          setCurrentStep(nextIndex)
          return
        }
        const existing = document.querySelector(selector)
        if (existing) {
          setCurrentStep(nextIndex)
          return
        }
        clearPendingStep()
        pendingStepRef.current = nextIndex
        pendingSelectorRef.current = selector
        pendingTimeoutRef.current = window.setTimeout(() => {
          if (pendingStepRef.current !== nextIndex) return
          setCurrentStep(nextIndex)
          clearPendingStep()
        }, 1500)
        waitForSelector(selector, () => {
          setCurrentStep(nextIndex)
          clearPendingStep()
        })
      }
      if (target?.tabId) {
        window.dispatchEvent(
          new CustomEvent('tour:go-tab', { detail: { tabId: target.tabId } }),
        )
        if (selector && resolvedActiveTab !== target.tabId) {
          clearPendingStep()
          pendingStepRef.current = nextIndex
          pendingSelectorRef.current = selector
          pendingTabRef.current = target.tabId
          pendingTimeoutRef.current = window.setTimeout(() => {
            if (pendingStepRef.current !== nextIndex) return
            setCurrentStep(nextIndex)
            clearPendingStep()
          }, 100)
          return
        }
        window.dispatchEvent(
          new CustomEvent('tour:go-tab', { detail: { tabId: target.tabId } }),
        )
        waitForPendingSelector()
        return
      }
      waitForPendingSelector()
    },
    [activeTab, clearPendingStep, pathname, setCurrentStep, steps],
  )

  useEffect(() => {
    if (!autoAdvanceRequirements.includes(config.requirement)) return
    if (!requirementMet || !steps || currentStep >= steps.length - 1) return
    if (lastAutoAdvanceRef.current === currentStep) return
    lastAutoAdvanceRef.current = currentStep
    handleStepChange(currentStep + 1)
  }, [config.requirement, currentStep, requirementMet, steps, handleStepChange])

  useEffect(() => {
    if (config.selector !== '[data-tour="invoice-step-next"]') return
    if (!isOpen || !steps || currentStep >= steps.length - 1) return
    if (!hasVisibleSection('[data-tour="invoice-split-step"]')) return
    if (lastAutoAdvanceRef.current === currentStep) return
    lastAutoAdvanceRef.current = currentStep
    handleStepChange(currentStep + 1)
  }, [config.selector, currentStep, handleStepChange, isOpen, requirementTick, steps])

  useEffect(() => {
    if (!isOpen || !config.tabId) return
    if (lastTabDispatchRef.current === config.tabId) return
    window.dispatchEvent(new CustomEvent('tour:go-tab', { detail: { tabId: config.tabId } }))
    lastTabDispatchRef.current = config.tabId
  }, [config.tabId, currentStep, isOpen])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = () => {
      if (!isOpen) return
      if (config.requirement !== 'invoice-form-open') return
      if (!requirementMet) return
      if (!steps || currentStep >= steps.length - 1) return
      if (lastAutoAdvanceRef.current === currentStep) return
      lastAutoAdvanceRef.current = currentStep
      handleStepChange(currentStep + 1)
    }
    window.addEventListener('tour:invoice-form-open', handler)
    return () => window.removeEventListener('tour:invoice-form-open', handler)
  }, [config.requirement, currentStep, handleStepChange, isOpen, requirementMet, steps])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = (event: Event) => {
      if (!(event instanceof CustomEvent)) return
      const tabId = event.detail?.tabId as string | undefined
      if (!tabId || pendingTabRef.current !== tabId) return
      const pendingIndex = pendingStepRef.current
      const pendingSelector = pendingSelectorRef.current
      if (pendingIndex === null || !pendingSelector) return
      waitForSelector(pendingSelector, () => {
        setCurrentStep(pendingIndex)
        clearPendingStep()
      })
    }
    window.addEventListener('tour:tab-rendered', handler)
    return () => {
      window.removeEventListener('tour:tab-rendered', handler)
    }
  }, [clearPendingStep, setCurrentStep, waitForSelector])

  return (
    <div className="space-y-3">
      {/* Step header with icon */}
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-primary-soft)]">
          <Sparkles className="h-4 w-4 text-[color:var(--color-primary-main)]" />
        </div>
        <div className="space-y-0.5">
          {totalSteps ? (
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">
              Paso {currentStep + 1} de {totalSteps}
            </p>
          ) : null}
          <p className="text-sm font-semibold text-[color:var(--color-text-main)]">
            {config.title}
          </p>
          <p className="text-sm text-[color:var(--color-text-muted)]">
            {config.description}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      {totalSteps > 1 && (
        <div className="flex gap-1">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                i < currentStep
                  ? 'bg-[color:var(--color-accent-success)]'
                  : i === currentStep
                    ? 'bg-[color:var(--color-primary-main)]'
                    : 'bg-[color:var(--color-border-subtle)]'
              }`}
            />
          ))}
        </div>
      )}

      {!requirementMet && config.hint ? (
        <div className="rounded-md border border-[color:var(--color-accent-warning)] bg-[color:var(--color-warning-bg)] px-3 py-2 text-xs font-semibold text-[color:var(--color-text-main)]">
          {config.hint}
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="rounded-md border border-[color:var(--color-border-subtle)] px-2.5 py-1 text-xs font-semibold text-[color:var(--color-text-muted)] hover:border-[color:var(--color-primary-light)] hover:text-[color:var(--color-text-main)]"
          onClick={() => {
            setIsOpen(false)
            setMeta?.('')
          }}
        >
          Salir
        </button>
        <div className="flex items-center gap-2">
          {!autoAdvance && currentStep > 0 && !disablePrev ? (
            <button
              type="button"
              className="text-xs font-semibold text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text-main)]"
              onClick={() => handleStepChange(Math.max(currentStep - 1, 0))}
            >
              Anterior
            </button>
          ) : null}
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
              requirementMet
                ? 'bg-[color:var(--color-primary-main)] text-[color:var(--color-text-on-primary)]'
                : 'cursor-not-allowed bg-[color:var(--color-surface-muted)] text-[color:var(--color-text-muted)]'
            }`}
            onClick={() => {
              if (config.selector === '[data-tour="invoice-step-next"]') {
                const nextButton = document.querySelector<HTMLButtonElement>(
                  '[data-tour="invoice-step-next"]',
                )
                nextButton?.click()
                window.setTimeout(() => {
                  handleStepChange(currentStep + 1)
                }, 120)
                return
              }
              if (!requirementMet) return
              if (isLastStep) {
                setIsOpen(false)
                setMeta?.('')
                return
              }
              handleStepChange(currentStep + 1)
            }}
            disabled={!requirementMet || autoAdvance}
          >
            {isLastStep ? 'Finalizar' : 'Continuar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function QuickGuideButton() {
  const location = useLocation()
  const { setIsOpen, setSteps, setCurrentStep, isOpen, meta, setMeta } = useTour()
  const lastPathRef = useRef('')

  const steps = useMemo(() => {
    const configs = getConfigsForPath(location.pathname)
    const interactiveRequirements: RequirementKey[] = [
      'event-created',
      'people-added',
      'invoice-added',
      'invoice-add-menu-open',
      'invoice-form-open',
      'invoice-split-step',
      'tab-invoices',
      'tab-people',
      'tab-summary',
      'tab-transfers',
      'tab-overview',
      'invoice-description',
      'invoice-amount',
      'none',
    ]
    return configs.map((config) => {
      const interactive = interactiveRequirements.includes(config.requirement)
      const highlightedSelectors = [
        ...(interactive ? ['[data-tour="active-select-popover"]'] : []),
        ...(config.highlightedSelectors ?? []),
      ]
      const mutationObservables = [
        ...(interactive ? ['[data-tour="active-select-popover"]'] : []),
        ...(config.mutationObservables ?? []),
      ]
      const resizeObservables = [
        ...(interactive ? ['[data-tour="active-select-popover"]'] : []),
        ...(config.resizeObservables ?? []),
      ]
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
      const resolvedSelector = (isMobile && config.selectorMobile) ? config.selectorMobile : config.selector

      return {
        selector: resolvedSelector,
        content: getStepContent(config),
        stepInteraction: interactive,
        bypassElem: config.bypassElem,
        position: config.position ?? smartPosition,
        highlightedSelectors: highlightedSelectors.length ? highlightedSelectors : undefined,
        mutationObservables: mutationObservables.length ? mutationObservables : undefined,
        resizeObservables: resizeObservables.length ? resizeObservables : undefined,
        tabId: config.tabId,
      }
    })
  }, [location.pathname])

  useEffect(() => {
    if (meta !== 'guided' || !setSteps) return
    if (!isOpen) {
      lastPathRef.current = location.pathname
      return
    }
    if (lastPathRef.current === location.pathname) return
    setSteps(steps)
    setCurrentStep(0)
    lastPathRef.current = location.pathname
  }, [isOpen, location.pathname, meta, setCurrentStep, setIsOpen, setSteps, steps])

  const handleOpen = useCallback(() => {
    if (steps.length === 0 || !setSteps) return
    setMeta?.('guided')
    setSteps(steps)
    setCurrentStep(0)
    setIsOpen(true)
    if (location.pathname.startsWith('/events/')) {
      window.dispatchEvent(
        new CustomEvent('tour:go-tab', { detail: { tabId: 'people' } }),
      )
    }
  }, [location.pathname, setCurrentStep, setIsOpen, setMeta, setSteps, steps])

  useEffect(() => {
    const handler = () => {
      handleOpen()
    }
    window.addEventListener('tour:open', handler)
    return () => {
      window.removeEventListener('tour:open', handler)
    }
  }, [handleOpen])

  return (
    <Button
      type="button"
      size="sm"
      variant="soft"
      className="ring-1 ring-[color:var(--color-primary-light)] text-[color:var(--color-primary-light)]"
      onClick={handleOpen}
      disabled={steps.length === 0}
      data-tour="guide-button"
    >
      <Sparkles className="h-4 w-4" />
      <span className="hidden sm:inline">Guia rapida</span>
      <span className="sr-only">Guia rapida</span>
    </Button>
  )
}
