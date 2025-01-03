import { Signal as AlienSignal } from 'alien-signals';
export function signal<T>(): Signal<T | undefined>;
export function signal<T>(oldValue: T): Signal<T>;
export function signal<T>(oldValue?: T): Signal<T | undefined> {
  return new Signal(oldValue);
}

export class Signal<T = any> extends AlienSignal {
  constructor(
    currentValue: T
  ) {
    super(currentValue);
  }

  get value(): T {
    return this.get()
  }

  set value(value: T) {
    this.set(value)
  }

  peek(): T {
    return this.currentValue;
  }
}
