import { useLoadingStore } from "@/shared/state/loadingStore"

export function LoadingOverlay() {
  const isLoading = useLoadingStore((state) => state.pendingCount > 0)

  if (!isLoading) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--color-tour-mask)] px-6">
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-card)] px-6 py-5 shadow-lg">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[color:var(--color-primary-main)] border-t-transparent" />
        <p className="text-sm font-semibold text-[color:var(--color-text-main)]">
          MitiMiti
        </p>
      </div>
    </div>
  )
}
