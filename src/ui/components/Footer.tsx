import fairLogo from '../../assets/fair-logo.png'
import { APP_NAME, APP_TAGLINE } from '../../shared/constants/branding'

export function Footer() {
  return (
    <footer className="mt-auto border-t border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-card)]/60 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-6 pb-20 pt-5 sm:flex-row sm:pb-5">
        <div className="flex items-center gap-2.5">
          <img src={fairLogo} alt={APP_NAME} className="h-6 w-6 object-contain opacity-60" />
          <span className="text-xs font-semibold text-[color:var(--color-text-muted)]">
            {APP_NAME}
          </span>
          <span className="hidden text-[color:var(--color-border-subtle)] sm:inline">·</span>
          <span className="hidden text-xs text-[color:var(--color-text-muted)] sm:inline">
            {APP_TAGLINE} ✌️
          </span>
        </div>
        <p className="text-[11px] text-[color:var(--color-text-muted)]">
          © 2026{' '}
          <a
            href="https://itzkevindev.tech"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-[color:var(--color-primary-main)] transition-colors hover:text-[color:var(--color-primary-light)]"
          >
            itzkevindev.tech
          </a>
        </p>
      </div>
    </footer>
  )
}
