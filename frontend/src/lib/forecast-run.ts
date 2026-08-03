'use client';

import { useEffect, useState } from 'react';

type Listener = (running: boolean) => void;

let running = false;
const listeners = new Set<Listener>();

export function beginForecastRun() {
  running = true;
  listeners.forEach((l) => l(true));
}

export function endForecastRun() {
  running = false;
  listeners.forEach((l) => l(false));
}

export function useForecastRun() {
  const [isRunning, setIsRunning] = useState(running);

  useEffect(() => {
    const listener: Listener = (value) => setIsRunning(value);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return isRunning;
}
