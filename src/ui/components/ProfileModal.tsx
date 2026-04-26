import { Shield, Sparkles, X } from 'lucide-react'
import { Button } from '../../shared/components/ui/button'
import { AuthCard } from './AuthCard'


type ProfileModalProps = {
  isOpen: boolean
  onClose: () => void
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-sm">
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-card)] shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-label="Perfil"
      >
        <Button
          type="button"
          onClick={onClose}
          variant="ghost"
          size="icon-sm"
          className="absolute right-4 top-4 z-10 rounded-full text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text-main)]"
          aria-label="Cerrar perfil"
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Hero section */}
        <div className="relative flex flex-col items-center bg-gradient-to-b from-[color:var(--color-primary-soft)] to-transparent px-6 pb-2 pt-8">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--color-primary-main)] shadow-[var(--shadow-md)]">
            <Shield className="h-8 w-8 text-[color:var(--color-text-on-primary)]" strokeWidth={1.5} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[color:var(--color-primary-main)]">
            Perfil
          </p>
          <h2 className="mt-1 text-xl font-bold text-[color:var(--color-text-main)]">
            Tu cuenta de MitiMiti
          </h2>
          <p className="mt-1 text-center text-sm text-[color:var(--color-text-muted)]">
            Guarda tus datos en la nube y recupera tus eventos desde cualquier dispositivo.
          </p>
          <div className="mt-3 flex items-center gap-4 text-[10px] font-semibold text-[color:var(--color-text-muted)]">
            <span className="flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-[color:var(--color-accent-coral)]" />
              Sincronización
            </span>
            <span className="flex items-center gap-1">
              <Shield className="h-3 w-3 text-[color:var(--color-accent-success)]" />
              Seguro
            </span>
          </div>
        </div>

        {/* Auth card */}
        <div className="p-6 pt-4">
          <AuthCard />
        </div>
      </div>
    </div>
  )
}
