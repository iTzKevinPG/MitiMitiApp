import { createPortal } from 'react-dom'
import {
  ArrowLeft,
  CheckCircle2,
  ChefHat,
  CreditCard,
  Gift,
  Sparkles,
  Split,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { Badge } from '../../../shared/components/ui/badge'
import { Button } from '../../../shared/components/ui/button'
import { Checkbox } from '../../../shared/components/ui/checkbox'
import { Input } from '../../../shared/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../shared/components/ui/select'
import { ConsumptionItemsSection } from './ConsumptionItemsSection'
import { MemberChip } from '../MemberChip'
import type { InvoiceItem } from '../../../domain/invoice/Invoice'
import type { PersonForUI } from '../../../shared/state/appStore'

type ExpenseStep = 'basic' | 'split' | 'items' | 'confirm'

interface ExpenseEditorModalProps {
  open: boolean
  mode: 'create' | 'edit'
  currentStep: ExpenseStep
  steps: ExpenseStep[]
  currency: string
  description: string
  amount: string
  people: PersonForUI[]
  resolvedPayerId?: string
  includeTip: boolean
  tipAmount: string
  birthdayEnabled: boolean
  birthdayPersonId: string
  showParticipants: boolean
  showConsumption: boolean
  items: InvoiceItem[]
  expandedItems: Record<string, boolean>
  effectiveParticipantIds: string[]
  sanitizedParticipantIds: string[]
  birthdayOptions: string[]
  consumptionSum: number
  error: string | null
  onDescriptionChange: (value: string) => void
  onAmountChange: (value: string) => void
  onPayerChange: (value: string) => void
  onIncludeTipChange: (checked: boolean) => void
  onTipAmountChange: (value: string) => void
  onBirthdayEnabledChange: (checked: boolean) => void
  onBirthdayPersonIdChange: (value: string) => void
  onShowParticipantsChange: (checked: boolean) => void
  onToggleConsumption: (nextMode: 'equal' | 'consumption') => void
  onToggleParticipant: (id: string) => void
  onToggleExpanded: (itemId: string) => void
  onEditItem: (item: InvoiceItem) => void
  onRemoveItem: (itemId: string) => void
  onAddItem: () => void
  onClose: () => void
  onBack: () => void
  onNext: () => void
  onSubmit: () => void
  resolvePersonName: (id: string, people: PersonForUI[]) => string
  getItemTotal: (item: InvoiceItem) => number
  buildItemShares: (item: InvoiceItem) => Array<{ personId: string; amount: number }>
}

const stepLabels: Record<ExpenseStep, string> = {
  basic: 'Basico',
  split: 'Reparto',
  items: 'Detalle',
  confirm: 'Confirmacion',
}

export function ExpenseEditorModal({
  open,
  mode,
  currentStep,
  steps,
  currency,
  description,
  amount,
  people,
  resolvedPayerId,
  includeTip,
  tipAmount,
  birthdayEnabled,
  birthdayPersonId,
  showParticipants,
  showConsumption,
  items,
  expandedItems,
  effectiveParticipantIds,
  sanitizedParticipantIds,
  birthdayOptions,
  consumptionSum,
  error,
  onDescriptionChange,
  onAmountChange,
  onPayerChange,
  onIncludeTipChange,
  onTipAmountChange,
  onBirthdayEnabledChange,
  onBirthdayPersonIdChange,
  onShowParticipantsChange,
  onToggleConsumption,
  onToggleParticipant,
  onToggleExpanded,
  onEditItem,
  onRemoveItem,
  onAddItem,
  onClose,
  onBack,
  onNext,
  onSubmit,
  resolvePersonName,
  getItemTotal,
  buildItemShares,
}: ExpenseEditorModalProps) {
  if (!open || typeof document === 'undefined') return null

  const currentIndex = steps.indexOf(currentStep)
  const isFirstStep = currentIndex <= 0
  const isFinalStep = currentIndex === steps.length - 1
  const numericAmount = Number(amount) || 0
  const numericTip = Number(tipAmount) || 0
  const totalWithTip = numericAmount + (includeTip ? numericTip : 0)
  const activeParticipants = showParticipants ? sanitizedParticipantIds : people.map((person) => person.id)
  const payerName = resolvedPayerId ? resolvePersonName(resolvedPayerId, people) : 'Sin pagador'
  const amountDifference = Math.round((numericAmount - consumptionSum + Number.EPSILON) * 100) / 100

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 px-0 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6">
      <div
        className="relative flex h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-[28px] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-card)] shadow-[var(--shadow-lg)] animate-fade-in sm:h-[min(88vh,860px)] sm:rounded-[28px]"
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'edit' ? 'Editar gasto' : 'Nuevo gasto'}
        data-tour="invoice-form"
      >
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[color:var(--color-primary-soft)] via-[color:var(--color-primary-soft)]/60 to-transparent pointer-events-none" />

        <div className="relative flex items-start justify-between gap-4 border-b border-[color:var(--color-border-subtle)] px-4 pb-4 pt-5 sm:px-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-primary-main)]/15 bg-[color:var(--color-primary-soft)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--color-primary-main)]">
              <Sparkles className="h-3.5 w-3.5" />
              Centro de gastos
            </div>
            <div>
              <h2 className="text-xl font-bold text-[color:var(--color-text-main)] sm:text-2xl">
                {mode === 'edit' ? 'Editar gasto' : 'Nuevo gasto'}
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-[color:var(--color-text-muted)]">
                Un flujo mas claro para registrar monto, reparto y detalle sin saturar la pantalla.
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={onClose}
            variant="ghost"
            size="icon-sm"
            className="relative z-10 rounded-full text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text-main)]"
            aria-label="Cerrar editor de gasto"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="relative border-b border-[color:var(--color-border-subtle)] px-4 py-4 sm:px-6">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {steps.map((step, index) => {
              const state =
                index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming'
              return (
                <div
                  key={step}
                  className={`rounded-2xl border px-3 py-2.5 transition-all ${
                    state === 'current'
                      ? 'border-[color:var(--color-primary-light)] bg-[color:var(--color-primary-soft)] shadow-[var(--shadow-sm)]'
                      : state === 'done'
                      ? 'border-[color:var(--color-primary-main)]/15 bg-[color:var(--color-surface-card)]'
                      : 'border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-muted)]/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ${
                        state === 'current'
                          ? 'bg-[color:var(--color-primary-main)] text-[color:var(--color-text-on-primary)]'
                          : state === 'done'
                          ? 'bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary-main)]'
                          : 'bg-[color:var(--color-surface-card)] text-[color:var(--color-text-muted)]'
                      }`}
                    >
                      {state === 'done' ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-text-muted)]">
                        Paso {index + 1}
                      </p>
                      <p className="truncate text-sm font-semibold text-[color:var(--color-text-main)]">
                        {stepLabels[step]}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
          <div className="mx-auto max-w-3xl space-y-5">
            {currentStep === 'basic' ? (
              <>
                <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                  <div
                    className="rounded-3xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-card)] p-4 shadow-[var(--shadow-sm)] sm:p-5"
                    data-tour="invoice-split-step"
                  >
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary-main)]">
                        <Wallet className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-primary-main)]">
                          Basico
                        </p>
                        <h3 className="text-lg font-semibold text-[color:var(--color-text-main)]">
                          Que paso y cuanto fue
                        </h3>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-text-muted)]">
                          Concepto
                        </label>
                        <Input
                          placeholder="Cena, gasolina, mercado..."
                          value={description}
                          onChange={(event) => onDescriptionChange(event.target.value)}
                          data-tour="invoice-description"
                          autoFocus
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-text-muted)]">
                          Total del gasto
                        </label>
                        <div className="flex items-center rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-input)] shadow-[var(--shadow-sm)] focus-within:border-[color:var(--color-primary-main)] focus-within:ring-2 focus-within:ring-[color:var(--color-focus-ring)] focus-within:ring-offset-2 focus-within:ring-offset-[color:var(--color-app-bg)]">
                          <span className="flex h-11 items-center rounded-l-2xl border-r border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-muted)] px-3 text-xs font-bold text-[color:var(--color-text-muted)]">
                            {currency}
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={amount}
                            onChange={(event) => onAmountChange(event.target.value)}
                            className="w-full appearance-none bg-transparent px-3 py-3 text-lg font-semibold text-[color:var(--color-text-main)] outline-none placeholder:text-[color:var(--color-text-muted)]"
                            data-tour="invoice-amount"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-text-muted)]">
                          Pago
                        </label>
                        <Select
                          value={resolvedPayerId || undefined}
                          onValueChange={onPayerChange}
                          disabled={people.length === 0}
                        >
                          <SelectTrigger data-tour="invoice-payer">
                            <SelectValue placeholder="Selecciona pagador" />
                          </SelectTrigger>
                          <SelectContent data-tour="invoice-payer-options" data-tour-select-content>
                            {people.length === 0 ? (
                              <SelectItem value="__empty" disabled>
                                No hay personas
                              </SelectItem>
                            ) : (
                              people.map((person) => (
                                <SelectItem key={person.id} value={person.id}>
                                  Pago: {person.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-3xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-card)] p-4 shadow-[var(--shadow-sm)] sm:p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-text-muted)]">
                        Resumen rapido
                      </p>
                      <div className="mt-4 space-y-3">
                        <div className="rounded-2xl bg-[color:var(--color-primary-soft)] px-4 py-3">
                          <p className="text-xs text-[color:var(--color-text-muted)]">Concepto</p>
                          <p className="mt-1 text-sm font-semibold text-[color:var(--color-text-main)]">
                            {description.trim() || 'Aun sin descripcion'}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-[color:var(--color-border-subtle)] px-4 py-3">
                          <p className="text-xs text-[color:var(--color-text-muted)]">Total estimado</p>
                          <p className="mt-1 text-2xl font-bold text-[color:var(--color-primary-main)]">
                            {currency} {(numericAmount || 0).toFixed(2)}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-dashed border-[color:var(--color-border-subtle)] px-4 py-3 text-sm text-[color:var(--color-text-muted)]">
                          El siguiente paso te ayudara a decidir como repartirlo y que extras activar.
                        </div>
                      </div>
                    </div>

                    {people.length === 0 ? (
                      <div className="ds-alert ds-alert-warning">
                        Agrega personas al evento para poder registrar el gasto.
                      </div>
                    ) : null}
                  </div>
                </div>
              </>
            ) : null}

            {currentStep === 'split' ? (
              <>
                {(includeTip || birthdayEnabled || showParticipants || showConsumption) ? (
                  <span className="hidden" data-tour="invoice-advanced" />
                ) : null}

                <div className="grid gap-4">
                  <div className="rounded-3xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-card)] p-4 shadow-[var(--shadow-sm)] sm:p-5">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary-main)]">
                        <Split className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-primary-main)]">
                          Reparto
                        </p>
                        <h3 className="text-lg font-semibold text-[color:var(--color-text-main)]">
                          Elige la logica del gasto
                        </h3>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => onToggleConsumption('equal')}
                        className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                          !showConsumption
                            ? 'border-[color:var(--color-primary-light)] bg-[color:var(--color-primary-soft)] shadow-[var(--shadow-sm)]'
                            : 'border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-card)] hover:border-[color:var(--color-primary-light)]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[color:var(--color-surface-card)] text-[color:var(--color-primary-main)]">
                            <Users className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[color:var(--color-text-main)]">
                              Partes iguales
                            </p>
                            <p className="text-xs text-[color:var(--color-text-muted)]">
                              Ideal si todos participaron de la misma forma.
                            </p>
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleConsumption('consumption')}
                        className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                          showConsumption
                            ? 'border-[color:var(--color-accent-lila)] bg-[color:var(--color-accent-lila-soft)] shadow-[var(--shadow-sm)]'
                            : 'border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-card)] hover:border-[color:var(--color-accent-lila)]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[color:var(--color-surface-card)] text-[color:var(--color-accent-lila)]">
                            <ChefHat className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[color:var(--color-text-main)]">
                              Por consumo
                            </p>
                            <p className="text-xs text-[color:var(--color-text-muted)]">
                              Reparte segun los items que pidio cada persona.
                            </p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-3xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-card)] p-4 shadow-[var(--shadow-sm)] sm:p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-text-muted)]">
                            Participantes
                          </p>
                          <h4 className="mt-1 text-base font-semibold text-[color:var(--color-text-main)]">
                            Quien entra en este gasto
                          </h4>
                        </div>
                        <label className="flex items-center gap-2 rounded-full border border-[color:var(--color-border-subtle)] px-3 py-2 text-xs font-semibold text-[color:var(--color-text-main)]">
                          <Checkbox
                            checked={showParticipants}
                            onCheckedChange={(checked) => onShowParticipantsChange(Boolean(checked))}
                          />
                          Personalizar
                        </label>
                      </div>

                      <div className="mt-4">
                        {!showParticipants ? (
                          <div className="rounded-2xl border border-dashed border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-muted)]/60 px-4 py-3 text-sm text-[color:var(--color-text-muted)]">
                            Se repartira entre todas las personas del evento.
                          </div>
                        ) : (
                          <div className="space-y-3" data-tour="invoice-participants">
                            <div className="flex flex-wrap gap-2">
                              {people.length === 0 ? (
                                <span className="text-sm text-[color:var(--color-text-muted)]">
                                  Agrega personas para asignar participantes.
                                </span>
                              ) : (
                                people.map((person) => {
                                  const checked = sanitizedParticipantIds.includes(person.id)
                                  const isPayer = person.id === resolvedPayerId
                                  return (
                                    <MemberChip
                                      key={person.id}
                                      name={person.name}
                                      isPayer={isPayer}
                                      isSelected={checked}
                                      isEditable
                                      onToggle={isPayer ? undefined : () => onToggleParticipant(person.id)}
                                    />
                                  )
                                })
                              )}
                            </div>
                            <p className="text-xs text-[color:var(--color-text-muted)]">
                              El pagador siempre queda incluido para evitar inconsistencias.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-card)] p-4 shadow-[var(--shadow-sm)] sm:p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-text-muted)]">
                        Extras
                      </p>
                      <div className="mt-4 space-y-4">
                        <div className="rounded-2xl border border-[color:var(--color-border-subtle)] p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <CreditCard className="h-4 w-4 text-[color:var(--color-primary-main)]" />
                                <p className="text-sm font-semibold text-[color:var(--color-text-main)]">
                                  Propina
                                </p>
                              </div>
                              <p className="text-xs text-[color:var(--color-text-muted)]">
                                Guardala aparte para que el total quede claro.
                              </p>
                            </div>
                            <Checkbox
                              checked={includeTip}
                              onCheckedChange={(checked) => onIncludeTipChange(Boolean(checked))}
                            />
                          </div>
                          {includeTip ? (
                            <div className="mt-3">
                              <div className="flex items-center rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-input)] shadow-[var(--shadow-sm)]">
                                <span className="flex h-10 items-center rounded-l-2xl border-r border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-muted)] px-3 text-xs font-bold text-[color:var(--color-text-muted)]">
                                  {currency}
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={tipAmount}
                                  onChange={(event) => onTipAmountChange(event.target.value)}
                                  className="w-full appearance-none bg-transparent px-3 py-2.5 text-sm text-[color:var(--color-text-main)] outline-none"
                                />
                              </div>
                            </div>
                          ) : null}
                        </div>

                        <div className="rounded-2xl border border-[color:var(--color-border-subtle)] p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Gift className="h-4 w-4 text-[color:var(--color-accent-coral)]" />
                                <p className="text-sm font-semibold text-[color:var(--color-text-main)]">
                                  Invitado especial
                                </p>
                              </div>
                              <p className="text-xs text-[color:var(--color-text-muted)]">
                                Esa persona no paga su parte y el resto la cubre.
                              </p>
                            </div>
                            <Checkbox
                              checked={birthdayEnabled}
                              onCheckedChange={(checked) => onBirthdayEnabledChange(Boolean(checked))}
                            />
                          </div>
                          {birthdayEnabled ? (
                            <div className="mt-3">
                              <Select
                                value={birthdayPersonId || undefined}
                                onValueChange={onBirthdayPersonIdChange}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecciona invitado especial" />
                                </SelectTrigger>
                                <SelectContent data-tour-select-content>
                                  {birthdayOptions.map((id) => (
                                    <SelectItem key={id} value={id}>
                                      {resolvePersonName(id, people)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : null}

            {currentStep === 'items' ? (
              <>
                <div className="rounded-3xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-card)] p-4 shadow-[var(--shadow-sm)] sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-text-muted)]">
                        Detalle del consumo
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-[color:var(--color-text-main)]">
                        Asigna los items y controla la diferencia
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">Total gasto: {currency} {numericAmount.toFixed(2)}</Badge>
                      <Badge variant="outline">Items: {items.length}</Badge>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-[color:var(--color-primary-soft)] px-4 py-3">
                      <p className="text-xs text-[color:var(--color-text-muted)]">Registrado</p>
                      <p className="mt-1 text-lg font-bold text-[color:var(--color-primary-main)]">
                        {currency} {consumptionSum.toFixed(2)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[color:var(--color-border-subtle)] px-4 py-3">
                      <p className="text-xs text-[color:var(--color-text-muted)]">Diferencia</p>
                      <p
                        className={`mt-1 text-lg font-bold ${
                          Math.abs(amountDifference) <= 0.01
                            ? 'text-[color:var(--color-accent-success)]'
                            : 'text-[color:var(--color-accent-danger)]'
                        }`}
                      >
                        {currency} {amountDifference.toFixed(2)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-dashed border-[color:var(--color-border-subtle)] px-4 py-3 text-sm text-[color:var(--color-text-muted)]">
                      {items.length === 0
                        ? 'Empieza agregando items para que el reparto por consumo tenga sentido.'
                        : 'Cuando la diferencia llegue a 0, el resumen estara listo para confirmar.'}
                    </div>
                  </div>
                </div>

                <ConsumptionItemsSection
                  currency={currency}
                  people={people}
                  items={items}
                  expandedItems={expandedItems}
                  effectiveParticipantIds={effectiveParticipantIds}
                  consumptionSum={consumptionSum}
                  onToggleExpanded={onToggleExpanded}
                  onEditItem={onEditItem}
                  onRemoveItem={onRemoveItem}
                  onAddItem={onAddItem}
                  resolvePersonName={resolvePersonName}
                  getItemTotal={getItemTotal}
                  buildItemShares={buildItemShares}
                />
              </>
            ) : null}

            {currentStep === 'confirm' ? (
              <>
                <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                  <div className="rounded-3xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-card)] p-4 shadow-[var(--shadow-sm)] sm:p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-text-muted)]">
                      Confirmacion
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-[color:var(--color-text-main)]">
                      Revisa antes de guardar
                    </h3>

                    <div className="mt-4 rounded-3xl bg-[color:var(--color-primary-soft)] px-4 py-4">
                      <p className="text-xs text-[color:var(--color-text-muted)]">Concepto</p>
                      <p className="mt-1 text-lg font-semibold text-[color:var(--color-text-main)]">
                        {description.trim() || 'Sin descripcion'}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Badge variant="outline">Pago: {payerName}</Badge>
                        <Badge variant="outline">
                          Metodo: {showConsumption ? 'Por consumo' : 'Partes iguales'}
                        </Badge>
                        <Badge variant="outline">
                          Participantes: {activeParticipants.length}
                        </Badge>
                      </div>
                      <div className="mt-4 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-xs text-[color:var(--color-text-muted)]">Subtotal</p>
                          <p className="text-2xl font-bold text-[color:var(--color-primary-main)]">
                            {currency} {numericAmount.toFixed(2)}
                          </p>
                        </div>
                        {includeTip ? (
                          <div className="text-right">
                            <p className="text-xs text-[color:var(--color-text-muted)]">Propina</p>
                            <p className="text-lg font-semibold text-[color:var(--color-accent-warning)]">
                              {currency} {numericTip.toFixed(2)}
                            </p>
                          </div>
                        ) : null}
                      </div>
                      {includeTip ? (
                        <div className="mt-3 border-t border-[color:var(--color-primary-main)]/10 pt-3">
                          <p className="text-xs text-[color:var(--color-text-muted)]">Total mostrado</p>
                          <p className="text-xl font-bold text-[color:var(--color-text-main)]">
                            {currency} {totalWithTip.toFixed(2)}
                          </p>
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="rounded-2xl border border-[color:var(--color-border-subtle)] px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-text-muted)]">
                          Quienes entran
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {activeParticipants.map((personId) => (
                            <Badge key={personId} variant="outline">
                              {resolvePersonName(personId, people)}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {showConsumption ? (
                        <div className="rounded-2xl border border-[color:var(--color-border-subtle)] px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-text-muted)]">
                            Detalle por consumo
                          </p>
                          <div className="mt-3 space-y-2">
                            <div className="flex items-center justify-between text-sm text-[color:var(--color-text-main)]">
                              <span>Items cargados</span>
                              <span className="font-semibold">{items.length}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm text-[color:var(--color-text-main)]">
                              <span>Total registrado</span>
                              <span className="font-semibold text-[color:var(--color-primary-main)]">
                                {currency} {consumptionSum.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm text-[color:var(--color-text-main)]">
                              <span>Diferencia</span>
                              <span
                                className={`font-semibold ${
                                  Math.abs(amountDifference) <= 0.01
                                    ? 'text-[color:var(--color-accent-success)]'
                                    : 'text-[color:var(--color-accent-danger)]'
                                }`}
                              >
                                {currency} {amountDifference.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-3xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-card)] p-4 shadow-[var(--shadow-sm)] sm:p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-text-muted)]">
                        Configuracion activa
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Badge variant="outline">{showConsumption ? 'Consumo real' : 'Partes iguales'}</Badge>
                        {showParticipants ? <Badge variant="outline">Participantes personalizados</Badge> : null}
                        {includeTip ? <Badge variant="outline">Con propina</Badge> : null}
                        {birthdayEnabled && birthdayPersonId ? (
                          <Badge variant="outline">
                            Invitado: {resolvePersonName(birthdayPersonId, people)}
                          </Badge>
                        ) : null}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-dashed border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-muted)]/60 p-4 text-sm text-[color:var(--color-text-muted)]">
                      Cuando guardes, el gasto aparecera en la lista con el mismo comportamiento de siempre.
                    </div>
                  </div>
                </div>
              </>
            ) : null}

            {error ? (
              <div className="ds-alert ds-alert-danger text-sm font-medium">
                {error}
              </div>
            ) : null}
          </div>
        </div>

        <div className="border-t border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-card)]/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-[color:var(--color-text-muted)]">
              {currentStep === 'confirm'
                ? 'Ultima revision antes de guardar.'
                : showConsumption && currentStep === 'split'
                ? 'Si eliges consumo, el siguiente paso sera para los items.'
                : 'Avanza paso a paso para no perder detalle.'}
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={isFirstStep ? onClose : onBack}
                className="w-full sm:w-auto"
              >
                {isFirstStep ? 'Cancelar' : (
                  <>
                    <ArrowLeft className="h-4 w-4" />
                    Atras
                  </>
                )}
              </Button>
              {isFinalStep ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={onSubmit}
                  data-tour="invoice-save"
                  className="w-full sm:w-auto"
                >
                  {mode === 'edit' ? 'Guardar cambios' : 'Guardar gasto'}
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={onNext}
                  data-tour="invoice-step-next"
                  className="w-full sm:w-auto"
                >
                  Continuar
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
