/**
 * The host owns React: the module loader hands it to our factory through `require('react')`.
 * Every client module imports `h`, `Fragment` and hooks from here instead of from 'react',
 * so the bundle carries no React of its own and always matches the host's copy.
 */
import type * as ReactNS from 'react'

let React: typeof ReactNS

export function bindReact(react: typeof ReactNS): void {
  React = react
}

export function h(type: any, props?: any, ...children: any[]): ReactNS.ReactElement {
  return (React.createElement as any)(type, props, ...children)
}

export function Fragment(props: { children?: ReactNS.ReactNode }): any {
  return props.children ?? null
}

export const useState: typeof ReactNS.useState = ((...a: any[]) => (React.useState as any)(...a)) as any
export const useEffect: typeof ReactNS.useEffect = (...a) => React.useEffect(...a)
export const useLayoutEffect: typeof ReactNS.useLayoutEffect = (...a) => React.useLayoutEffect(...a)
export const useMemo: typeof ReactNS.useMemo = (...a) => React.useMemo(...a)
export const useRef: typeof ReactNS.useRef = ((...a: any[]) => (React.useRef as any)(...a)) as any
export const useCallback: typeof ReactNS.useCallback = (...a) => React.useCallback(...a)
export const useSyncExternalStore: typeof ReactNS.useSyncExternalStore = (...a) => React.useSyncExternalStore(...a)

export type ReactNode = ReactNS.ReactNode
export type CSSProperties = ReactNS.CSSProperties
