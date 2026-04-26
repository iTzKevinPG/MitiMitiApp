import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Edit2,
  Receipt,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { ActionMenu } from '../../../shared/components/ActionMenu'
import type { InvoiceItem } from '../../../domain/invoice/Invoice'
import type { InvoiceForUI, PersonForUI } from '../../../shared/state/fairsplitStore'
import { EmptyStateIllustration } from '../EmptyStateIllustration'

interface Share {
  personId: string
  amount: number
  tipPortion?: number
  isBirthday?: boolean
  name: string
}

interface InvoiceListProps {
  invoices: InvoiceForUI[]
  currency: string
  people: PersonForUI[]
  onEdit: (invoice: InvoiceForUI) => void
  onRemove: (invoiceId: string) => void
  calculateShares: (invoice: InvoiceForUI) => Share[]
}

/* ── helpers ── */
function resolvePersonName(id: string, people: PersonForUI[]) {
  return people.find((p) => p.id === id)?.name ?? 'Desconocido'
}

function roundToCents(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function fmtAmount(value: number, currency: string) {
  return `${currency} ${roundToCents(Math.abs(value)).toLocaleString('es-CO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function getItemTotal(item: InvoiceItem) {
  return roundToCents(item.unitPrice * item.quantity)
}

/* ── Main list ── */
export function InvoiceList({
  invoices,
  currency,
  people,
  onEdit,
  onRemove,
  calculateShares,
}: InvoiceListProps) {
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceForUI | null>(null)

  if (invoices.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-dashed border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-card)] p-8 text-center">
        <EmptyStateIllustration variant="invoices" />
        <p className="text-sm font-semibold text-[color:var(--color-text-main)]">
          Sin gastos todavía
        </p>
        <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">
          Toca "Agregar gasto" para registrar el primero. 🧾
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="relative z-0 space-y-3">
        {invoices.map((invoice, index) => {
          const grandTotal = roundToCents(invoice.amount + (invoice.tipAmount ?? 0))
          return (
            <div
              key={invoice.id}
              className="animate-stagger-fade-in group rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-card)] transition-all duration-200 hover:border-[color:var(--color-primary-light)] hover:shadow-[var(--shadow-md)]"
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <div className="p-3 sm:p-4">
                {/* Top row */}
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--color-accent-coral-soft)] sm:h-10 sm:w-10">
                    <Receipt className="h-4 w-4 text-[color:var(--color-accent-coral)] sm:h-5 sm:w-5" />
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="truncate text-sm font-semibold text-[color:var(--color-text-main)]">
                      {invoice.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-[color:var(--color-text-muted)]">
                      <span>Pagó {resolvePersonName(invoice.payerId, people)} 💳</span>
                      <span className="hidden sm:inline">·</span>
                      <span className="hidden sm:inline">
                        {invoice.participantIds.length} persona{invoice.participantIds.length !== 1 ? 's' : ''}
                      </span>
                      <span className="hidden sm:inline">·</span>
                      <span className="hidden text-[10px] uppercase tracking-wide sm:inline">
                        {invoice.divisionMethod === 'consumption' ? 'Por consumo' : 'Partes iguales'}
                      </span>
                    </div>
                  </div>

                  <ActionMenu
                    items={[
                      {
                        label: 'Editar',
                        icon: <Edit2 className="h-4 w-4" />,
                        onClick: () => onEdit(invoice),
                      },
                      {
                        label: 'Eliminar',
                        icon: <Trash2 className="h-4 w-4" />,
                        tone: 'danger',
                        onClick: () => onRemove(invoice.id),
                      },
                    ]}
                  />
                </div>

                {/* Bottom row: badges + amount + detalle CTA */}
                <div className="mt-2 flex items-center justify-between gap-2 pl-12 sm:pl-[52px]">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-[color:var(--color-surface-muted)] px-2 py-0.5 text-[10px] font-medium text-[color:var(--color-text-muted)]">
                      {invoice.participantIds.length} persona{invoice.participantIds.length !== 1 ? 's' : ''}
                    </span>
                    <span className="rounded-full bg-[color:var(--color-surface-muted)] px-2 py-0.5 text-[10px] font-medium text-[color:var(--color-text-muted)] sm:hidden">
                      {invoice.divisionMethod === 'consumption' ? 'Por consumo' : 'Iguales'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[color:var(--color-primary-main)]">
                      {currency} {grandTotal.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedInvoice(invoice)}
                      className="flex items-center gap-1 rounded-lg bg-[color:var(--color-primary-main)]/10 px-2 py-0.5 text-[10px] font-bold text-[color:var(--color-primary-light)] transition-all hover:bg-[color:var(--color-primary-main)] hover:text-white active:scale-95"
                    >
                      Detalle
                      <ArrowRight className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {selectedInvoice &&
        createPortal(
          <InvoiceDetailModal
            invoice={selectedInvoice}
            people={people}
            currency={currency}
            shares={calculateShares(selectedInvoice)}
            onClose={() => setSelectedInvoice(null)}
          />,
          document.body,
        )}
    </>
  )
}

/* ── Invoice Detail Modal ── */
function InvoiceDetailModal({
  invoice,
  people,
  currency,
  shares,
  onClose,
}: {
  invoice: InvoiceForUI
  people: PersonForUI[]
  currency: string
  shares: Share[]
  onClose: () => void
}) {
  const modalRef = useRef<HTMLDivElement>(null)
  const total = roundToCents(invoice.amount + (invoice.tipAmount ?? 0))

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    modalRef.current?.focus()
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={invoice.description}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="animate-fade-in w-full max-w-md overflow-hidden rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-card)] shadow-2xl outline-none"
        style={{ maxHeight: '90dvh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div className="relative border-b border-[color:var(--color-border-subtle)] bg-gradient-to-br from-[color:var(--color-accent-coral-soft)] to-[color:var(--color-surface-card)] px-5 pt-5 pb-4">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--color-surface-muted)] text-[color:var(--color-text-muted)] transition-colors hover:bg-[color:var(--color-border-subtle)] hover:text-[color:var(--color-text-main)]"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-3 pr-8">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color:var(--color-accent-coral)]/30 bg-[color:var(--color-accent-coral-soft)]">
              <Receipt className="h-5 w-5 text-[color:var(--color-accent-coral)]" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight text-[color:var(--color-text-main)]">
                {invoice.description}
              </h2>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-[color:var(--color-primary-main)]">
                {fmtAmount(total, currency)}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-muted)] px-2.5 py-0.5 text-[10px] font-semibold text-[color:var(--color-text-muted)]">
                  Subtotal: {fmtAmount(invoice.amount, currency)}
                </span>
                {invoice.tipAmount ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--color-warning-bg)] px-2.5 py-0.5 text-[10px] font-semibold text-[color:var(--color-accent-warning)]">
                    <Sparkles className="h-3 w-3" />
                    Propina: {fmtAmount(invoice.tipAmount, currency)}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-4 p-5">
          {/* Payer */}
          <div>
            <SectionLabel>Quién pagó</SectionLabel>
            <div className="flex items-center gap-2 rounded-xl bg-[color:var(--color-primary-soft)] px-3 py-2.5">
              <CreditCard className="h-4 w-4 text-[color:var(--color-primary-main)]" />
              <span className="text-sm font-bold text-[color:var(--color-primary-main)]">
                {resolvePersonName(invoice.payerId, people)}
              </span>
            </div>
          </div>

          {/* Birthday */}
          {invoice.birthdayPersonId && (
            <div>
              <SectionLabel>Invitado especial</SectionLabel>
              <div className="flex items-center gap-2 rounded-xl bg-[color:var(--color-accent-lila-soft)] px-3 py-2.5">
                <span className="text-base">🎂</span>
                <span className="text-sm font-bold text-[color:var(--color-accent-lila)]">
                  {resolvePersonName(invoice.birthdayPersonId, people)}
                </span>
                <span className="text-xs text-[color:var(--color-text-muted)]">— no paga su parte</span>
              </div>
            </div>
          )}

          {/* Participants */}
          <div>
            <SectionLabel>Participantes ({invoice.participantIds.length})</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {invoice.participantIds.map((id) => (
                <span
                  key={id}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    id === invoice.payerId
                      ? 'bg-[color:var(--color-primary-main)] text-white'
                      : 'border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-muted)] text-[color:var(--color-text-main)]'
                  }`}
                >
                  {resolvePersonName(id, people)}
                  {id === invoice.payerId ? ' 💳' : ''}
                </span>
              ))}
            </div>
          </div>

          {/* Items (consumption) */}
          {invoice.divisionMethod === 'consumption' && invoice.items?.length ? (
            <div>
              <SectionLabel>Items</SectionLabel>
              <div className="space-y-1.5">
                {invoice.items.map((item) => {
                  const participants = item.participantIds
                    .map((id) => resolvePersonName(id, people))
                    .join(', ')
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 rounded-xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-muted)] px-3 py-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[color:var(--color-text-main)] truncate">
                          {item.name}
                        </p>
                        {participants && (
                          <p className="text-[10px] text-[color:var(--color-text-muted)]">
                            {participants}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[10px] text-[color:var(--color-text-muted)]">
                          {item.quantity}× {fmtAmount(item.unitPrice, currency)}
                        </p>
                        <p className="text-xs font-bold text-[color:var(--color-primary-main)] tabular-nums">
                          {fmtAmount(getItemTotal(item), currency)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}

          {/* Per-person breakdown */}
          {shares.length > 0 && (
            <div>
              <SectionLabel>Cuánto pone cada uno</SectionLabel>
              <div className="space-y-1.5">
                {shares.map((share) => {
                  const isPayer = share.personId === invoice.payerId
                  const paid = isPayer ? total : 0
                  const net = roundToCents(paid - share.amount)
                  const isPos = net > 0.01
                  const isNeg = net < -0.01
                  return (
                    <div
                      key={share.personId}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${
                        share.isBirthday
                          ? 'border-[color:var(--color-primary-light)]/40 bg-[color:var(--color-primary-soft)]'
                          : 'border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-muted)]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-surface-card)] text-[11px] font-bold text-[color:var(--color-primary-main)]">
                          {share.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[color:var(--color-text-main)] truncate">
                            {share.name}
                            {share.isBirthday ? ' 🎂' : ''}
                            {isPayer ? ' 💳' : ''}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-[color:var(--color-text-muted)]">
                            <span>Pagó {fmtAmount(paid, currency)}</span>
                            {share.tipPortion ? (
                              <>
                                <span>·</span>
                                <span className="text-[color:var(--color-accent-warning)]">
                                  +{fmtAmount(share.tipPortion, currency)} propina
                                </span>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold tabular-nums text-[color:var(--color-primary-main)]">
                          {fmtAmount(share.amount, currency)}
                        </p>
                        {Math.abs(net) > 0.01 && (
                          <p className={`text-[10px] font-semibold tabular-nums ${isPos ? 'text-[color:var(--color-accent-success)]' : isNeg ? 'text-[color:var(--color-accent-danger)]' : ''}`}>
                            {net > 0 ? '+' : ''}{fmtAmount(net, currency)}
                          </p>
                        )}
                        {share.isBirthday && (
                          <p className="text-[10px] font-semibold text-[color:var(--color-primary-main)]">
                            <CheckCircle2 className="inline h-3 w-3" /> Invitado
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">
      {children}
    </p>
  )
}
