// Ícones em traço (SVG), herdam a cor do texto.

const PATHS: Record<string, string> = {
  headphones: 'M4 14v-2a8 8 0 0 1 16 0v2M3 14h4v6H4a1 1 0 0 1-1-1zM17 14h4v5a1 1 0 0 1-1 1h-3z',
  'headphones-off': 'M4 14v-2a8 8 0 0 1 13.6-5.7M20 12v2M3 14h4v6H4a1 1 0 0 1-1-1zM17 14h4v5a1 1 0 0 1-1 1h-3zM3 3l18 18',
  mic: 'M9 5a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0zM5 11a7 7 0 0 0 14 0M12 18v3',
  'mic-off': 'M9 5a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0zM5 11a7 7 0 0 0 14 0M12 18v3M3 3l18 18',
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  path: 'M6 20c0-6 12-6 12-12M6 4h.01M18 20h.01M6 4a2 2 0 1 0 .01 0M18 20a2 2 0 1 0 .01 0',
  book: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11',
  heart: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
  flame: 'M12 21c-4 0-7-3-7-7 0-4 3-6 4-9 2 2 3 4 3 6 1-1 2-2 2-4 3 2 5 5 5 7 0 4-3 7-7 7z',
  snow: 'M12 2v20M4.9 6.5l14.2 11M19.1 6.5L4.9 17.5M9 4l3 2 3-2M9 20l3-2 3 2',
  close: 'M6 6l12 12M18 6L6 18',
  speaker: 'M4 9h4l5-4v14l-5-4H4zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12',
  check: 'M5 12l5 5L20 7',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  gift: 'M3 8h18v4H3zM5 12h14v9H5zM12 8v13M12 8C10 4 6 4 7 7c.5 1.5 5 1 5 1zM12 8c2-4 6-4 5-1-.5 1.5-5 1-5 1z',
  hand: 'M8 13V5a2 2 0 0 1 4 0v6M12 10a2 2 0 0 1 4 0v3a6 6 0 0 1-12 0v-2a2 2 0 0 1 4 0',
  lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  play: 'M7 4l13 8-13 8z',
  refresh: 'M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  back: 'M19 12H5M11 6l-6 6 6 6',
  cloud: 'M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 19 10a4 4 0 0 1 0 8z',
  pen: 'M4 20l4-1 11-11-3-3L5 16zM14 6l3 3',
  turtle: 'M4 15a7 6 0 0 1 14 0zM2 15h18M7 15v3M15 15v3M18 12.5a2.2 2.2 0 1 1 3 1.5l-2 1M8 11l3-3 3 3',
}

export function Icon({ name, size = 22, stroke = 2.2 }: { name: keyof typeof PATHS | string; size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name] ?? ''} />
    </svg>
  )
}

/** Jiaozinho (a moeda do app): um bolinho dourado. */
export function Jiaozi({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.5 15c0-5 4.3-8.5 9.5-8.5S21.5 10 21.5 15c0 1.4-1 2.5-2.5 2.5H5C3.6 17.5 2.5 16.4 2.5 15z" fill="#FFC93C" />
      <path d="M6 9.5l1.2 2.3M9.3 7.6l.7 2.6M12.8 7.4l-.1 2.7M16.2 8.3l-.9 2.5M18.7 10.3l-1.5 2" stroke="#B88A12" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/** Desenho de cada presente. */
export function GiftArt({ kind, size = 44 }: { kind: string; size?: number }) {
  const s = { width: size, height: size }
  switch (kind) {
    case 'flor':
      return (
        <svg {...s} viewBox="0 0 40 40" aria-hidden="true">
          <path d="M20 28v10" stroke="#5BBF6A" strokeWidth="3" />
          <circle cx="20" cy="13" r="6" fill="#E5383B" />
          <circle cx="13" cy="18" r="6" fill="#E5383B" />
          <circle cx="27" cy="18" r="6" fill="#E5383B" />
          <circle cx="20" cy="23" r="6" fill="#E5383B" />
          <circle cx="20" cy="18" r="4" fill="#FFC93C" />
        </svg>
      )
    case 'cha':
      return (
        <svg {...s} viewBox="0 0 40 40" aria-hidden="true">
          <path d="M22 12l4-10" stroke="#E5383B" strokeWidth="3" />
          <path d="M11 12h18l-3 24H14z" fill="#C9A6FF" />
          <circle cx="16" cy="31" r="2" fill="#14101C" />
          <circle cx="21" cy="32" r="2" fill="#14101C" />
          <circle cx="24" cy="28" r="2" fill="#14101C" />
        </svg>
      )
    case 'lanterna':
      return (
        <svg {...s} viewBox="0 0 40 40" aria-hidden="true">
          <path d="M20 3v5M20 33v5" stroke="#FFC93C" strokeWidth="3" />
          <ellipse cx="20" cy="21" rx="13" ry="12" fill="#E5383B" />
          <path d="M14 10h12M14 32h12" stroke="#FFC93C" strokeWidth="4" />
          <path d="M20 9v24" stroke="#A31F22" strokeWidth="1.5" />
        </svg>
      )
    case 'congelar':
      return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke="#9BD3FF" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 2v20M4.9 6.5l14.2 11M19.1 6.5L4.9 17.5M9 4l3 2 3-2M9 20l3-2 3 2" />
        </svg>
      )
    case 'cutucada':
      return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke="#C9A6FF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8 13V5a2 2 0 0 1 4 0v6M12 10a2 2 0 0 1 4 0v3a6 6 0 0 1-12 0v-2a2 2 0 0 1 4 0" />
        </svg>
      )
    default:
      return (
        <svg {...s} viewBox="0 0 40 40" aria-hidden="true">
          <rect x="6" y="8" width="28" height="24" rx="3" fill="#F6EAD3" />
          <path d="M11 15h18M11 20h18M11 25h11" stroke="#9A3A1E" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
  }
}
