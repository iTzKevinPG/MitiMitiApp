import { CheckCircle2, Clock, Handshake, Sparkles } from 'lucide-react'
import type { SettlementTransfer } from '../../domain/settlement/SettlementTransfer'
import type { PersonForUI } from '../../shared/state/fairsplitStore'
import { EmptyStateIllustration } from './EmptyStateIllustration'
import { SectionCard } from './SectionCard'

type TransferStatusMap = Record<string, { isSettled: boolean }>

interface TransfersSectionProps {
  transfers: SettlementTransfer[]
  people: PersonForUI[]
  currency: string
  tipTotal?: number
  transferStatusMap: TransferStatusMap
  onToggleStatus: (transfer: SettlementTransfer, isSettled: boolean) => void
}

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

export function TransfersSection({
  transfers,
  people,
  currency,
  tipTotal,
  transferStatusMap,
  onToggleStatus,
}: TransfersSectionProps) {
  const isSettledFn = (t: SettlementTransfer) =>
    Boolean(transferStatusMap[`${t.fromPersonId}::${t.toPersonId}`]?.isSettled)

  const pending = transfers.filter((t) => !isSettledFn(t))
  const settled = transfers.filter((t) => isSettledFn(t))
  const tips = tipTotal ?? 0

  return (
    <SectionCard title="Pagos" description="Los pagos mínimos para que todos queden a mano.">
      {transfers.length === 0 ? (
        /* ── Empty state ── */
        <div className="rounded-[var(--radius-lg)] border border-dashed border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-card)] p-8 text-center">
          <EmptyStateIllustration variant="transfers" />
          <p className="text-sm font-semibold text-[color:var(--color-text-main)]">
            ¡Nadie debe nada!
          </p>
          <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">
            Todos están a mano. ¡Bien hecho! 💪
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* ── Hero resumen de pagos ── */}
          <div className="ds-card-glow overflow-hidden rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-card)]">
            <div className="px-5 pt-5 pb-4">
              <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.25em] text-[color:var(--color-text-muted)]">
                Estado de pagos
              </p>
              <p className="text-3xl font-bold tabular-nums text-[color:var(--color-primary-main)]">
                {settled.length}
                <span className="text-xl font-semibold text-[color:var(--color-text-muted)]">
                  /{transfers.length}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-[color:var(--color-text-muted)]">
                pagos completados
              </p>
              {tips > 0 && (
                <div className="mt-3">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--color-warning-bg)] px-2.5 py-0.5 text-[10px] font-semibold text-[color:var(--color-accent-warning)]">
                    <Sparkles className="h-3 w-3" />
                    Incluye propina: {fmtAmount(tips, currency)}
                  </span>
                </div>
              )}
            </div>

            {/* Barra de progreso */}
            <div className="border-t border-[color:var(--color-border-subtle)] px-5 py-3">
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold">
                <span className="text-[color:var(--color-accent-warning)]">
                  {pending.length} pendiente{pending.length !== 1 ? 's' : ''}
                </span>
                <span className="text-[color:var(--color-accent-success)]">
                  {settled.length} completado{settled.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[color:var(--color-surface-muted)]">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${(settled.length / transfers.length) * 100}%`,
                    background:
                      pending.length === 0
                        ? 'var(--color-accent-success)'
                        : 'linear-gradient(90deg, var(--color-primary-light), var(--color-accent-success))',
                  }}
                />
              </div>
            </div>
          </div>

          {/* ── Pendientes ── */}
          {pending.length > 0 && (
            <div className="space-y-2">
              <p className="px-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-accent-warning)]">
                Pendientes
              </p>
              <div className="space-y-2">
                {pending.map((t, i) => (
                  <TransferRow
                    key={`${t.fromPersonId}-${t.toPersonId}-${i}`}
                    transfer={t}
                    people={people}
                    currency={currency}
                    isSettled={false}
                    index={i}
                    onToggle={() => onToggleStatus(t, true)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Completadas ── */}
          {settled.length > 0 && (
            <div className="space-y-2">
              <p className="px-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-accent-success)]">
                Completadas
              </p>
              <div className="space-y-2">
                {settled.map((t, i) => (
                  <TransferRow
                    key={`${t.fromPersonId}-${t.toPersonId}-${i}`}
                    transfer={t}
                    people={people}
                    currency={currency}
                    isSettled
                    index={i}
                    onToggle={() => onToggleStatus(t, false)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Todo saldado ── */}
          {pending.length === 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-[color:var(--color-accent-success)]/30 bg-[color:var(--color-success-bg)] px-4 py-3">
              <Handshake className="h-5 w-5 shrink-0 text-[color:var(--color-accent-success)]" />
              <div>
                <p className="text-sm font-bold text-[color:var(--color-accent-success)]">
                  ¡Todo saldado!
                </p>
                <p className="text-[11px] text-[color:var(--color-text-muted)]">
                  Todos los pagos han sido completados. 🎉
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  )
}

/* ── Transfer Row ── */
function TransferRow({
  transfer,
  people,
  currency,
  isSettled,
  index,
  onToggle,
}: {
  transfer: SettlementTransfer
  people: PersonForUI[]
  currency: string
  isSettled: boolean
  index: number
  onToggle: () => void
}) {
  const fromName = resolvePersonName(transfer.fromPersonId, people)
  const toName = resolvePersonName(transfer.toPersonId, people)

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`animate-stagger-fade-in group flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-all hover:shadow-[var(--shadow-sm)] active:scale-[0.99] ${
        isSettled
          ? 'border-[color:var(--color-accent-success)]/20 bg-[color:var(--color-success-bg)] opacity-70'
          : 'border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-muted)] hover:border-[color:var(--color-accent-warning)]/40'
      }`}
      style={{ animationDelay: `${index * 60}ms` }}
      aria-label={`${isSettled ? 'Desmarcar' : 'Marcar como pagado'}: ${fromName} paga a ${toName}`}
    >
      {/* State icon */}
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${
          isSettled
            ? 'bg-[color:var(--color-accent-success)]/20'
            : 'bg-[color:var(--color-accent-warning)]/20 group-hover:bg-[color:var(--color-accent-success)]/20'
        }`}
      >
        {isSettled ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-[color:var(--color-accent-success)]" />
        ) : (
          <Clock className="h-3.5 w-3.5 text-[color:var(--color-accent-warning)] group-hover:text-[color:var(--color-accent-success)] transition-colors" />
        )}
      </div>

      {/* Text */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p
          className={`text-sm font-semibold leading-snug ${
            isSettled ? 'text-[color:var(--color-text-muted)] line-through' : 'text-[color:var(--color-text-main)]'
          }`}
        >
          <span className="font-bold">{fromName}</span>
          <span className="mx-1.5 font-normal text-[color:var(--color-text-muted)]">paga a</span>
          <span className="font-bold text-[color:var(--color-primary-main)]">{toName}</span>
        </p>
        <span className="text-[10px] font-bold tabular-nums text-[color:var(--color-primary-main)]">
          {fmtAmount(transfer.amount, currency)}
        </span>
      </div>

      {/* Badge */}
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide transition-colors ${
          isSettled
            ? 'bg-[color:var(--color-accent-success)]/20 text-[color:var(--color-accent-success)]'
            : 'bg-[color:var(--color-accent-warning)]/20 text-[color:var(--color-accent-warning)] group-hover:bg-[color:var(--color-accent-success)]/20 group-hover:text-[color:var(--color-accent-success)]'
        }`}
      >
        {isSettled ? 'Pagado' : 'Pendiente'}
      </span>
    </button>
  )
}
