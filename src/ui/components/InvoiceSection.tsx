import { ChevronDown, Plus } from 'lucide-react'
import { Badge } from '../../shared/components/ui/badge'
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useTour } from '@reactour/tour'
import { Button } from '../../shared/components/ui/button'
import { SectionCard } from './SectionCard'
import { InvoiceList } from './invoice/InvoiceList'
import { InvoiceItemModal } from './invoice/InvoiceItemModal'
import { OcrDecisionModal } from './invoice/OcrDecisionModal'
import { ScanProgressBanner } from './invoice/ScanProgressBanner'
import { ExpenseEditorModal } from './invoice/ExpenseEditorModal'
import type { InvoiceItem } from '../../domain/invoice/Invoice'
import type { InvoiceForUI, PersonForUI } from '../../shared/state/appStore'
import {
  calculateShares,
  buildConsumptionsFromItems,
  buildItemShares,
  getItemTotal,
} from '../../domain/invoice/calculateShares'
import { createId } from '../../shared/utils/createId'
import { ActionMenu } from '../../shared/components/ActionMenu'
import {
  confirmScanApi,
  getScanStatusApi,
  rescanInvoiceApi,
  retryScanApi,
  scanInvoiceApi,
} from '../../infra/persistence/http/invoiceApi'
import { toast } from '../../shared/components/ui/sonner'

interface InvoiceSectionProps {
  eventId: string
  invoices: InvoiceForUI[]
  people: PersonForUI[]
  currency: string
  onRefreshEvent?: () => Promise<void>
  onAdd: (invoice: {
    description: string
    amount: number
    payerId: string
    participantIds: string[]
    divisionMethod?: 'equal' | 'consumption'
    consumptions?: Record<string, number>
    items?: InvoiceItem[]
    tipAmount?: number
    birthdayPersonId?: string
  }) => Promise<void>
  onUpdate: (invoice: {
    invoiceId: string
    description: string
    amount: number
    payerId: string
    participantIds: string[]
    divisionMethod?: 'equal' | 'consumption'
    consumptions?: Record<string, number>
    items?: InvoiceItem[]
    tipAmount?: number
    birthdayPersonId?: string
  }) => Promise<void>
  onRemove: (invoiceId: string) => Promise<void>
}

type ExpenseStep = 'basic' | 'split' | 'items' | 'confirm'

