/**
 * Requests to open a deck in the studio, from places outside it (the chat's tool card).
 * The studio may not be mounted yet when the request is made, so the latest one waits here.
 */
type Listener = (path: string) => void

let pending: string | null = null
const listeners = new Set<Listener>()

export function requestOpenDeck(path: string): void {
  pending = path
  for (const listener of listeners) listener(path)
}

/** Subscribe, receiving a request made before mounting immediately. */
export function onOpenDeck(listener: Listener): () => void {
  listeners.add(listener)
  if (pending) listener(pending)
  return () => void listeners.delete(listener)
}

export function consumeOpenDeck(path: string): void {
  if (pending === path) pending = null
}
