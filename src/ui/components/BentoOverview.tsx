import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Handshake,
  Receipt,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  X,
  CheckCircle2,
  Clock,
  SlidersHorizontal,
} from 'lucide-react'
import type { Balance } from '../../domain/settlement/Balance'
import type { SettlementTransfer } from '../../domain/settlement/SettlementTransfer'
import type { TransferStatus } from '../../domain/settlement/TransferStatus'
import type { InvoiceForUI, PersonForUI } from '../../shared/state/fairsplitStore'
import { AmountDisplay } from './AmountDisplay'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../shared/components/ui/select'

interface BentoOverviewProps {
  people: PersonForUI[]
  invoices: InvoiceForUI[]
  balances: Balance[]
  transfers: SettlementTransfer[]
  transferStatusMap: Record<string, TransferStatus>
  settledByPersonId: Record<string, boolean>
  currency: string
}

const emojis = ['😎', '🤙', '🔥', '✨', '🎉', '💪', '🌟', '🚀', '🎯', '💜']

function roundToCents(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function resolvePersonName(id: string, people: PersonForUI[]) {
  return people.find((p) => p.id === id)?.name ?? 'Desconocido'
}

function buildTransferKey(fromPersonId: string, toPersonId: string) {
  return `${fromPersonId}::${toPersonId}`
}

function fmtAmount(value: number, currency: string) {
  return `${currency} ${roundToCents(Math.abs(value)).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
export function BentoOverview({
  people,
  invoices,
  balances,
  transfers,
  transferStatusMap,
  settledByPersonId,
  currency,
}: BentoOverviewProps) {
  const totalAmount = invoices.reduce((acc, inv) => acc + inv.amount, 0)
  const totalTips = invoices.reduce((acc, inv) => acc + (inv.tipAmount ?? 0), 0)
  const grandTotal = roundToCents(totalAmount + totalTips)

  const totalTransfers = transfers.length
  const settledTransfers = transfers.reduce((acc, t) => {
    const key = buildTransferKey(t.fromPersonId, t.toPersonId)
    return acc + (transferStatusMap[key]?.isSettled ? 1 : 0)
  }, 0)
  const pendingTransfers = totalTransfers - settledTransfers
  const allSettled = totalTransfers > 0 && pendingTransfers === 0

  const orderedTransfers = [...transfers].sort((a, b) => {
    const aS = transferStatusMap[buildTransferKey(a.fromPersonId, a.toPersonId)]?.isSettled
    const bS = transferStatusMap[buildTransferKey(b.fromPersonId, b.toPersonId)]?.isSettled
    return Number(Boolean(aS)) - Number(Boolean(bS))
  })

  // ── Filter state ──
  const [selectedPersonId, setSelectedPersonId] = useState<string | 'all'>('all')
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceForUI | null>(null)

  const filteredInvoices =
    selectedPersonId === 'all'
      ? invoices
      : invoices.filter(
          (inv) =>
            inv.payerId === selectedPersonId ||
            inv.participantIds.includes(selectedPersonId),
        )

  const filteredBalances =
    selectedPersonId === 'all'
      ? balances
      : balances.filter((b) => b.personId === selectedPersonId)

  const filteredTransfers =
    selectedPersonId === 'all'
      ? orderedTransfers
      : orderedTransfers.filter(
          (t) =>
            t.fromPersonId === selectedPersonId ||
            t.toPersonId === selectedPersonId,
        )

  const selectedPersonName =
    selectedPersonId !== 'all'
      ? resolvePersonName(selectedPersonId, people)
      : null

  function goToTab(tabId: string) {
    window.dispatchEvent(new CustomEvent('tour:go-tab', { detail: { tabId } }))
  }

  return (
    <>
      <div className="bento-root space-y-4 pb-20 sm:pb-0">

        {/* ── Hero financiero ── */}
        <HeroCard
          grandTotal={grandTotal}
          totalAmount={totalAmount}
          totalTips={totalTips}
          invoicesCount={invoices.length}
          peopleCount={people.length}
          settledTransfers={settledTransfers}
          totalTransfers={totalTransfers}
          currency={currency}
          allSettled={allSettled}
        />

        {/* ── Filtro global ── */}
        {people.length > 0 && (
          <FilterBar
            people={people}
            selectedPersonId={selectedPersonId}
            onChange={setSelectedPersonId}
          />
        )}

        {/* ── Filtro activo banner ── */}
        {selectedPersonName && (
          <div className="flex items-center gap-2 rounded-xl border border-[color:var(--color-primary-main)]/30 bg-[color:var(--color-primary-main)]/8 px-3.5 py-2.5">
            <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-[color:var(--color-primary-light)]" />
            <span className="flex-1 text-xs font-medium text-[color:var(--color-primary-light)]">
              Viendo datos de <span className="font-bold">{selectedPersonName}</span>
            </span>
            <button
              type="button"
              onClick={() => setSelectedPersonId('all')}
              className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-[color:var(--color-primary-light)] hover:bg-[color:var(--color-primary-main)]/20 transition-colors"
            >
              Ver todos
            </button>
          </div>
        )}

        {/* ── Sección Participantes ── */}
        <CollapsibleSection
          title="Participantes"
          badge={people.length > 0 ? `${people.length}` : undefined}
          icon={<Users className="h-4 w-4 text-[color:var(--color-primary-light)]" />}
          accentColor="primary"
          defaultOpen
        >
          {people.length === 0 ? (
            <EmptyState
              icon={<Users className="h-8 w-8" />}
              title="Sin participantes"
              description="Agrega personas al evento para ver sus balances"
              ctaLabel="Agregar persona"
              onCta={() => goToTab('people')}
              color="primary"
            />
          ) : filteredBalances.length === 0 ? (
            <EmptyState
              icon={<Users className="h-8 w-8" />}
              title={`Sin datos para ${selectedPersonName}`}
              description="Este participante no tiene balance registrado aún"
              ctaLabel="Ver todos"
              onCta={() => setSelectedPersonId('all')}
              color="primary"
            />
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {people
                .filter((p) =>
                  filteredBalances.some((b) => b.personId === p.id),
                )
                .map((p, i) => {
                  const balance = filteredBalances.find((b) => b.personId === p.id)
                  const isSettled = settledByPersonId[p.id]
                  return (
                    <PersonCard
                      key={p.id}
                      person={p}
                      balance={balance}
                      isSettled={isSettled}
                      emoji={emojis[i % emojis.length]}
                      currency={currency}
                    />
                  )
                })}
            </div>
          )}
        </CollapsibleSection>

        {/* ── Sección Gastos ── */}
        <CollapsibleSection
          title="Gastos"
          badge={invoices.length > 0 ? `${filteredInvoices.length}` : undefined}
          icon={<Receipt className="h-4 w-4 text-[color:var(--color-accent-coral)]" />}
          extra={
            invoices.length > 0 ? (
              <span className="text-xs font-bold text-[color:var(--color-primary-main)]">
                {fmtAmount(grandTotal, currency)}
              </span>
            ) : undefined
          }
          accentColor="coral"
          defaultOpen={invoices.length > 0}
        >
          {invoices.length === 0 ? (
            <EmptyState
              icon={<Receipt className="h-8 w-8" />}
              title="Sin gastos aún"
              description="Agrega el primer gasto para ver el balance del evento"
              ctaLabel="Agregar gasto"
              onCta={() => goToTab('invoices')}
              color="coral"
            />
          ) : filteredInvoices.length === 0 ? (
            <EmptyState
              icon={<Receipt className="h-8 w-8" />}
              title={`Sin gastos para ${selectedPersonName}`}
              description="Este participante no aparece en ningún gasto"
              ctaLabel="Ver todos"
              onCta={() => setSelectedPersonId('all')}
              color="coral"
            />
          ) : (
            <div className="space-y-2">
              {totalTips > 0 && selectedPersonId === 'all' && (
                <div className="flex items-center gap-1.5 rounded-lg bg-[color:var(--color-warning-bg)] px-3 py-1.5 text-[11px] font-semibold text-[color:var(--color-accent-warning)]">
                  <Sparkles className="h-3 w-3" />
                  Propinas totales: {fmtAmount(totalTips, currency)}
                </div>
              )}
              {filteredInvoices.map((inv) => (
                <InvoiceCard
                  key={inv.id}
                  invoice={inv}
                  people={people}
                  currency={currency}
                  onViewDetail={() => setSelectedInvoice(inv)}
                />
              ))}
            </div>
          )}
        </CollapsibleSection>

        {/* ── Sección Pagos ── */}
        <CollapsibleSection
          title="Pagos"
          badge={
            pendingTransfers > 0
              ? `${pendingTransfers} pendiente${pendingTransfers !== 1 ? 's' : ''}`
              : transfers.length > 0
                ? '✓ Saldado'
                : undefined
          }
          badgeVariant={pendingTransfers > 0 ? 'warning' : 'success'}
          icon={<Handshake className="h-4 w-4 text-[color:var(--color-accent-success)]" />}
          accentColor="success"
          defaultOpen={pendingTransfers > 0}
        >
          {transfers.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="h-8 w-8" />}
              title="¡Todo en paz!"
              description="No hay transferencias necesarias entre participantes"
              color="success"
            />
          ) : filteredTransfers.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="h-8 w-8" />}
              title={`${selectedPersonName} no tiene pagos`}
              description="Este participante no está involucrado en ninguna transferencia"
              ctaLabel="Ver todos"
              onCta={() => setSelectedPersonId('all')}
              color="success"
            />
          ) : (
            <div className="space-y-2">
              {filteredTransfers.map((t, idx) => {
                const key = buildTransferKey(t.fromPersonId, t.toPersonId)
                const isSettled = Boolean(transferStatusMap[key]?.isSettled)
                return (
                  <TransferRow
                    key={`${key}-${idx}`}
                    transfer={t}
                    people={people}
                    currency={currency}
                    isSettled={isSettled}
                  />
                )
              })}
            </div>
          )}
        </CollapsibleSection>
      </div>



      {/* ── Modal detalle gasto ── */}
      {selectedInvoice &&
        createPortal(
          <InvoiceDetailModal
            invoice={selectedInvoice}
            people={people}
            currency={currency}
            onClose={() => setSelectedInvoice(null)}
          />,
          document.body,
        )}
    </>
  )
}

/* ─────────────────────────────────────────────
   Hero Card
───────────────────────────────────────────── */
function HeroCard({
  grandTotal,
  totalAmount,
  totalTips,
  invoicesCount,
  peopleCount,
  settledTransfers,
  totalTransfers,
  currency,
  allSettled,
}: {
  grandTotal: number
  totalAmount: number
  totalTips: number
  invoicesCount: number
  peopleCount: number
  settledTransfers: number
  totalTransfers: number
  currency: string
  allSettled: boolean
}) {
  const progressPct = totalTransfers > 0 ? (settledTransfers / totalTransfers) * 100 : 0

  return (
    <div className="ds-card-glow overflow-hidden rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-card)]">
      {/* Top section */}
      <div className="px-5 pt-5 pb-4">
        <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.25em] text-[color:var(--color-text-muted)]">
          Total del evento
        </p>
        {invoicesCount === 0 ? (
          <p className="text-3xl font-bold text-[color:var(--color-text-muted)] sm:text-4xl">
            —
          </p>
        ) : (
          <p className="text-3xl font-bold text-[color:var(--color-primary-main)] sm:text-4xl tabular-nums">
            {fmtAmount(grandTotal, currency)}
          </p>
        )}

        {invoicesCount > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Chip>
              Subtotal: {fmtAmount(totalAmount, currency)}
            </Chip>
            {totalTips > 0 && (
              <Chip variant="warning">
                <Sparkles className="h-3 w-3" /> Propinas: {fmtAmount(totalTips, currency)}
              </Chip>
            )}
            <Chip>
              {invoicesCount} gasto{invoicesCount !== 1 ? 's' : ''} · {peopleCount} persona{peopleCount !== 1 ? 's' : ''}
            </Chip>
          </div>
        )}
      </div>

      {/* Payment progress */}
      {totalTransfers > 0 && (
        <div className="border-t border-[color:var(--color-border-subtle)] px-5 py-3.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[color:var(--color-text-muted)]">
              {allSettled ? (
                <span className="text-[color:var(--color-accent-success)]">✓ Todo saldado</span>
              ) : (
                <>
                  <span className="text-[color:var(--color-accent-success)]">{settledTransfers}</span>
                  <span> / {totalTransfers} pagos completados</span>
                </>
              )}
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 overflow-hidden rounded-full bg-[color:var(--color-surface-muted)]">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${progressPct}%`,
                background: allSettled
                  ? 'var(--color-accent-success)'
                  : 'linear-gradient(90deg, var(--color-primary-light), var(--color-accent-success))',
              }}
            />
          </div>
        </div>
      )}

      {/* Empty state hero */}
      {invoicesCount === 0 && peopleCount === 0 && (
        <div className="border-t border-[color:var(--color-border-subtle)] px-5 py-4">
          <p className="text-xs text-[color:var(--color-text-muted)]">
            Agrega participantes y gastos para ver el resumen del evento.
          </p>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Filter Bar
───────────────────────────────────────────── */
function FilterBar({
  people,
  selectedPersonId,
  onChange,
}: {
  people: PersonForUI[]
  selectedPersonId: string
  onChange: (id: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-[color:var(--color-text-muted)]" />
      <span className="text-[11px] font-semibold text-[color:var(--color-text-muted)] shrink-0">Ver</span>
      <Select value={selectedPersonId} onValueChange={onChange}>
        <SelectTrigger className="h-8 flex-1 text-xs font-semibold">
          <SelectValue placeholder="Todos los participantes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los participantes</SelectItem>
          {people.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedPersonId !== 'all' && (
        <button
          type="button"
          onClick={() => onChange('all')}
          className="rounded-full p-1 text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text-main)] transition-colors shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Person Card
───────────────────────────────────────────── */
function PersonCard({
  person,
  balance,
  isSettled,
  emoji,
  currency,
}: {
  person: PersonForUI
  balance?: Balance
  isSettled: boolean
  emoji: string
  currency: string
}) {
  const net = balance?.net ?? 0
  const isCreditor = net > 0.01
  const isDebtor = net < -0.01
  const isNeutral = !isCreditor && !isDebtor

  return (
    <div
      className={`relative overflow-hidden rounded-xl border transition-colors ${
        isCreditor
          ? 'border-[color:var(--color-accent-success)]/30 bg-[color:var(--color-success-bg)]'
          : isDebtor
            ? 'border-[color:var(--color-accent-danger)]/20 bg-[color:var(--color-danger-bg)]'
            : 'border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-muted)]'
      }`}
    >
      <div className="flex items-start gap-3 p-3.5">
        {/* Avatar */}
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base ${
            isCreditor
              ? 'bg-[color:var(--color-accent-success)]/20'
              : isDebtor
                ? 'bg-[color:var(--color-accent-coral)]/20'
                : 'bg-[color:var(--color-surface-card)]'
          }`}
        >
          {emoji}
        </div>

        {/* Info */}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-bold text-[color:var(--color-text-main)]">
              {person.name}
            </span>
            {isSettled && (
              <span className="shrink-0 rounded-full bg-[color:var(--color-accent-success)]/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[color:var(--color-accent-success)]">
                ✓ Saldado
              </span>
            )}
          </div>

          {balance && (
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-[color:var(--color-text-muted)]">
              <span>Pagó {fmtAmount(balance.totalPaid, currency)}</span>
              <span>Consumió {fmtAmount(balance.totalOwed, currency)}</span>
            </div>
          )}
        </div>

        {/* Balance neto */}
        {balance && (
          <div className="flex shrink-0 flex-col items-end gap-0.5">
            <div className="flex items-center gap-1">
              {isCreditor ? (
                <TrendingUp className="h-3 w-3 text-[color:var(--color-accent-success)]" />
              ) : isDebtor ? (
                <TrendingDown className="h-3 w-3 text-[color:var(--color-accent-danger)]" />
              ) : null}
              <AmountDisplay amount={balance.net} currency={currency} showSign size="sm" />
            </div>
            <span
              className={`text-[9px] font-bold uppercase tracking-wider ${
                isCreditor
                  ? 'text-[color:var(--color-accent-success)]'
                  : isDebtor
                    ? 'text-[color:var(--color-accent-danger)]'
                    : 'text-[color:var(--color-text-muted)]'
              }`}
            >
              {isCreditor ? 'A recibir' : isDebtor ? 'A pagar' : 'En paz'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Invoice Card
───────────────────────────────────────────── */
function InvoiceCard({
  invoice,
  people,
  currency,
  onViewDetail,
}: {
  invoice: InvoiceForUI
  people: PersonForUI[]
  currency: string
  onViewDetail: () => void
}) {
  const total = roundToCents(invoice.amount + (invoice.tipAmount ?? 0))

  return (
    <div className="group flex items-center gap-3 rounded-xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-card)] px-3.5 py-3 transition-all hover:border-[color:var(--color-primary-light)] hover:shadow-[var(--shadow-md)]">
      {/* Icon */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--color-accent-coral-soft)]">
        <Receipt className="h-4 w-4 text-[color:var(--color-accent-coral)]" />
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-bold text-[color:var(--color-text-main)]">
          {invoice.description}
        </span>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-[color:var(--color-text-muted)]">
          <span className="flex items-center gap-1">
            <CreditCard className="h-2.5 w-2.5" />
            {resolvePersonName(invoice.payerId, people)}
          </span>
          <span>·</span>
          <span>
            {invoice.participantIds.length} persona{invoice.participantIds.length !== 1 ? 's' : ''}
          </span>
          <span>·</span>
          <span>{invoice.divisionMethod === 'consumption' ? 'Por consumo' : 'Partes iguales'}</span>
          {invoice.tipAmount ? (
            <>
              <span>·</span>
              <span className="text-[color:var(--color-accent-warning)]">
                +{fmtAmount(invoice.tipAmount, currency)} propina
              </span>
            </>
          ) : null}
        </div>
      </div>

      {/* Amount + CTA */}
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="text-sm font-bold text-[color:var(--color-primary-main)] tabular-nums">
          {fmtAmount(total, currency)}
        </span>
        <button
          type="button"
          onClick={onViewDetail}
          className="flex items-center gap-1 rounded-lg bg-[color:var(--color-primary-main)]/10 px-2 py-0.5 text-[10px] font-bold text-[color:var(--color-primary-light)] transition-all hover:bg-[color:var(--color-primary-main)] hover:text-white active:scale-95"
        >
          Detalle
          <ArrowRight className="h-2.5 w-2.5" />
        </button>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Transfer Row
───────────────────────────────────────────── */
function TransferRow({
  transfer,
  people,
  currency,
  isSettled,
}: {
  transfer: SettlementTransfer
  people: PersonForUI[]
  currency: string
  isSettled: boolean
}) {
  const fromName = resolvePersonName(transfer.fromPersonId, people)
  const toName = resolvePersonName(transfer.toPersonId, people)

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors ${
        isSettled
          ? 'border-[color:var(--color-accent-success)]/20 bg-[color:var(--color-success-bg)] opacity-60'
          : 'border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-card)]'
      }`}
    >
      {/* State icon */}
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isSettled
            ? 'bg-[color:var(--color-accent-success)]/20'
            : 'bg-[color:var(--color-accent-warning)]/20'
        }`}
      >
        {isSettled ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-[color:var(--color-accent-success)]" />
        ) : (
          <Clock className="h-3.5 w-3.5 text-[color:var(--color-accent-warning)]" />
        )}
      </div>

      {/* Text */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p
          className={`text-sm font-semibold leading-snug ${
            isSettled
              ? 'text-[color:var(--color-text-muted)] line-through'
              : 'text-[color:var(--color-text-main)]'
          }`}
        >
          <span className="font-bold">{fromName}</span>
          <span className="mx-1.5 text-[color:var(--color-text-muted)]">paga a</span>
          <span className="font-bold text-[color:var(--color-primary-main)]">{toName}</span>
        </p>
        <span className="text-[10px] font-semibold text-[color:var(--color-primary-main)] tabular-nums">
          {fmtAmount(transfer.amount, currency)}
        </span>
      </div>

      {/* Status badge */}
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
          isSettled
            ? 'bg-[color:var(--color-accent-success)]/20 text-[color:var(--color-accent-success)]'
            : 'bg-[color:var(--color-accent-warning)]/20 text-[color:var(--color-accent-warning)]'
        }`}
      >
        {isSettled ? 'Pagado' : 'Pendiente'}
      </span>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Invoice Detail Modal
───────────────────────────────────────────── */
function InvoiceDetailModal({
  invoice,
  people,
  currency,
  onClose,
}: {
  invoice: InvoiceForUI
  people: PersonForUI[]
  currency: string
  onClose: () => void
}) {
  const modalRef = useRef<HTMLDivElement>(null)
  const total = roundToCents(invoice.amount + (invoice.tipAmount ?? 0))

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Focus trap (simple: focus modal on mount)
  useEffect(() => {
    modalRef.current?.focus()
  }, [])

  // Per-person summary — mirrors SettlementService logic exactly
  const tip = roundToCents(invoice.tipAmount ?? 0)
  const tipReceivers = invoice.birthdayPersonId
    ? invoice.participantIds.filter((id) => id !== invoice.birthdayPersonId)
    : invoice.participantIds
  const tipShare = tipReceivers.length > 0 ? roundToCents(tip / tipReceivers.length) : 0

  const perPersonSummary = invoice.participantIds.map((personId) => {
    let base = 0

    if (invoice.divisionMethod === 'consumption') {
      base = roundToCents(Number((invoice.consumptions ?? {})[personId] ?? 0))
    } else {
      const count = invoice.participantIds.length
      const equalShare = count > 0 ? roundToCents(invoice.amount / count) : 0
      if (invoice.birthdayPersonId === personId) {
        base = 0
      } else if (invoice.birthdayPersonId) {
        const nonBirthday = invoice.participantIds.filter((id) => id !== invoice.birthdayPersonId)
        base = nonBirthday.length > 0 ? roundToCents(invoice.amount / nonBirthday.length) : equalShare
      } else {
        base = equalShare
      }
    }

    const personTip = tipReceivers.includes(personId) ? tipShare : 0
    const consumed = roundToCents(base + personTip)
    const paid = personId === invoice.payerId ? total : 0
    return { personId, paid, consumed, net: roundToCents(paid - consumed) }
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={invoice.description}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="animate-fade-in w-full max-w-md overflow-hidden rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-card)] outline-none shadow-2xl"
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
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--color-accent-coral-soft)] border border-[color:var(--color-accent-coral)]/30">
              <Receipt className="h-5 w-5 text-[color:var(--color-accent-coral)]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[color:var(--color-text-main)] leading-tight">
                {invoice.description}
              </h2>
              <p className="mt-0.5 text-2xl font-bold text-[color:var(--color-primary-main)] tabular-nums">
                {fmtAmount(total, currency)}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <Chip variant="muted">
                  Subtotal: {fmtAmount(invoice.amount, currency)}
                </Chip>
                {invoice.tipAmount ? (
                  <Chip variant="warning">
                    <Sparkles className="h-2.5 w-2.5" /> Propina: {fmtAmount(invoice.tipAmount, currency)}
                  </Chip>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-4 p-5">
          {/* Payer */}
          <div>
            <SectionLabel>Quien pagó</SectionLabel>
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

          {/* Items */}
          {invoice.divisionMethod === 'consumption' && invoice.items?.length ? (
            <div>
              <SectionLabel>Items</SectionLabel>
              <div className="space-y-1.5">
                {invoice.items.map((item) => {
                  const consumers =
                    (item as unknown as { consumers?: string[] }).consumers ?? []
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 rounded-xl bg-[color:var(--color-surface-muted)] px-3 py-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[color:var(--color-text-main)] truncate">
                          {item.name}
                        </p>
                        {consumers.length > 0 && (
                          <p className="text-[10px] text-[color:var(--color-text-muted)]">
                            {consumers
                              .map((cId) => resolvePersonName(cId, people))
                              .join(', ')}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[10px] text-[color:var(--color-text-muted)]">
                          {item.quantity}× {fmtAmount(item.unitPrice, currency)}
                        </p>
                        <p className="text-xs font-bold text-[color:var(--color-primary-main)] tabular-nums">
                          {fmtAmount(item.unitPrice * item.quantity, currency)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}

          {/* Per-person summary */}
          <div>
            <SectionLabel>Resumen por persona</SectionLabel>
            <div className="space-y-1.5">
              {perPersonSummary.map(({ personId, paid, consumed, net }) => {
                const isPos = net > 0.01
                const isNeg = net < -0.01
                return (
                  <div
                    key={personId}
                    className="flex items-center justify-between rounded-xl bg-[color:var(--color-surface-muted)] px-3 py-2"
                  >
                    <div>
                      <p className="text-xs font-bold text-[color:var(--color-text-main)]">
                        {resolvePersonName(personId, people)}
                      </p>
                      <p className="text-[10px] text-[color:var(--color-text-muted)]">
                        Pagó {fmtAmount(paid, currency)} · Consume {fmtAmount(consumed, currency)}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-bold tabular-nums ${
                        isPos
                          ? 'text-[color:var(--color-accent-success)]'
                          : isNeg
                            ? 'text-[color:var(--color-accent-danger)]'
                            : 'text-[color:var(--color-text-muted)]'
                      }`}
                    >
                      {net > 0 ? '+' : ''}{fmtAmount(net, currency)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Collapsible Section
───────────────────────────────────────────── */
const accentMap = {
  primary: {
    header: 'hover:bg-[color:var(--color-primary-soft)]/40',
    border: 'border-[color:var(--color-border-subtle)]',
  },
  coral: {
    header: 'hover:bg-[color:var(--color-accent-coral-soft)]/40',
    border: 'border-[color:var(--color-border-subtle)]',
  },
  lila: {
    header: 'hover:bg-[color:var(--color-accent-lila-soft)]/40',
    border: 'border-[color:var(--color-border-subtle)]',
  },
  success: {
    header: 'hover:bg-[color:var(--color-success-bg)]/40',
    border: 'border-[color:var(--color-border-subtle)]',
  },
}

function CollapsibleSection({
  title,
  badge,
  badgeVariant = 'default',
  icon,
  extra,
  accentColor = 'primary',
  defaultOpen = false,
  children,
}: {
  title: string
  badge?: string
  badgeVariant?: 'default' | 'warning' | 'success'
  icon: React.ReactNode
  extra?: React.ReactNode
  accentColor?: keyof typeof accentMap
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  const ac = accentMap[accentColor]

  const badgeClass =
    badgeVariant === 'warning'
      ? 'bg-[color:var(--color-accent-warning)]/15 text-[color:var(--color-accent-warning)]'
      : badgeVariant === 'success'
        ? 'bg-[color:var(--color-accent-success)]/15 text-[color:var(--color-accent-success)]'
        : 'bg-[color:var(--color-surface-muted)] text-[color:var(--color-text-muted)]'

  return (
    <div
      className={`overflow-hidden rounded-2xl border ${ac.border} bg-[color:var(--color-surface-card)] transition-shadow hover:shadow-[var(--shadow-sm)]`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center gap-2.5 px-4 py-3.5 text-left transition-colors ${ac.header}`}
      >
        {icon}
        <span className="flex-1 text-sm font-bold text-[color:var(--color-text-main)]">{title}</span>
        {extra}
        {badge && (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badgeClass}`}>
            {badge}
          </span>
        )}
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-[color:var(--color-text-muted)]" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-[color:var(--color-text-muted)]" />
        )}
      </button>
      {open && (
        <div className="animate-fade-in border-t border-[color:var(--color-border-subtle)] px-4 py-3.5">
          {children}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Empty State
───────────────────────────────────────────── */
const emptyColorMap = {
  primary: {
    iconBg: 'bg-[color:var(--color-primary-soft)]',
    iconColor: 'text-[color:var(--color-primary-main)]',
    btn: 'bg-[color:var(--color-primary-main)] text-white hover:bg-[color:var(--color-primary-dark)]',
  },
  coral: {
    iconBg: 'bg-[color:var(--color-accent-coral-soft)]',
    iconColor: 'text-[color:var(--color-accent-coral)]',
    btn: 'bg-[color:var(--color-accent-coral)] text-white hover:opacity-90',
  },
  success: {
    iconBg: 'bg-[color:var(--color-success-bg)]',
    iconColor: 'text-[color:var(--color-accent-success)]',
    btn: 'bg-[color:var(--color-accent-success)] text-white hover:opacity-90',
  },
}

function EmptyState({
  icon,
  title,
  description,
  ctaLabel,
  onCta,
  color = 'primary',
}: {
  icon: React.ReactNode
  title: string
  description: string
  ctaLabel?: string
  onCta?: () => void
  color?: keyof typeof emptyColorMap
}) {
  const c = emptyColorMap[color]
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${c.iconBg} ${c.iconColor}`}>
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-bold text-[color:var(--color-text-main)]">{title}</p>
        <p className="max-w-[240px] text-[11px] text-[color:var(--color-text-muted)]">{description}</p>
      </div>
      {ctaLabel && onCta && (
        <button
          type="button"
          onClick={onCta}
          className={`rounded-xl px-4 py-2 text-xs font-bold transition-all active:scale-95 ${c.btn}`}
        >
          {ctaLabel}
        </button>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Micro components
───────────────────────────────────────────── */
function Chip({
  children,
  variant = 'default',
}: {
  children: React.ReactNode
  variant?: 'default' | 'warning' | 'muted'
}) {
  const cls =
    variant === 'warning'
      ? 'bg-[color:var(--color-warning-bg)] text-[color:var(--color-accent-warning)]'
      : variant === 'muted'
        ? 'bg-[color:var(--color-surface-muted)] text-[color:var(--color-text-muted)] border border-[color:var(--color-border-subtle)]'
        : 'bg-[color:var(--color-surface-muted)] text-[color:var(--color-text-muted)] border border-[color:var(--color-border-subtle)]'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${cls}`}>
      {children}
    </span>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">
      {children}
    </p>
  )
}