export function InvoiceSection({
  eventId,
  invoices,
  people,
  currency,
  onAdd,
  onUpdate,
  onRemove,
  onRefreshEvent,
}: InvoiceSectionProps) {
  const { isOpen: isTourOpen, meta: tourMeta, steps, setCurrentStep } = useTour()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const scanPollRef = useRef<number | null>(null)
  const scanStartRef = useRef<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [expenseStep, setExpenseStep] = useState<ExpenseStep>('basic')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [payerId, setPayerId] = useState<string | undefined>(
    people[0]?.id ?? undefined,
  )
  const [participantIds, setParticipantIds] = useState<string[]>(
    people.map((person) => person.id),
  )
  const [error, setError] = useState<string | null>(null)

  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null)
  const [divisionMethod, setDivisionMethod] = useState<'equal' | 'consumption'>('equal')
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})
  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [itemName, setItemName] = useState('')
  const [itemUnitPrice, setItemUnitPrice] = useState('')
  const [itemQuantity, setItemQuantity] = useState('1')
  const [itemParticipantIds, setItemParticipantIds] = useState<string[]>([])
  const [itemError, setItemError] = useState<string | null>(null)
  const [includeTip, setIncludeTip] = useState(false)
  const [tipAmount, setTipAmount] = useState('')
  const [birthdayEnabled, setBirthdayEnabled] = useState(false)
  const [birthdayPersonId, setBirthdayPersonId] = useState<string>('')
  const [showParticipants, setShowParticipants] = useState(false)
  const [showConsumption, setShowConsumption] = useState(false)
  const [scanStatus, setScanStatus] = useState<'idle' | 'uploading' | 'processing'>('idle')
  const [scanProgress, setScanProgress] = useState<number | null>(null)
  const [scanWarnings, setScanWarnings] = useState<string[]>([])
  const [scanJobId, setScanJobId] = useState<string | null>(null)
  const [scanFromOcr, setScanFromOcr] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [scanIsGuest, setScanIsGuest] = useState(false)
  const [scanModalOpen, setScanModalOpen] = useState(false)
  const [rescanConfirmOpen, setRescanConfirmOpen] = useState(false)

  const totalAmount = invoices.reduce((acc, inv) => acc + inv.amount, 0)
  const totalTips = invoices.reduce((acc, inv) => acc + (inv.tipAmount ?? 0), 0)
  const grandTotal = Math.round((totalAmount + totalTips + Number.EPSILON) * 100) / 100
  const availablePersonIds = people.map((person) => person.id)
  const resolvedPayerId =
    payerId && availablePersonIds.includes(payerId) ? payerId : availablePersonIds[0]
  const participantIdsWithPayer = resolvedPayerId
    ? participantIds.includes(resolvedPayerId)
      ? participantIds
      : [...participantIds, resolvedPayerId]
    : participantIds
  const sanitizedParticipantIds = participantIdsWithPayer.filter((id) =>
    availablePersonIds.includes(id),
  )
  const effectiveParticipantIds = showParticipants
    ? sanitizedParticipantIds
    : availablePersonIds
  const birthdayOptions = showParticipants ? sanitizedParticipantIds : availablePersonIds

  const handlePayerChange = (nextPayerId: string) => {
    setPayerId(nextPayerId)
    setParticipantIds((current) =>
      current.includes(nextPayerId) ? current : [...current, nextPayerId],
    )
  }

  const handleToggleParticipant = (id: string) => {
    if (id === resolvedPayerId) return
    setParticipantIds((current) => {
      const next = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
      setBirthdayPersonId((currentBirthday) =>
        currentBirthday && next.includes(currentBirthday) ? currentBirthday : '',
      )
      return next
    })
  }

  const resetForm = () => {
    setDescription('')
    setAmount('')
    setPayerId(people[0]?.id ?? undefined)
    setParticipantIds(people.map((person) => person.id))
    setDivisionMethod('equal')
    setItems([])
    setExpandedItems({})
    setItemModalOpen(false)
    setEditingItemId(null)
    setItemName('')
    setItemUnitPrice('')
    setItemQuantity('1')
    setItemParticipantIds([])
    setItemError(null)
    setIncludeTip(false)
    setTipAmount('')
    setBirthdayEnabled(false)
    setBirthdayPersonId('')
    setShowParticipants(false)
    setShowConsumption(false)
    setEditingInvoiceId(null)
    setShowForm(false)
    setExpenseStep('basic')
    setScanWarnings([])
    setScanJobId(null)
    setScanFromOcr(false)
    setScanProgress(null)
    setScanError(null)
    setScanModalOpen(false)
    setRescanConfirmOpen(false)
    setScanIsGuest(false)
  }

  const startEdit = (invoice: InvoiceForUI) => {
    setShowForm(true)
    setExpenseStep('basic')
    setEditingInvoiceId(invoice.id)
    setDescription(invoice.description)
    setAmount(String(invoice.amount))
    setPayerId(invoice.payerId)
    setParticipantIds(invoice.participantIds)
    const method =
      invoice.divisionMethod ?? (invoice.consumptions ? 'consumption' : 'equal')
    setDivisionMethod(method)
    setShowConsumption(method === 'consumption')
    setIncludeTip(Boolean(invoice.tipAmount && invoice.tipAmount > 0))
    setTipAmount(invoice.tipAmount ? String(invoice.tipAmount) : '')
    setBirthdayEnabled(Boolean(invoice.birthdayPersonId))
    setBirthdayPersonId(invoice.birthdayPersonId ?? '')
    setShowParticipants(true)
    setItems(invoice.items ?? [])
    setExpandedItems({})
    setItemModalOpen(false)
    setEditingItemId(null)
    setItemName('')
    setItemUnitPrice('')
    setItemQuantity('1')
    setItemParticipantIds([])
    setItemError(null)
  }

  const openCreateFlow = () => {
    resetForm()
    setShowForm(true)
    setExpenseStep('basic')
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmedDescription = description.trim()
    const numericAmount = Number(amount)
    const effectiveParticipants = effectiveParticipantIds
    const effectivePayerId = resolvedPayerId

    if (!trimmedDescription) {
      setError('La descripcion es obligatoria.')
      return
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('El monto debe ser mayor que 0.')
      return
    }
    if (!effectivePayerId) {
      setError('Debes seleccionar un pagador.')
      return
    }
    if (birthdayEnabled) {
      if (!birthdayPersonId) {
        setError('Selecciona a la persona invitada especial.')
        return
      }
      if (!effectiveParticipants.includes(birthdayPersonId)) {
        setError('El invitado especial debe estar en la lista de participantes.')
        return
      }
      if (effectiveParticipants.length < 2) {
        setError(
          'Se necesita al menos otra persona para repartir el consumo del invitado especial.',
        )
        return
      }
    }
    if (effectiveParticipants.length === 0) {
      setError('Selecciona al menos un participante.')
      return
    }
    const numericTip = Number(tipAmount || 0)
    if (includeTip && (!Number.isFinite(numericTip) || numericTip <= 0)) {
      setError('La propina debe ser mayor que 0.')
      return
    }

    let consumptionPayload: Record<string, number> | undefined
    let itemsPayload: InvoiceItem[] | undefined
    if (divisionMethod === 'consumption') {
      if (items.length === 0) {
        setError('Agrega al menos un item para repartir el consumo.')
        return
      }
      const normalizedItems = items.map((item) => ({
        ...item,
        participantIds: item.participantIds.filter((id) =>
          effectiveParticipants.includes(id),
        ),
      }))
      const invalidItem = normalizedItems.find(
        (item) => item.participantIds.length === 0,
      )
      if (invalidItem) {
        setError('Cada item debe tener al menos un participante asignado.')
        return
      }
      const totalRegistered = normalizedItems.reduce(
        (acc, item) => acc + getItemTotal(item),
        0,
      )
      if (totalRegistered <= 0) {
        setError('El total registrado debe ser mayor a 0.')
        return
      }
      const diff = Math.abs(numericAmount - totalRegistered)
      if (diff > 0.01) {
        setError('La suma de items no coincide con el total del gasto.')
        return
      }
      consumptionPayload = buildConsumptionsFromItems(
        normalizedItems,
        effectiveParticipants,
      )
      itemsPayload = normalizedItems
    }

    setError(null)
    if (editingInvoiceId) {
      await onUpdate({
        invoiceId: editingInvoiceId,
        description: trimmedDescription,
        amount: numericAmount,
        payerId: effectivePayerId,
        participantIds: effectiveParticipants,
        divisionMethod,
        consumptions: consumptionPayload,
        items: itemsPayload,
        tipAmount: includeTip ? numericTip : undefined,
        birthdayPersonId: birthdayEnabled ? birthdayPersonId : undefined,
      })
    } else {
      const hasAuthToken =
        typeof window !== 'undefined' &&
        Boolean(window.localStorage.getItem('mitimiti_auth_token'))
      if (scanJobId && hasAuthToken) {
        try {
          await confirmScanApi(scanJobId, {
            eventId,
            description: trimmedDescription,
            totalAmount: numericAmount,
            payerId: effectivePayerId,
            participantIds: effectiveParticipants,
            divisionMethod,
            consumptions: consumptionPayload,
            items: itemsPayload?.map((item) => ({
              name: item.name,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              participantIds: item.participantIds,
            })),
            tipAmount: includeTip ? numericTip : undefined,
            birthdayPersonId: birthdayEnabled ? birthdayPersonId : undefined,
          })
          if (onRefreshEvent) {
            await onRefreshEvent()
          }
        } catch (error) {
          const message = (error as Error).message || 'No se pudo confirmar el OCR.'
          if (message.toLowerCase().includes('expired') || message.toLowerCase().includes('not found')) {
            toast.error(
              scanIsGuest
                ? 'El escaneo expiro en modo local. Vuelve a subir la factura.'
                : 'El escaneo expiro. Vuelve a escanear la factura.',
            )
          } else if (message.toLowerCase().includes('limit')) {
            toast.error('Alcanzaste el limite de lecturas OCR. Intenta mas tarde.')
          } else {
            toast.error(message)
          }
          return
        }
      } else {
        await onAdd({
          description: trimmedDescription,
          amount: numericAmount,
          payerId: effectivePayerId,
          participantIds: effectiveParticipants,
          divisionMethod,
          consumptions: consumptionPayload,
          items: itemsPayload,
          tipAmount: includeTip ? numericTip : undefined,
          birthdayPersonId: birthdayEnabled ? birthdayPersonId : undefined,
        })
      }
    }
    if (typeof window !== 'undefined' && isTourOpen && tourMeta === 'guided') {
      window.dispatchEvent(new CustomEvent('tour:go-tab', { detail: { tabId: 'summary' } }))
      if (steps && setCurrentStep) {
        setCurrentStep((current) => Math.min(current + 1, steps.length - 1))
      }
    }
    resetForm()
  }


  const startPolling = (jobId: string) => {
    if (scanPollRef.current) {
      window.clearInterval(scanPollRef.current)
    }
    const maxWaitMs = 120000
    scanStartRef.current = Date.now()
    scanPollRef.current = window.setInterval(async () => {
      try {
        if (scanStartRef.current && Date.now() - scanStartRef.current > maxWaitMs) {
          window.clearInterval(scanPollRef.current!)
          scanPollRef.current = null
          setScanStatus('idle')
          setScanJobId(null)
          setScanProgress(null)
          const message = scanIsGuest
            ? 'El escaneo esta tardando demasiado en modo local. Vuelve a subir la factura.'
            : 'El escaneo esta tardando demasiado. Intenta de nuevo.'
          setScanError(message)
          toast.error(message)
          return
        }
        const status = await getScanStatusApi(jobId)
        if (typeof status.progress === 'number') {
          setScanProgress(status.progress)
        }
        if (status.status === 'completed' && status.result) {
          window.clearInterval(scanPollRef.current!)
          scanPollRef.current = null
          const rawTotal = status.result.totalAmount ?? status.result.subtotal ?? 0
          const baseTotal = rawTotal
          setShowForm(true)
          setEditingInvoiceId(null)
          setDivisionMethod('equal')
          setShowConsumption(false)
          setShowParticipants(false)
          setBirthdayEnabled(false)
          setBirthdayPersonId('')
          setExpandedItems({})
          setItemError(null)
          setDescription(status.result.description ?? '')
          setAmount(rawTotal ? baseTotal.toFixed(2) : '')
          if (status.result.tipAmount && status.result.tipAmount > 0) {
            setIncludeTip(true)
            setTipAmount(status.result.tipAmount.toFixed(2))
          } else {
            setIncludeTip(false)
            setTipAmount('')
          }
          const rawItems = status.result.items ?? []
          const nextItems = rawItems
            .filter(
              (item) =>
                Number.isFinite(item.unitPrice) &&
                Number.isFinite(item.quantity) &&
                item.unitPrice > 0 &&
                item.quantity > 0,
            )
            .map((item) => ({
              id: createId(),
              name: item.name,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              participantIds: [],
            }))
          const droppedItemsCount = rawItems.length - nextItems.length
          setItems(nextItems)
          const warningMap: Array<[string, string]> = [
            [
              'Subtotal + tip does not match total.',
              'La propina no cuadra con el total. Revisa los valores.',
            ],
            [
              'Subtotal + tax does not match total.',
              'El subtotal e impuestos no cuadran con el total. Revisa los valores.',
            ],
            [
              'Subtotal inferred from items sum.',
              'El subtotal se infirio con la suma de items.',
            ],
            [
              'Tip inferred from items.',
              'La propina se infirio desde un item.',
            ],
            [
              'Tip inferred from total minus subtotal.',
              'La propina se infirio restando subtotal al total.',
            ],
            [
              'Total adjusted to exclude tip amount.',
              'El total se ajusto para excluir la propina.',
            ],
            [
              'Currency missing, using event currency.',
              'No se detecto moneda, usamos la del evento.',
            ],
            [
              'Currency does not match event currency. Using event currency.',
              'La moneda no coincide, usamos la del evento.',
            ],
          ]
          const mappedWarnings = (status.result.warnings ?? []).map((warning) => {
            const match = warningMap.find(([key]) => warning === key)
            return match ? match[1] : warning
          })
          if (droppedItemsCount > 0) {
            mappedWarnings.push(
              `Se omitieron ${droppedItemsCount} items incompletos. Completa manualmente si es necesario.`,
            )
          }
          setScanWarnings(mappedWarnings)
          setScanFromOcr(true)
          setScanStatus('idle')
          setScanProgress(null)
          setScanError(null)
          setScanModalOpen(true)
          setRescanConfirmOpen(false)
                scanStartRef.current = null
          toast.success('Lectura lista. Revisa y ajusta los datos.')
        } else if (status.status === 'failed') {
          window.clearInterval(scanPollRef.current!)
          scanPollRef.current = null
          setScanStatus('idle')
          setScanProgress(null)
          setScanError(status.failedReason ?? 'No se pudo procesar la factura.')
          scanStartRef.current = null
          toast.error(status.failedReason ?? 'No se pudo procesar la factura.')
        }
      } catch {
        window.clearInterval(scanPollRef.current!)
        scanPollRef.current = null
        setScanStatus('idle')
        setScanJobId(null)
        setScanProgress(null)
        const message = scanIsGuest
          ? 'El escaneo expiro en modo local. Vuelve a subir la factura.'
          : 'El escaneo expiro o no se pudo consultar el estado.'
        setScanError(message)
        scanStartRef.current = null
        toast.error(message)
      }
    }, 1500)
  }

  const startScan = async (file: File, useRescan: boolean) => {
    setError(null)
    setScanWarnings([])
    setScanFromOcr(false)
    setScanError(null)
    setScanProgress(null)
    setScanIsGuest(false)
    try {
      setScanStatus('uploading')
      const hasAuthToken =
        typeof window !== 'undefined' &&
        Boolean(window.localStorage.getItem('mitimiti_auth_token'))
      setScanIsGuest(!hasAuthToken)
      const jobId = useRescan && scanJobId
        ? (await rescanInvoiceApi(scanJobId, eventId, file)).jobId
        : (await scanInvoiceApi(eventId, file)).jobId
      setScanJobId(jobId)
      setScanStatus('processing')
      startPolling(jobId)
    } catch (scanError) {
      setScanStatus('idle')
      setScanJobId(null)
      setScanProgress(null)
      const message = (scanError as Error).message || 'No se pudo escanear la factura.'
      setScanError(message)
      scanStartRef.current = null
      if (message.toLowerCase().includes('limit')) {
        toast.error('Alcanzaste el limite de lecturas OCR. Intenta mas tarde.')
      } else {
        toast.error(message)
      }
    }
  }


  const isScanning = scanStatus !== 'idle'
  const consumptionSum = useMemo(() => {
    if (divisionMethod !== 'consumption') return 0
    return roundToCents(items.reduce((acc, item) => acc + getItemTotal(item), 0))
  }, [divisionMethod, items])

  const modalSteps: ExpenseStep[] =
    showConsumption ? ['basic', 'split', 'items', 'confirm'] : ['basic', 'split', 'confirm']

  const validateBasicStep = () => {
    const trimmedDescription = description.trim()
    const numericAmount = Number(amount)
    const effectivePayerId = resolvedPayerId

    if (!trimmedDescription) {
      setError('La descripcion es obligatoria.')
      return false
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('El monto debe ser mayor que 0.')
      return false
    }
    if (!effectivePayerId) {
      setError('Debes seleccionar un pagador.')
      return false
    }
    return true
  }

  const validateSplitStep = () => {
    const effectiveParticipants = effectiveParticipantIds
    const numericTip = Number(tipAmount || 0)

    if (effectiveParticipants.length === 0) {
      setError('Selecciona al menos un participante.')
      return false
    }
    if (birthdayEnabled) {
      if (!birthdayPersonId) {
        setError('Selecciona a la persona invitada especial.')
        return false
      }
      if (!effectiveParticipants.includes(birthdayPersonId)) {
        setError('El invitado especial debe estar en la lista de participantes.')
        return false
      }
      if (effectiveParticipants.length < 2) {
        setError(
          'Se necesita al menos otra persona para repartir el consumo del invitado especial.',
        )
        return false
      }
    }
    if (includeTip && (!Number.isFinite(numericTip) || numericTip <= 0)) {
      setError('La propina debe ser mayor que 0.')
      return false
    }
    return true
  }

  const validateItemsStep = () => {
    if (divisionMethod !== 'consumption') return true
    const numericAmount = Number(amount)

    if (items.length === 0) {
      setError('Agrega al menos un item para repartir el consumo.')
      return false
    }
    const normalizedItems = items.map((item) => ({
      ...item,
      participantIds: item.participantIds.filter((id) =>
        effectiveParticipantIds.includes(id),
      ),
    }))
    const invalidItem = normalizedItems.find((item) => item.participantIds.length === 0)
    if (invalidItem) {
      setError('Cada item debe tener al menos un participante asignado.')
      return false
    }
    const totalRegistered = normalizedItems.reduce((acc, item) => acc + getItemTotal(item), 0)
    if (totalRegistered <= 0) {
      setError('El total registrado debe ser mayor a 0.')
      return false
    }
    const diff = Math.abs(numericAmount - totalRegistered)
    if (diff > 0.01) {
      setError('La suma de items no coincide con el total del gasto.')
      return false
    }
    return true
  }

  const handleModalNext = () => {
    setError(null)
    if (expenseStep === 'basic' && !validateBasicStep()) return
    if (expenseStep === 'split' && !validateSplitStep()) return
    if (expenseStep === 'items' && !validateItemsStep()) return

    const currentIndex = modalSteps.indexOf(expenseStep)
    const nextStep = modalSteps[currentIndex + 1]
    if (nextStep) {
      setExpenseStep(nextStep)
    }
  }

  const handleModalBack = () => {
    setError(null)
    const currentIndex = modalSteps.indexOf(expenseStep)
    const previousStep = modalSteps[currentIndex - 1]
    if (previousStep) {
      setExpenseStep(previousStep)
    }
  }

  useEffect(() => {
    return () => {
      if (scanPollRef.current) {
        window.clearInterval(scanPollRef.current)
        scanPollRef.current = null
      }
      scanStartRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!showForm) return
    window.dispatchEvent(new CustomEvent('tour:invoice-form-open'))
  }, [showForm])

  const advanceTourStep = () => {
    if (!isTourOpen || tourMeta !== 'guided') return
    if (!steps || !setCurrentStep) return
    setCurrentStep((current) => Math.min(current + 1, steps.length - 1))
  }

  const toggleConsumption = (nextMode?: 'equal' | 'consumption') => {
    setShowConsumption((current) => {
      const next = nextMode ? nextMode === 'consumption' : !current
      setDivisionMethod(next ? 'consumption' : 'equal')
      if (next) {
        setShowParticipants(true)
      }
      if (!next) {
        setItems([])
        setExpandedItems({})
        setItemModalOpen(false)
        setEditingItemId(null)
        setItemName('')
        setItemUnitPrice('')
        setItemQuantity('1')
        setItemParticipantIds([])
        setItemError(null)
        setError(null)
      }
      return next
    })
    setExpenseStep((current) => {
      if (current === 'items' && nextMode === 'equal') return 'split'
      return current
    })
    setError(null)
  }

  return (
    <>
      <InvoiceItemModal
        open={itemModalOpen}
        currency={currency}
        people={people}
        resolvedPayerId={resolvedPayerId}
        effectiveParticipantIds={effectiveParticipantIds}
        editingItemId={editingItemId}
        itemName={itemName}
        itemUnitPrice={itemUnitPrice}
        itemQuantity={itemQuantity}
        itemParticipantIds={itemParticipantIds}
        itemError={itemError}
        onItemNameChange={setItemName}
        onItemUnitPriceChange={setItemUnitPrice}
        onItemQuantityChange={setItemQuantity}
        onItemParticipantIdsChange={setItemParticipantIds}
        onErrorChange={setItemError}
        onClose={() => {
          setItemModalOpen(false)
          setItemError(null)
        }}
        onSave={(nextItem) => {
          setItems((current) => {
            if (editingItemId) {
              return current.map((item) =>
                item.id === editingItemId ? nextItem : item,
              )
            }
            return [...current, nextItem]
          })
          setItemModalOpen(false)
          setEditingItemId(null)
          setItemName('')
          setItemUnitPrice('')
          setItemQuantity('1')
          setItemParticipantIds([])
          setItemError(null)
        }}
      />

      <ExpenseEditorModal
        open={showForm}
        mode={editingInvoiceId ? 'edit' : 'create'}
        currentStep={expenseStep}
        steps={modalSteps}
        currency={currency}
        description={description}
        amount={amount}
        people={people}
        resolvedPayerId={resolvedPayerId}
        includeTip={includeTip}
        tipAmount={tipAmount}
        birthdayEnabled={birthdayEnabled}
        birthdayPersonId={birthdayPersonId}
        showParticipants={showParticipants}
        showConsumption={showConsumption}
        items={items}
        expandedItems={expandedItems}
        effectiveParticipantIds={effectiveParticipantIds}
        sanitizedParticipantIds={sanitizedParticipantIds}
        birthdayOptions={birthdayOptions}
        consumptionSum={consumptionSum}
        error={error}
        onDescriptionChange={setDescription}
        onAmountChange={setAmount}
        onPayerChange={handlePayerChange}
        onIncludeTipChange={(checked) => {
          setIncludeTip(checked)
          if (!checked) setTipAmount('')
          setError(null)
        }}
        onTipAmountChange={setTipAmount}
        onBirthdayEnabledChange={(checked) => {
          setBirthdayEnabled(checked)
          if (!checked) setBirthdayPersonId('')
          setError(null)
        }}
        onBirthdayPersonIdChange={setBirthdayPersonId}
        onShowParticipantsChange={(checked) => {
          setShowParticipants(checked)
          if (!checked) setError(null)
        }}
        onToggleConsumption={toggleConsumption}
        onToggleParticipant={handleToggleParticipant}
        onToggleExpanded={(itemId) =>
          setExpandedItems((current) => ({
            ...current,
            [itemId]: !current[itemId],
          }))
        }
        onEditItem={(item) => {
          const nextParticipants = item.participantIds.filter((id) =>
            effectiveParticipantIds.includes(id),
          )
          setEditingItemId(item.id)
          setItemName(item.name)
          setItemUnitPrice(String(item.unitPrice))
          setItemQuantity(String(item.quantity))
          setItemParticipantIds(nextParticipants)
          setItemError(null)
          setItemModalOpen(true)
        }}
        onRemoveItem={(itemId) =>
          setItems((current) => current.filter((entry) => entry.id !== itemId))
        }
        onAddItem={() => {
          setEditingItemId(null)
          setItemName('')
          setItemUnitPrice('')
          setItemQuantity('1')
          setItemParticipantIds([])
          setItemError(null)
          setItemModalOpen(true)
        }}
        onClose={resetForm}
        onBack={handleModalBack}
        onNext={handleModalNext}
        onSubmit={() => {
          void handleSubmit({ preventDefault() {} } as FormEvent)
        }}
        resolvePersonName={resolvePersonName}
        getItemTotal={getItemTotal}
        buildItemShares={buildItemShares}
      />

      <SectionCard
        title="Gastos"
        description="Anota cada gasto: quién pagó, cuánto y quiénes participaron."
        badge={`${invoices.length}`}
        action={
          invoices.length > 0 ? (
            <Badge variant="count">
              Total: {currency} {grandTotal.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
            </Badge>
          ) : null
        }
      >
      <div className="space-y-5">
        <p className="flex items-start gap-2 text-xs text-[color:var(--color-text-muted)]">
          <span className="shrink-0 text-sm">💡</span>
          <span>Puedes agregar propina, elegir quién participó o dividir por lo que cada uno consumió.</span>
        </p>

        <div className="flex items-center justify-end">
          <div data-tour="invoice-add-menu">
            <ActionMenu
              label="Agregar gasto"
              align="right"
              items={[
                {
                  label: 'Manual',
                  dataTour: 'invoice-add-manual',
                  icon: <Plus className="h-4 w-4" />,
                  onClick: () => {
                    openCreateFlow()
                    setTimeout(() => {
                      advanceTourStep()
                    }, 100)
                  },
                },
              ]}
              renderTrigger={({ onClick, isOpen, ariaLabel, onKeyDown }) => (
                <Button
                  type="button"
                  size="sm"
                  onClick={(event) => {
                    if (isScanning) {
                      event.preventDefault()
                      return
                    }
                    onClick(event)
                    if (!isOpen) {
                      setTimeout(() => {
                        advanceTourStep()
                      }, 100)
                    }
                  }}
                  onKeyDown={onKeyDown}
                  aria-label={ariaLabel}
                  aria-disabled={isScanning}
                  data-tour="invoice-add"
                  className={`gap-2 ${isScanning ? 'cursor-not-allowed opacity-60' : ''}`}
                  disabled={isScanning}
                >
                  Agregar gasto
                  <ChevronDown className="h-4 w-4" />
                </Button>
              )}
            />
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,application/pdf"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (!file) return
            event.target.value = ''
            void startScan(file, Boolean(scanFromOcr))
          }}
        />
        <ScanProgressBanner status={scanStatus} progress={scanProgress} />

        {scanError && scanJobId ? (
          <div className="rounded-lg border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-panel)] px-4 py-3 text-sm text-[color:var(--color-text-muted)] shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>{scanError}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-[color:var(--color-primary-main)] hover:text-[color:var(--color-primary-dark)]"
                onClick={async () => {
                  if (!scanJobId) return
                  try {
                    setScanError(null)
                    setScanStatus('processing')
                    const next = await retryScanApi(scanJobId)
                    setScanJobId(next.jobId)
                    startPolling(next.jobId)
                  } catch (error) {
                    setScanStatus('idle')
                    setScanError((error as Error).message || 'No se pudo reintentar el OCR.')
                  }
                }}
              >
                Reintentar
              </Button>
            </div>
          </div>
        ) : null}

        <OcrDecisionModal
          open={scanFromOcr && scanModalOpen}
          warnings={scanWarnings}
          description={description}
          currency={currency}
          amount={amount}
          includeTip={includeTip}
          tipAmount={tipAmount}
          items={items}
          divisionMethod={divisionMethod}
          scanIsGuest={scanIsGuest}
          rescanConfirmOpen={rescanConfirmOpen}
          onSelectEqual={() => {
            setDivisionMethod('equal')
            setShowConsumption(false)
            setScanModalOpen(false)
            setRescanConfirmOpen(false)
          }}
          onSelectConsumption={() => {
            setDivisionMethod('consumption')
            setShowConsumption(true)
            setShowParticipants(true)
            setScanModalOpen(false)
            setRescanConfirmOpen(false)
          }}
          onOpenRescanConfirm={() => setRescanConfirmOpen(true)}
          onCancelRescan={() => setRescanConfirmOpen(false)}
          onConfirmRescan={() => {
            setRescanConfirmOpen(false)
            setScanModalOpen(false)
            fileInputRef.current?.click()
          }}
        />

        {showForm ? (
          <div className="rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-primary-soft)]/45 px-4 py-3 text-sm text-[color:var(--color-text-main)]">
            {editingInvoiceId
              ? 'Estas editando un gasto desde el modal.'
              : 'El editor premium de gastos esta abierto.'}
          </div>
        ) : null}
          <InvoiceList
            invoices={invoices}
            currency={currency}
            people={people}
            onEdit={startEdit}
            onRemove={onRemove}
            calculateShares={(invoice) => calculateShares(invoice, people)}
          />
      </div>
      </SectionCard>
    </>
  )
}

function resolvePersonName(id: string, people: PersonForUI[]) {
  return people.find((person) => person.id === id)?.name ?? 'Desconocido'
}

const roundToCents = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100
