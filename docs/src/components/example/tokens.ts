import type { TokenizedSearchTokenDefinition } from '@requence/tokenized-search'

export const tokens: TokenizedSearchTokenDefinition[] = [
  {
    key: 'status',
    label: 'Status',
    exclusive: true,
    options: [
      { value: 'active', label: 'Active' },
      { value: 'pending', label: 'Pending' },
      { value: 'inactive', label: 'Inactive' },
    ],
  },
  {
    key: 'priority',
    label: 'Priority',
    negatable: true,
    options: [
      { value: 'critical', label: 'Critical' },
      { value: 'high', label: 'High' },
      { value: 'medium', label: 'Medium' },
      { value: 'low', label: 'Low' },
    ],
  },
  {
    key: 'assignee',
    label: 'Assignee',
    options: [
      { value: 'alice', label: 'Alice' },
      { value: 'bob', label: 'Bob' },
      { value: 'carol', label: 'Carol' },
    ],
  },
  {
    key: 'name',
    label: 'Name',
    negatable: true,
  },
]
