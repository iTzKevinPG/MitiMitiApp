import { ArrowLeft, Cloud, LogIn, Menu, Settings, User, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../../shared/components/ui/button'
import { useAuthStore } from '../../shared/state/authStore'
import { ThemeToggle } from './ThemeToggle'

type SessionMenuProps = {
  isOpen: boolean
  onClose: () => void
  onOpenProfile: () => void
  backLink?: { href: string; label: string }
}

function useSessionStatus() {
  const { token, email } = useAuthStore()
  const isAuthenticated = Boolean(token)
  const statusLabel = isAuthenticated ? 'En la nube ☁️' : 'Modo invitado'
  const statusMessage = isAuthenticated
    ? `Guardando para ${email || 'tu cuenta'}.`
    : 'Los datos se guardan solo en esta sesión.'
  const statusBorder = isAuthenticated
    ? 'border-[color:var(--color-accent-success)]'
    : 'border-[color:var(--color-accent-warning)]'
  const statusBg = isAuthenticated
    ? 'bg-[color:var(--color-success-bg)]'
    : 'bg-[color:var(--color-warning-bg)]'
  const menuIconClass = isAuthenticated
    ? 'text-[color:var(--color-accent-success)]'
    : 'text-[color:var(--color-accent-warning)]'
  const statusIcon = isAuthenticated ? (
    <Cloud className="h-4 w-4 text-[color:var(--color-accent-success)]" />
  ) : (
    <User className="h-4 w-4 text-[color:var(--color-accent-warning)]" />
  )

  return {
    isAuthenticated,
    statusLabel,
    statusMessage,
    statusBorder,
    statusBg,
    menuIconClass,
    statusIcon,
  }
}

export function SessionStatusPill() {
  const { isAuthenticated, statusBorder, statusBg, statusIcon } = useSessionStatus()
  return (
    <div
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold text-[color:var(--color-text-main)] ${statusBorder} ${statusBg}`}
      data-tour="session-status"
    >
      {statusIcon}
      <span className="hidden sm:inline">{isAuthenticated ? 'Nube' : 'Invitado'}</span>
    </div>
  )
}

export function SessionMenuButton({ onClick }: { onClick: () => void }) {
  const { menuIconClass } = useSessionStatus()
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={`rounded-full ${menuIconClass} hover:bg-[color:var(--color-surface-muted)]`}
      onClick={onClick}
      aria-label="Abrir menú"
      data-tour="menu-button"
    >
      <Menu className="h-5 w-5" />
    </Button>
  )
}

export function SessionMenu({ isOpen, onClose, onOpenProfile, backLink }: SessionMenuProps) {
  const { isAuthenticated, statusLabel, statusMessage, statusBorder, statusBg, statusIcon } =
    useSessionStatus()

  return (
    <div
      className={`fixed inset-0 z-50 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`
          absolute right-0 top-0 flex h-full w-[88%] max-w-sm flex-col
          border-l border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-card)]
          shadow-lg transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        role="dialog"
        aria-modal="true"
        aria-label="Menú"
      >
        {/* Menu header */}
        <div className="flex items-center justify-between border-b border-[color:var(--color-border-subtle)] px-5 py-4">
          <p className="text-base font-semibold text-[color:var(--color-text-main)]">
            Menú
          </p>
          <Button
            type="button"
            onClick={onClose}
            variant="ghost"
            size="icon-sm"
            className="rounded-full text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text-main)]"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-5">
          {/* Status card */}
          <div className={`rounded-2xl border ${statusBorder} ${statusBg} p-4`}>
            <div className="flex items-center gap-2.5">
              <div className={`flex h-9 w-9 items-center justify-center rounded-full ${statusBg} border ${statusBorder}`}>
                {statusIcon}
              </div>
              <div>
                <p className="text-sm font-semibold text-[color:var(--color-text-main)]">
                  {statusLabel}
                </p>
                <p className="text-[11px] text-[color:var(--color-text-muted)]">
                  {statusMessage}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">
              Opciones
            </p>
            <button
              type="button"
              onClick={onOpenProfile}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[color:var(--color-text-main)] transition-colors hover:bg-[color:var(--color-surface-muted)]"
            >
              {isAuthenticated ? (
                <Settings className="h-4 w-4 text-[color:var(--color-text-muted)]" />
              ) : (
                <LogIn className="h-4 w-4 text-[color:var(--color-text-muted)]" />
              )}
              {isAuthenticated ? 'Mi cuenta' : 'Iniciar sesión'}
            </button>

            {backLink ? (
              <Link
                to={backLink.href}
                onClick={onClose}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[color:var(--color-text-main)] transition-colors hover:bg-[color:var(--color-surface-muted)]"
              >
                <ArrowLeft className="h-4 w-4 text-[color:var(--color-text-muted)]" />
                {backLink.label}
              </Link>
            ) : null}
          </div>

          {/* Theme */}
          <div className="space-y-2">
            <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">
              Apariencia
            </p>
            <div className="rounded-xl bg-[color:var(--color-surface-muted)] p-3">
              <ThemeToggle showLabelOnMobile />
            </div>
          </div>
        </div>

        {/* Menu footer */}
        <div className="border-t border-[color:var(--color-border-subtle)] px-5 py-3">
          <p className="text-center text-[10px] text-[color:var(--color-text-muted)]">
            MitiMiti · Divide gastos sin dramas ✌️
          </p>
        </div>
      </div>
    </div>
  )
}
