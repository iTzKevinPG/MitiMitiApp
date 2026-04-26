import { BarChart3, Sparkles, TrendingDown, TrendingUp } from 'lucide-react'
import type { Balance } from '../../domain/settlement/Balance'
import type { InvoiceForUI, PersonForUI } from '../../shared/state/appStore'
import { AmountDisplay } from './AmountDisplay'
import { EmptyStateIllustration } from './EmptyStateIllustration'
import { SectionCard } from './SectionCard'

interface SummarySectionProps {
  balances: Balance[]
  people: PersonForUI[]
  invoices: InvoiceForUI[]
  currency: string
  tipTotal?: number
}

const emojis = ['😎', '🤙', '🔥', '✨', '🎉', '💪', '🌟', '🚀', '🎯', '💜']

function roundToCents(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function fmtAmount(value: number, currency: string) {
  return `${currency} ${roundToCents(Math.abs(value)).toLocaleString('es-CO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function SummarySection({
  balances,
  people,
  invoices,
  currency,
  tipTotal,
}: SummarySectionProps) {
  const normalize = (value: number) => (Math.abs(value) < 0.01 ? 0 : value)
  const peopleById = new Map(people.map((p) => [p.id, p]))

  const normalizedBalances = balances.map((b) => ({
    ...b,
    net: normalize(b.net),
    person: peopleById.get(b.personId),
    name: peopleById.get(b.personId)?.name ?? 'Desconocido',
  }))

  const receivers = normalizedBalances.filter((b) => b.net > 0).sort((a, b) => b.net - a.net)
  const payers = normalizedBalances.filter((b) => b.net < 0).sort((a, b) => a.net - b.net)
  const settled = normalizedBalances.filter((b) => b.net === 0)

  const subtotal = invoices.reduce((acc, inv) => acc + inv.amount, 0)
  const tips = tipTotal ?? 0
  const grandTotal = roundToCents(subtotal + tips)

  const emojiFor = (personId: string) => {
    const idx = people.findIndex((p) => p.id === personId)
    return emojis[(idx < 0 ? 0 : idx) % emojis.length]
  }

  return (
    <SectionCard title="Balance" description="Quién puso de más y quién se quedó corto.">
      {balances.length === 0 ? (
        /* ── Empty state ── */
        <div className="rounded-[var(--radius-lg)] border border-dashed border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-card)] p-8 text-center">
          <EmptyStateIllustration variant="summary" />
          <p className="text-sm font-semibold text-[color:var(--color-text-main)]">
            Nada que mostrar todavía
          </p>
          <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">
            Agrega un gasto y acá verás quién debe y quién cobra. ✨
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* ── Hero resumen financiero ── */}
          <div className="ds-card-glow overflow-hidden rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-card)]">
            <div className="px-5 pt-5 pb-4">
              <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.25em] text-[color:var(--color-text-muted)]">
                Total del evento
              </p>
              <p className="text-3xl font-bold text-[color:var(--color-primary-main)] tabular-nums">
                {fmtAmount(grandTotal, currency)}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-muted)] px-2.5 py-0.5 text-[10px] font-semibold text-[color:var(--color-text-muted)]">
                  Subtotal: {fmtAmount(subtotal, currency)}
                </span>
                {tips > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--color-warning-bg)] px-2.5 py-0.5 text-[10px] font-semibold text-[color:var(--color-accent-warning)]">
                    <Sparkles className="h-3 w-3" />
                    Propinas: {fmtAmount(tips, currency)}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-muted)] px-2.5 py-0.5 text-[10px] font-semibold text-[color:var(--color-text-muted)]">
                  <BarChart3 className="h-3 w-3" />
                  {balances.length} participante{balances.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Barra visual de balance */}
            {(receivers.length > 0 || payers.length > 0) && (
              <div className="border-t border-[color:var(--color-border-subtle)] px-5 py-3">
                <div className="flex items-center justify-between text-[11px] font-semibold">
                  <span className="text-[color:var(--color-accent-success)]">
                    {receivers.length} a recibir
                  </span>
                  {settled.length > 0 && (
                    <span className="text-[color:var(--color-text-muted)]">
                      {settled.length} en paz
                    </span>
                  )}
                  <span className="text-[color:var(--color-accent-danger)]">
                    {payers.length} a pagar
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ── Grid de personas ── */}
          {receivers.length > 0 && (
            <div className="space-y-2">
              <p className="px-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-accent-success)]">
                A recibir
              </p>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {receivers.map((b, i) => (
                  <BalanceCard
                    key={b.personId}
                    name={b.name}
                    emoji={emojiFor(b.personId)}
                    totalPaid={b.totalPaid}
                    totalOwed={b.totalOwed}
                    net={b.net}
                    currency={currency}
                    index={i}
                  />
                ))}
              </div>
            </div>
          )}

          {payers.length > 0 && (
            <div className="space-y-2">
              <p className="px-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-accent-danger)]">
                A pagar
              </p>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {payers.map((b, i) => (
                  <BalanceCard
                    key={b.personId}
                    name={b.name}
                    emoji={emojiFor(b.personId)}
                    totalPaid={b.totalPaid}
                    totalOwed={b.totalOwed}
                    net={b.net}
                    currency={currency}
                    index={i}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── En paz ── */}
          {settled.length > 0 && (
            <div className="space-y-2">
              <p className="px-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">
                En paz
              </p>
              <div className="flex flex-wrap gap-2">
                {settled.map((b) => (
                  <span
                    key={b.personId}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-muted)] px-3 py-1.5 text-xs font-semibold text-[color:var(--color-text-muted)]"
                  >
                    {emojiFor(b.personId)} {b.name} ✓
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  )
}

/* ── Balance Card ── */
function BalanceCard({
  name,
  emoji,
  totalPaid,
  totalOwed,
  net,
  currency,
  index,
}: {
  name: string
  emoji: string
  totalPaid: number
  totalOwed: number
  net: number
  currency: string
  index: number
}) {
  const isCreditor = net > 0.01
  const isDebtor = net < -0.01

  return (
    <div
      className={`animate-stagger-fade-in relative overflow-hidden rounded-xl border transition-colors ${
        isCreditor
          ? 'border-[color:var(--color-accent-success)]/30 bg-[color:var(--color-success-bg)]'
          : isDebtor
            ? 'border-[color:var(--color-accent-danger)]/20 bg-[color:var(--color-danger-bg)]'
            : 'border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-muted)]'
      }`}
      style={{ animationDelay: `${index * 50}ms` }}
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
          <span className="truncate text-sm font-bold text-[color:var(--color-text-main)]">
            {name}
          </span>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-[color:var(--color-text-muted)]">
            <span>Pagó {fmtAmount(totalPaid, currency)}</span>
            <span>Consumió {fmtAmount(totalOwed, currency)}</span>
          </div>
        </div>

        {/* Net */}
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <div className="flex items-center gap-1">
            {isCreditor ? (
              <TrendingUp className="h-3 w-3 text-[color:var(--color-accent-success)]" />
            ) : isDebtor ? (
              <TrendingDown className="h-3 w-3 text-[color:var(--color-accent-danger)]" />
            ) : null}
            <AmountDisplay amount={net} currency={currency} showSign size="sm" />
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
      </div>
    </div>
  )
}
