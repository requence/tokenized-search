import { Children, type ReactNode, isValidElement } from 'react'

// ── Resolved Slot Types ───────────────────────────────────────────────

export interface ResolvedInputSlot {
  className?: string
  placeholder?: ResolvedTextSlot
  tokenKey?: string
  tokenValue?: string
  tokenNegation?: string
  tokenOperator?: string
}

export interface ResolvedTextSlot {
  className?: string
  children?: ReactNode
}

export interface ResolvedDropdownSlot {
  className?: string
  option?: string
  notOption?: ResolvedTextSlot
  separator?: string
  highlightMatch?: string
  filterByLabel?: ResolvedTextSlot
  operationLabel?: ResolvedTextSlot
  suggestionIcon?: string
  emptyMessage?: ResolvedTextSlot
  loader?: ResolvedTextSlot
}

export interface ResolvedSlots {
  input: ResolvedInputSlot
  clearButton: ResolvedTextSlot
  submitButton: ResolvedTextSlot
  dropdown: ResolvedDropdownSlot
}

// ── Helpers ───────────────────────────────────────────────────────────

function getDisplayName(element: React.ReactElement): string | undefined {
  const type = element.type
  if (typeof type === 'function') {
    return (type as { displayName?: string }).displayName
  }
  return undefined
}

function extractProps(element: React.ReactElement): {
  className?: string
  children?: ReactNode
} {
  return element.props as { className?: string; children?: ReactNode }
}

// ── collectSlots ──────────────────────────────────────────────────────

export function collectSlots(children: ReactNode): ResolvedSlots {
  const result: ResolvedSlots = {
    input: {},
    clearButton: {},
    submitButton: {},
    dropdown: {},
  }

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) {return}
    const name = getDisplayName(child)
    const props = extractProps(child)

    switch (name) {
      case 'TokenizedSearch.Input': {
        result.input.className = props.className
        // Walk Input children for nested slots
        Children.forEach(props.children, (inputChild) => {
          if (!isValidElement(inputChild)) {return}
          const inputChildName = getDisplayName(inputChild)
          const inputChildProps = extractProps(inputChild)
          switch (inputChildName) {
            case 'TokenizedSearch.Placeholder':
              result.input.placeholder = {
                className: inputChildProps.className,
                children: inputChildProps.children,
              }
              break
            case 'TokenizedSearch.TokenKey':
              result.input.tokenKey = inputChildProps.className
              break
            case 'TokenizedSearch.TokenValue':
              result.input.tokenValue = inputChildProps.className
              break
            case 'TokenizedSearch.TokenNegation':
              result.input.tokenNegation = inputChildProps.className
              break
            case 'TokenizedSearch.TokenOperator':
              result.input.tokenOperator = inputChildProps.className
              break
          }
        })
        break
      }
      case 'TokenizedSearch.ClearButton':
        result.clearButton = {
          className: props.className,
          children: props.children,
        }
        break
      case 'TokenizedSearch.SubmitButton':
        result.submitButton = {
          className: props.className,
          children: props.children,
        }
        break
      case 'TokenizedSearch.Dropdown': {
        result.dropdown.className = props.className
        // Walk Dropdown children for nested slots
        Children.forEach(props.children, (ddChild) => {
          if (!isValidElement(ddChild)) {return}
          const ddChildName = getDisplayName(ddChild)
          const ddChildProps = extractProps(ddChild)
          switch (ddChildName) {
            case 'TokenizedSearch.DropdownOption':
              result.dropdown.option = ddChildProps.className
              break
            case 'TokenizedSearch.DropdownNotOption':
              result.dropdown.notOption = {
                className: ddChildProps.className,
                children: ddChildProps.children,
              }
              break
            case 'TokenizedSearch.DropdownSeparator':
              result.dropdown.separator = ddChildProps.className
              break
            case 'TokenizedSearch.HighlightMatch':
              result.dropdown.highlightMatch = ddChildProps.className
              break
            case 'TokenizedSearch.FilterByLabel':
              result.dropdown.filterByLabel = {
                className: ddChildProps.className,
                children: ddChildProps.children,
              }
              break
            case 'TokenizedSearch.OperationLabel':
              result.dropdown.operationLabel = {
                className: ddChildProps.className,
                children: ddChildProps.children,
              }
              break
            case 'TokenizedSearch.SuggestionIcon':
              result.dropdown.suggestionIcon = ddChildProps.className
              break
            case 'TokenizedSearch.EmptyMessage':
              result.dropdown.emptyMessage = {
                className: ddChildProps.className,
                children: ddChildProps.children,
              }
              break
            case 'TokenizedSearch.Loader':
              result.dropdown.loader = {
                className: ddChildProps.className,
                children: ddChildProps.children,
              }
              break
          }
        })
        break
      }
    }
  })

  return result
}
