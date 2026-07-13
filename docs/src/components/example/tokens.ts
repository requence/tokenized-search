import type {
  TokenOption,
  TokenizedSearchTokenDefinition,
} from '@requence/tokenized-search'

// ── Reference data (50 name / UUID pairs) ────────────────────────────

const references: { name: string; uuid: string }[] = [
  { name: 'Acme-Corp', uuid: 'b3f1a2c4-8d6e-4f9a-b1c3-d5e7f9a0b2c4' },
  { name: 'Globex', uuid: 'a1d2e3f4-5678-9abc-def0-1234567890ab' },
  { name: 'Initech', uuid: 'c4b3a2d1-e5f6-7890-abcd-ef1234567890' },
  { name: 'Umbrella', uuid: 'd5e6f7a8-b9c0-1234-5678-9abcdef01234' },
  { name: 'Hooli', uuid: 'e6f7a8b9-c0d1-2345-6789-abcdef012345' },
  { name: 'Soylent', uuid: 'f7a8b9c0-d1e2-3456-789a-bcdef0123456' },
  { name: 'Massive-Dyn', uuid: '08b9c0d1-e2f3-4567-89ab-cdef01234567' },
  { name: 'Wonka-Ind', uuid: '19c0d1e2-f3a4-5678-9abc-def012345678' },
  { name: 'Stark-Ind', uuid: '2ad1e2f3-a4b5-6789-abcd-ef0123456789' },
  { name: 'Wayne-Ent', uuid: '3be2f3a4-b5c6-789a-bcde-f01234567890' },
  { name: 'Oscorp', uuid: '4cf3a4b5-c6d7-89ab-cdef-012345678901' },
  { name: 'Cyberdyne', uuid: '5da4b5c6-d7e8-9abc-def0-123456789012' },
  { name: 'Tyrell', uuid: '6eb5c6d7-e8f9-abcd-ef01-234567890123' },
  { name: 'Weyland', uuid: '7fc6d7e8-f9a0-bcde-f012-345678901234' },
  { name: 'Aperture', uuid: '80d7e8f9-a0b1-cdef-0123-456789012345' },
  { name: 'Abstergo', uuid: '91e8f9a0-b1c2-def0-1234-567890123456' },
  { name: 'Vaultec', uuid: 'a2f9a0b1-c2d3-ef01-2345-678901234567' },
  { name: 'Capsule', uuid: 'b3a0b1c2-d3e4-f012-3456-789012345678' },
  { name: 'Delos-Inc', uuid: 'c4b1c2d3-e4f5-0123-4567-890123456789' },
  { name: 'Rekall', uuid: 'd5c2d3e4-f5a6-1234-5678-901234567890' },
  { name: 'Omni-Corp', uuid: 'e6d3e4f5-a6b7-2345-6789-012345678901' },
  { name: 'Gekko-Co', uuid: 'f7e4f5a6-b7c8-3456-789a-123456789012' },
  { name: 'Prestige', uuid: '08f5a6b7-c8d9-4567-89ab-234567890123' },
  { name: 'Nakatomi', uuid: '19a6b7c8-d9e0-5678-9abc-345678901234' },
  { name: 'Bluth-Co', uuid: '2ab7c8d9-e0f1-6789-abcd-456789012345' },
  { name: 'Dunder-Miff', uuid: '3bc8d9e0-f1a2-789a-bcde-567890123456' },
  { name: 'Pied-Piper', uuid: '4cd9e0f1-a2b3-89ab-cdef-678901234567' },
  { name: 'Veridian', uuid: '5de0f1a2-b3c4-9abc-def0-789012345678' },
  { name: 'Genco', uuid: '6ef1a2b3-c4d5-abcd-ef01-890123456789' },
  { name: 'Oceanic', uuid: '7fa2b3c4-d5e6-bcde-f012-901234567890' },
  { name: 'Primatech', uuid: '80b3c4d5-e6f7-cdef-0123-012345678901' },
  { name: 'Virtucon', uuid: '91c4d5e6-f7a8-def0-1234-abcdef012345' },
  { name: 'Macrosoft', uuid: 'a2d5e6f7-a8b9-ef01-2345-bcdef0123456' },
  { name: 'Lexcorp', uuid: 'b3e6f7a8-b9c0-f012-3456-cdef01234567' },
  { name: 'Momcorp', uuid: 'c4f7a8b9-c0d1-0123-4567-def012345678' },
  { name: 'Ajax-Corp', uuid: 'd5a8b9c0-d1e2-1234-5678-ef0123456789' },
  { name: 'Buy-N-Large', uuid: 'e6b9c0d1-e2f3-2345-6789-f01234567890' },
  { name: 'Spacely', uuid: 'f7c0d1e2-f3a4-3456-789a-0123456789ab' },
  { name: 'Cogswell', uuid: '08d1e2f3-a4b5-4567-89ab-123456789abc' },
  { name: 'Sterling-Co', uuid: '19e2f3a4-b5c6-5678-9abc-23456789abcd' },
  { name: 'Krusty-Ent', uuid: '2af3a4b5-c6d7-6789-abcd-3456789abcde' },
  { name: 'Hanso-Found', uuid: '3ba4b5c6-d7e8-789a-bcde-456789abcdef' },
  { name: 'Mishima', uuid: '4cb5c6d7-e8f9-89ab-cdef-56789abcdef0' },
  { name: 'Shinra', uuid: '5dc6d7e8-f9a0-9abc-def0-6789abcdef01' },
  { name: 'Sarif-Ind', uuid: '6ed7e8f9-a0b1-abcd-ef01-789abcdef012' },
  { name: 'Maliwan', uuid: '7fe8f9a0-b1c2-bcde-f012-89abcdef0123' },
  { name: 'Hyperion', uuid: '80f9a0b1-c2d3-cdef-0123-9abcdef01234' },
  { name: 'Atlas-Corp', uuid: '91a0b1c2-d3e4-def0-1234-abcdef012345' },
  { name: 'Fontaine', uuid: 'a2b1c2d3-e4f5-ef01-2345-bcdef0123456' },
  { name: 'Rapture-Ind', uuid: 'b3c2d3e4-f5a6-f012-3456-cdef01234567' },
]

// ── Token definitions ────────────────────────────────────────────────

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
    key: 'mode',
    label: 'Mode',
    strict: true,
    options: [
      { value: 'linear', label: 'Linear' },
      { value: 'radial', label: 'Radial' },
      { value: 'angular', label: 'Angular' },
    ],
  },
  {
    key: 'name',
    label: 'Name',
    negatable: true,
    exclusive: true,
  },
  {
    key: 'reference',
    label: 'Reference',
    options: async (
      query: string,
      signal: AbortSignal,
    ): Promise<TokenOption[]> => {
      // Simulate async fetch with a short delay
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 400)
        signal.addEventListener('abort', () => {
          clearTimeout(timer)
          resolve()
        })
      })

      const lower = query.toLowerCase()
      return references
        .filter((ref) => ref.name.toLowerCase().includes(lower))
        .map((ref) => ({ value: ref.uuid, label: ref.name }))
    },
  },
]
