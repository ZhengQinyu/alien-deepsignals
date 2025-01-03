import { Computed as AlienComputed } from 'alien-signals';

export function computed<T>(getter: (cachedValue?: T) => T): Computed<T> {
  return new Computed<T>(getter);
}

export class Computed<T = any> extends AlienComputed {
  constructor(getter: (cachedValue?: T) => T) {
    super(getter);
  }
  get value(): T {
    return this.get();
  }
}
