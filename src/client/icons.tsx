import { h } from './react.js'

const PATHS = {
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  code: 'M14 3v4a1 1 0 0 0 1 1h4|M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z|m10 13-2 2 2 2M14 13l2 2-2 2',
  palette: 'M12 2a10 10 0 0 0 0 20 1.7 1.7 0 0 0 1.7-1.7c0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1a1.7 1.7 0 0 1 1.7-1.7h2A5.6 5.6 0 0 0 22 10.8C22 5.9 17.5 2 12 2z|M13.5 6.5h.01M17.5 10.5h.01M8.5 7.5h.01M6.5 12.5h.01',
  folder: 'M4 20h16a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-8l-2-3H4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1z',
  sliders: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  help: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z|M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01',
  slides: 'M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z|M8 21h8M12 18v3',
  chevR: 'm9 18 6-6-6-6',
  chevL: 'm15 18-6-6 6-6',
  chevD: 'm6 9 6 6 6-6',
  chevU: 'm18 15-6-6-6 6',
  play: 'm6 3 14 9-14 9z',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  panelL: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z|M9 3v18',
  panelR: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z|M15 3v18',
  panelB: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z|M3 15h18',
  send: 'M12 19V5M5 12l7-7 7 7',
  check: 'M20 6 9 17l-5-5',
  x: 'M18 6 6 18M6 6l12 12',
  copy: 'M11 9h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z|M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1',
  expand: 'M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7',
  msg: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  file: 'M14 3v4a1 1 0 0 0 1 1h4|M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z',
  refresh: 'M21 12a9 9 0 1 1-3-6.7L21 8|M21 3v5h-5',
  plus: 'M12 5v14M5 12h14',
  edit: 'M12 20h9|M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  open: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3',
  stop: 'M7 7h10v10H7z',
} as const

export type IconName = keyof typeof PATHS

export function Icon(props: { name: IconName; size?: number }) {
  const size = props.size ?? 16
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: 'block', flex: 'none' }}
    >
      {PATHS[props.name].split('|').map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  )
}
