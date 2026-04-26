import { Plus } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Button } from '../../shared/components/ui/button'
import { Input } from '../../shared/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../shared/components/ui/select'
import type { EventForUI } from '../../shared/state/appStore'

interface EventSelectorProps {
  events: EventForUI[]
  selectedEventId?: string
  onSelect: (id: string) => void
  onCreate: (name: string, currency: string) => Promise<void>
  showSelector?: boolean
}

const currencyOptions = ['COP', 'USD', 'EUR']

export function EventSelector({
  events,
  selectedEventId,
  onSelect,
  onCreate,
  showSelector = true,
}: EventSelectorProps) {
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('COP')
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    const trimmedName = name.trim()
    const trimmedCurrency = currency.trim()

    if (!trimmedName) {
      setError('Escribe un nombre para tu evento.')
      return
    }
    if (!trimmedCurrency) {
      setError('Selecciona una moneda para continuar.')
      return
    }

    setError(null)
    await onCreate(trimmedName, trimmedCurrency)
    setName('')
  }

  return (
    <div className="space-y-4">
      {showSelector ? (
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-[color:var(--color-text-main)]">
            Evento en curso
          </label>
          <Select
            value={selectedEventId}
            onValueChange={onSelect}
            disabled={events.length === 0}
          >
            <SelectTrigger className="min-w-[220px]">
              <SelectValue
                placeholder={
                  events.length === 0
                    ? 'Crea tu primer evento'
                    : 'Selecciona un evento'
                }
              />
            </SelectTrigger>
            <SelectContent data-tour-select-content>
              {events.length === 0 ? (
                <SelectItem value="__empty" disabled>
                  Crea tu primer evento
                </SelectItem>
              ) : (
                events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name} ({event.currency})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <form
        onSubmit={handleCreate}
        className="grid gap-4 rounded-xl border border-dashed border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-muted)]/70 p-4"
      >
        <div className="grid gap-3 sm:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
          <label className="grid gap-1 text-sm font-medium text-[color:var(--color-text-main)]">
            Nombre del evento
            <Input
              placeholder="Ej. Viaje a la playa"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-[color:var(--color-text-main)]">
            Moneda
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent data-tour-select-content>
                {currencyOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>
        <div className="flex justify-end">
          <Button type="submit">
            <Plus className="h-4 w-4" />
            Crear evento
          </Button>
        </div>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  )
}
