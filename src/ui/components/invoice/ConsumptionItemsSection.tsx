import { ChevronDown, ChevronUp, Edit2, Plus, Trash2 } from 'lucide-react'
import { ActionMenu } from '../../../shared/components/ActionMenu'
import { Button } from '../../../shared/components/ui/button'
import type { InvoiceItem } from '../../../domain/invoice/Invoice'
import type { PersonForUI } from '../../../shared/state/appStore'

interface ConsumptionItemsSectionProps {
  currency: string
  people: PersonForUI[]
  items: InvoiceItem[]
  expandedItems: Record<string, boolean>
  effectiveParticipantIds: string[]
  consumptionSum: number
  onToggleExpanded: (itemId: string) => void
  onEditItem: (item: InvoiceItem) => void
  onRemoveItem: (itemId: string) => void
  onAddItem: () => void
  resolvePersonName: (id: string, people: PersonForUI[]) => string
  getItemTotal: (item: InvoiceItem) => number
  buildItemShares: (item: InvoiceItem) => Array<{ personId: string; amount: number }>
}

export function ConsumptionItemsSection({
  currency,
  people,
  items,
  expandedItems,
  effectiveParticipantIds,
  consumptionSum,
  onToggleExpanded,
  onEditItem,
  onRemoveItem,
  onAddItem,
  resolvePersonName,
  getItemTotal,
  buildItemShares,
}: ConsumptionItemsSectionProps) {
  return (
    <div className="md:col-span-4 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-[color:var(--color-text-main)]">
          Items del consumo
        </p>
        <p className="text-[11px] font-semibold text-[color:var(--color-text-muted)] sm:text-right">
          Total registrado:{' '}
          <span className="text-[color:var(--color-primary-main)]">
            {currency} {consumptionSum.toFixed(2)}
          </span>
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-card)] p-4 text-sm text-[color:var(--color-text-muted)]">
          Aun no hay items. Usa &quot;Agregar item&quot; para empezar.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const isExpanded = Boolean(expandedItems[item.id])
            const itemTotal = getItemTotal(item)
            const shares = buildItemShares(item)
            const participants = item.participantIds
              .filter((id) => effectiveParticipantIds.includes(id))
              .map((id) => resolvePersonName(id, people))
              .join(', ')

            return (
              <div
                key={item.id}
                className="rounded-lg border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-card)]"
              >
                <div className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--color-text-main)]">
                      {item.name}
                    </p>
                    <p className="text-[11px] text-[color:var(--color-text-muted)]">
                      Cantidad: {item.quantity} - Unitario: {currency}{' '}
                      {item.unitPrice.toFixed(2)}
                    </p>
                    <p className="text-[11px] text-[color:var(--color-text-muted)]">
                      Participantes: {participants.length > 0 ? participants : 'Sin participantes'}
                    </p>
                  </div>
                  <div className="ml-auto flex items-center gap-2 text-xs justify-end">
                    <span className="ds-badge-soft">
                      {currency} {itemTotal.toFixed(2)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-[color:var(--color-primary-main)] hover:text-[color:var(--color-primary-dark)]"
                      onClick={() => onToggleExpanded(item.id)}
                    >
                      {isExpanded ? 'Ocultar' : 'Detalle'}
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  <ActionMenu
                    align="right"
                    items={[
                      {
                        label: 'Editar',
                        icon: <Edit2 className="h-4 w-4" />,
                        onClick: () => onEditItem(item),
                        },
                        {
                          label: 'Eliminar',
                          icon: <Trash2 className="h-4 w-4" />,
                          tone: 'danger',
                          onClick: () => onRemoveItem(item.id),
                        },
                      ]}
                    />
                  </div>
                </div>

                {isExpanded ? (
                  <div className="animate-fade-in border-t border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-muted)] p-4 text-sm text-[color:var(--color-text-main)]">
                    {shares.length === 0 ? (
                      <p className="text-sm text-[color:var(--color-text-muted)]">
                        Sin participantes asignados.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {shares.map((share) => (
                          <div
                            key={`${item.id}-${share.personId}`}
                            className="flex items-center justify-between rounded-md border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-card)] px-3 py-2"
                          >
                            <span className="font-semibold text-[color:var(--color-text-main)]">
                              {resolvePersonName(share.personId, people)}
                            </span>
                            <span className="font-semibold text-[color:var(--color-primary-main)]">
                              {currency} {share.amount.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={onAddItem}
        className="w-full justify-between border-dashed text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text-main)]"
      >
        <span>Agregar item</span>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  )
}
