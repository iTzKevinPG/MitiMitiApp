import { useState } from 'react'
import { Users, Receipt, ArrowRightLeft, Sparkles, X } from 'lucide-react'
import { Button } from '../../shared/components/ui/button'

const STORAGE_KEY = 'mitimiti_welcome_seen'

const features = [
  {
    Icon: Users,
    title: 'Arma tu grupo',
    description: 'Agrega a tus amigos para empezar a dividir gastos.',
    accent: 'text-[color:var(--color-primary-main)]',
    bg: 'bg-[color:var(--color-primary-soft)]',
  },
  {
    Icon: Receipt,
    title: 'Registra gastos',
    description: 'Anota quien pago y cuanto de forma manual, clara y rapida.',
    accent: 'text-[color:var(--color-accent-coral)]',
    bg: 'bg-[color:var(--color-accent-coral-soft)]',
  },
  {
    Icon: ArrowRightLeft,
    title: 'Salda cuentas',
    description: 'MitiMiti calcula quien le debe a quien automaticamente.',
    accent: 'text-[color:var(--color-accent-lila)]',
    bg: 'bg-[color:var(--color-accent-lila-soft)]',
  },
]

export function WelcomeModal() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false
    return !window.localStorage.getItem(STORAGE_KEY)
  })

  const handleClose = () => {
    window.localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  const handleStartGuide = () => {
    handleClose()
    window.dispatchEvent(new CustomEvent('tour:open'))
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-sm">
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-card)] shadow-lg animate-fade-in"
        role="dialog"
        aria-modal="true"
        aria-label="Bienvenida"
      >
        <Button
          type="button"
          onClick={handleClose}
          variant="ghost"
          size="icon-sm"
          className="absolute right-3 top-3 z-10 rounded-full text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text-main)]"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="flex flex-col items-center bg-gradient-to-b from-[color:var(--color-primary-soft)] to-transparent px-6 pb-4 pt-8">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--color-primary-main)] shadow-[var(--shadow-md)]">
            <Sparkles
              className="h-7 w-7 text-[color:var(--color-text-on-primary)]"
              strokeWidth={1.5}
            />
          </div>
          <h2 className="text-xl font-bold text-[color:var(--color-text-main)]">
            Bienvenido a MitiMiti
          </h2>
          <p className="mt-1 text-center text-sm text-[color:var(--color-text-muted)]">
            Divide gastos con amigos de forma justa y sin dramas.
          </p>
        </div>

        <div className="space-y-3 px-6 pb-2">
          {features.map(({ Icon, title, description, accent, bg }) => (
            <div key={title} className="flex items-start gap-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${bg}`}
              >
                <Icon className={`h-4 w-4 ${accent}`} strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-sm font-semibold text-[color:var(--color-text-main)]">
                  {title}
                </p>
                <p className="text-xs text-[color:var(--color-text-muted)]">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 px-6 pb-6 pt-4">
          <Button type="button" onClick={handleStartGuide} className="w-full">
            <Sparkles className="h-4 w-4" />
            Iniciar guia rapida
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            className="w-full text-sm"
          >
            Explorar por mi cuenta
          </Button>
        </div>
      </div>
    </div>
  )
}
