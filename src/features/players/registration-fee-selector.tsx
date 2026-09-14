import { useFeeTypes, type FeeType } from "@/features/finance/finance-api"
import { EmptyState } from "@/design-system/empty-state"
import { LoadingState } from "@/design-system/loading-state"
import { ErrorState } from "@/design-system/error-state"
import { formatCurrency } from "@/lib/currency"

// The Registration fee is composed of items set up academy-wide on the
// Billing page (e.g. Jersey, Admin Fee, Kit) — this lets staff pick which of
// those actually apply to one specific player (a returning player might skip
// the jersey) instead of always charging the fee's full total.
export function useRegistrationFeeType() {
  const { data: feeTypes, isLoading, isError, refetch } = useFeeTypes()
  const registrationFeeType = feeTypes?.find((ft) => ft.isRegistrationFee)
  return { registrationFeeType, isLoading, isError, refetch }
}

export function RegistrationFeeItemsSelector({
  feeType,
  selectedIds,
  onChange,
}: {
  feeType: FeeType
  selectedIds: string[]
  onChange: (ids: string[]) => void
}) {
  const total = feeType.items
    .filter((link) => selectedIds.includes(link.feeItemId))
    .reduce((sum, link) => sum + Number(link.amount), 0)

  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id])
  }

  if (feeType.items.length === 0) {
    return (
      <EmptyState
        title="No items on the registration fee"
        description="Ask an administrator to attach at least one item to it on the Billing page."
      />
    )
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {feeType.items.map((link) => (
          <li
            key={link.feeItemId}
            className="flex items-center justify-between rounded-lg border border-border p-3"
          >
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedIds.includes(link.feeItemId)}
                onChange={() => toggle(link.feeItemId)}
              />
              {link.feeItem.name}
            </label>
            <span className="text-sm font-medium tabular-nums">{formatCurrency(Number(link.amount))}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm font-semibold">
        <span>Total</span>
        <span className="tabular-nums">{formatCurrency(total)}</span>
      </div>
    </div>
  )
}

export function RegistrationFeeLoadState({
  isLoading,
  isError,
  onRetry,
  hasFeeType,
}: {
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  hasFeeType: boolean
}) {
  if (isLoading) return <LoadingState rows={2} />
  if (isError) return <ErrorState onRetry={onRetry} />
  if (!hasFeeType) {
    return (
      <EmptyState
        title="No active registration fee is configured"
        description="Ask an administrator to set one up on the Billing page."
      />
    )
  }
  return null
}
