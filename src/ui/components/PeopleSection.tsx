import { UserPlus } from 'lucide-react'
import { EmptyStateIllustration } from './EmptyStateIllustration'
import { type FormEvent, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { ActionMenu } from '../../shared/components/ActionMenu'
import { Button } from '../../shared/components/ui/button'
import { Input } from '../../shared/components/ui/input'
import { SectionCard } from './SectionCard'
import type { PersonForUI } from '../../shared/state/appStore'
import { toast } from '../../shared/components/ui/sonner'

interface PeopleSectionProps {
  people: PersonForUI[]
  onAdd: (name: string) => Promise<void>
  onRemove: (personId: string) => Promise<void>
  onEdit: (personId: string, name: string) => Promise<void>
}

const avatarColors = [
  { bg: 'bg-[color:var(--color-primary-soft)]', text: 'text-[color:var(--color-primary-dark)]' },
  { bg: 'bg-[color:var(--color-accent-coral-soft)]', text: 'text-[color:var(--color-accent-coral)]' },
  { bg: 'bg-[color:var(--color-accent-lila-soft)]', text: 'text-[color:var(--color-accent-lila)]' },
  { bg: 'bg-[color:var(--color-success-bg)]', text: 'text-[color:var(--color-accent-success)]' },
  { bg: 'bg-[color:var(--color-info-bg)]', text: 'text-[color:var(--color-accent-info)]' },
  { bg: 'bg-[color:var(--color-warning-bg)]', text: 'text-[color:var(--color-accent-warning)]' },
]

const emojis = ['😎', '🤙', '🔥', '✨', '🎉', '💪', '🌟', '🚀', '🎯', '💜']

function getAvatarColor(index: number) {
  return avatarColors[index % avatarColors.length]
}

function getEmoji(index: number) {
  return emojis[index % emojis.length]
}

export function PeopleSection({
  people,
  onAdd,
  onRemove,
  onEdit,
}: PeopleSectionProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) {
      setError('Escribe un nombre para continuar.')
      return
    }

    setError(null)
    await onAdd(name.trim())
    setName('')
  }

  const startEditing = (person: PersonForUI) => {
    setEditingId(person.id)
    setEditingName(person.name)
    setError(null)
  }

  const handleEditSave = async () => {
    if (!editingId) return
    if (!editingName.trim()) {
      setError('Escribe un nombre para continuar.')
      return
    }
    setError(null)
    await onEdit(editingId, editingName.trim())
    setEditingId(null)
    setEditingName('')
  }

  const handleRemove = async (personId: string) => {
    try {
      setError(null)
      await onRemove(personId)
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No puedes eliminar este participante.'
      toast.warning(message, {
        style: {
          borderColor: 'var(--color-accent-warning)',
          backgroundColor: 'var(--color-warning-bg)',
          color: '#ffffff',
        },
        duration: 3500,
      })
    }
  }

  return (
    <SectionCard
      title="El grupo"
      description="¿Quiénes van? Agrega a todos para repartir los gastos."
      badge={people.length > 0 ? `${people.length}` : undefined}
    >
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-2 sm:flex-row sm:items-center sm:max-w-md"
        data-tour="people-add-form"
      >
        <Input
          placeholder="Nombre o alias"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="sm:flex-1"
        />
        <Button type="submit" size="sm" disabled={!name.trim()}>
          <UserPlus className="h-4 w-4" />
          Agregar
        </Button>
      </form>

      {error ? <p className="mt-2 text-sm text-[color:var(--color-accent-danger)]">{error}</p> : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {people.length === 0 ? (
          <div className="sm:col-span-2 md:col-span-3 rounded-[var(--radius-lg)] border border-dashed border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-card)] p-8 text-center">
            <EmptyStateIllustration variant="people" />
            <p className="text-sm font-semibold text-[color:var(--color-text-main)]">
              ¡Agrega a la banda!
            </p>
            <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">
              Escribe el nombre de cada persona para empezar a dividir.
            </p>
          </div>
        ) : (
          people.map((person, index) => {
            const color = getAvatarColor(index)
            const emoji = getEmoji(index)

            return (
              <div
                key={person.id}
                className="animate-stagger-fade-in group relative flex items-center gap-3 rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-card)] px-3 py-3 transition-all duration-200 hover:z-10 hover:border-[color:var(--color-primary-light)] hover:shadow-[var(--shadow-md)]"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {editingId === person.id ? (
                  <div
                    className="flex w-full flex-col gap-2"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        void handleEditSave()
                      }
                    }}
                  >
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      autoFocus
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" size="sm" onClick={handleEditSave}>
                        Guardar
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingId(null)
                          setEditingName('')
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${color.bg} text-lg transition-transform duration-200 group-hover:scale-110`}>
                      {emoji}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-semibold text-[color:var(--color-text-main)]">
                        {person.name}
                      </span>
                      <span className={`text-[10px] font-medium ${color.text}`}>
                        #{index + 1} del grupo
                      </span>
                    </div>
                    <div className="ml-auto opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                      <ActionMenu
                        items={[
                          {
                            label: 'Editar',
                            icon: <Pencil className="h-4 w-4" />,
                            onClick: () => startEditing(person),
                          },
                          {
                            label: 'Eliminar',
                            icon: <Trash2 className="h-4 w-4" />,
                            tone: 'danger',
                            onClick: () => handleRemove(person.id),
                          },
                        ]}
                      />
                    </div>
                  </>
                )}
              </div>
            )
          })
        )}
      </div>
    </SectionCard>
  )
}
