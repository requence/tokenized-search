import type { ReactNode } from 'react'

// ── Slot Props ────────────────────────────────────────────────────────

export interface SlotProps {
  className?: string
  children?: ReactNode
}

// ── Slot Components ───────────────────────────────────────────────────
// These are config-only components — they render nothing.
// The root TokenizedSearch reads their props via collectSlots().

export function Input({ children: _children, className: _className }: SlotProps) {
  return null
}
Input.displayName = 'TokenizedSearch.Input'

export function Placeholder({
  children: _children,
  className: _className,
}: SlotProps) {
  return null
}
Placeholder.displayName = 'TokenizedSearch.Placeholder'

export function TokenKey({ className: _className }: SlotProps) {
  return null
}
TokenKey.displayName = 'TokenizedSearch.TokenKey'

export function TokenValue({ className: _className }: SlotProps) {
  return null
}
TokenValue.displayName = 'TokenizedSearch.TokenValue'

export function TokenNegation({ className: _className }: SlotProps) {
  return null
}
TokenNegation.displayName = 'TokenizedSearch.TokenNegation'

export function ClearButton({
  children: _children,
  className: _className,
}: SlotProps) {
  return null
}
ClearButton.displayName = 'TokenizedSearch.ClearButton'

export function SubmitButton({
  children: _children,
  className: _className,
}: SlotProps) {
  return null
}
SubmitButton.displayName = 'TokenizedSearch.SubmitButton'

export function Dropdown({ children: _children, className: _className }: SlotProps) {
  return null
}
Dropdown.displayName = 'TokenizedSearch.Dropdown'

export function DropdownOption({ className: _className }: SlotProps) {
  return null
}
DropdownOption.displayName = 'TokenizedSearch.DropdownOption'

export function DropdownNotOption({ className: _className }: SlotProps) {
  return null
}
DropdownNotOption.displayName = 'TokenizedSearch.DropdownNotOption'

export function DropdownSeparator({ className: _className }: SlotProps) {
  return null
}
DropdownSeparator.displayName = 'TokenizedSearch.DropdownSeparator'

export function HighlightMatch({ className: _className }: SlotProps) {
  return null
}
HighlightMatch.displayName = 'TokenizedSearch.HighlightMatch'

export function FilterByLabel({
  children: _children,
  className: _className,
}: SlotProps) {
  return null
}
FilterByLabel.displayName = 'TokenizedSearch.FilterByLabel'

export function SuggestionIcon({ className: _className }: SlotProps) {
  return null
}
SuggestionIcon.displayName = 'TokenizedSearch.SuggestionIcon'

export function EmptyMessage({
  children: _children,
  className: _className,
}: SlotProps) {
  return null
}
EmptyMessage.displayName = 'TokenizedSearch.EmptyMessage'

export function Loader({ children: _children, className: _className }: SlotProps) {
  return null
}
Loader.displayName = 'TokenizedSearch.Loader'

// ── Exports ───────────────────────────────────────────────────────────

export const slots = {
  Input,
  Placeholder,
  TokenKey,
  TokenValue,
  TokenNegation,
  ClearButton,
  SubmitButton,
  Dropdown,
  DropdownOption,
  DropdownNotOption,
  DropdownSeparator,
  HighlightMatch,
  FilterByLabel,
  SuggestionIcon,
  EmptyMessage,
  Loader,
} as const
