/**
 * One timer for the whole surface. Ticks on the second boundary while at least one
 * subscriber exists and the document is visible; pauses otherwise.
 */
type Listener = () => void;

const listeners = new Set<Listener>();
let timer: ReturnType<typeof setTimeout> | undefined;
let now = Date.now();

function emit(): void {
  now = Date.now();
  for (const l of listeners) l();
}

function schedule(): void {
  if (timer !== undefined || listeners.size === 0) return;
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
  const delay = 1000 - (Date.now() % 1000);
  timer = setTimeout(() => {
    timer = undefined;
    emit();
    schedule();
  }, delay);
}

function stop(): void {
  if (timer !== undefined) {
    clearTimeout(timer);
    timer = undefined;
  }
}

function onVisibilityChange(): void {
  if (document.visibilityState === 'visible') {
    emit();
    schedule();
  } else {
    stop();
  }
}

let visibilityBound = false;

export function subscribeClock(listener: Listener): () => void {
  listeners.add(listener);
  if (!visibilityBound && typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange);
    visibilityBound = true;
  }
  schedule();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stop();
  };
}

export function getClockNow(): number {
  return now;
}
