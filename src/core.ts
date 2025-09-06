import { createReactiveSystem, Dependency, Link, Subscriber, SubscriberFlags } from 'alien-signals';
import { ReactiveFlags } from "./contents"
import { isFunction } from './utils';
const {
  link,
  propagate,
  endTracking,
  startTracking,
  updateDirtyFlag,
  processComputedUpdate,
  processEffectNotifications,
} = createReactiveSystem({
  updateComputed(computed: Computed) {
    return computed.update();
  },
  notifyEffect(effect: Effect) {
    effect.notify();
    return true;
  },
});

const pauseStack: (Subscriber | undefined)[] = [];
let activeSub: Subscriber | undefined = undefined;
let batchDepth = 0;

export function pauseTracking() {
	pauseStack.push(activeSub);
	activeSub = undefined;
}

export function resumeTracking() {
	activeSub = pauseStack.pop();
}

export const untracked = <T>(fn: () => T): T => {
  pauseTracking();
  try { return fn(); }
  finally { resumeTracking(); }
};

export function startBatch(): void {
  ++batchDepth;
}

export function endBatch(): void {
  if (!--batchDepth) {
    processEffectNotifications();
  }
}

export function signal<T>(): Signal<T | undefined>;
export function signal<T>(oldValue: T): Signal<T>;
export function signal<T>(oldValue?: T): Signal<T | undefined> {
  return new Signal(oldValue);
}

export class Signal<T = any> implements Dependency {
  public readonly [ReactiveFlags.IS_SIGNAL] = true
  public readonly [ReactiveFlags.SKIP] = true
  // Dependency fields
  subs: Link | undefined = undefined;
  subsTail: Link | undefined = undefined;

  constructor(
    public currentValue: T
  ) { }

  get(): T {
    if (activeSub !== undefined) {
      link(this, activeSub);
    }
    return this.currentValue;
  }

  set(value: T): void {
    if (this.currentValue !== value) {
      this.currentValue = value;
      const subs = this.subs;
      if (subs !== undefined) {
        propagate(subs);
        if (!batchDepth) {
          processEffectNotifications();
        }
      }
    }
  }

  get value(): T {
    return this.get();
  }

  set value(value: T) {
    this.set(value);
  }

  peek(): T {
    return this.currentValue;
  }
}

export function computed<T>(getter: () => T): Computed<T> {
  return new Computed<T>(getter);
}

export class Computed<T = any> implements Subscriber, Dependency {
  readonly [ReactiveFlags.IS_SIGNAL] = true
  currentValue: T | undefined = undefined;

  // Dependency fields
  subs: Link | undefined = undefined;
  subsTail: Link | undefined = undefined;

  // Subscriber fields
  deps: Link | undefined = undefined;
  depsTail: Link | undefined = undefined;
  flags: SubscriberFlags = SubscriberFlags.Computed | SubscriberFlags.Dirty;

  constructor(
    public getter: () => T
  ) { }

  get(): T {
    const flags = this.flags;
    if (flags & (SubscriberFlags.PendingComputed | SubscriberFlags.Dirty)) {
      processComputedUpdate(this, flags);
    }
    if (activeSub !== undefined) {
      link(this, activeSub);
    }
    return this.currentValue!;
  }

  update(): boolean {
    const prevSub = activeSub;
    activeSub = this;
    startTracking(this);
    try {
      const oldValue = this.currentValue;
      const newValue = this.getter();
      if (oldValue !== newValue) {
        this.currentValue = newValue;
        return true;
      }
      return false;
    } finally {
      activeSub = prevSub;
      endTracking(this);
    }
  }

  get value(): Readonly<T> {
    return this.get();
  }

  peek(): T {
    return untracked(this.getter);
  }
}

export function effect<T>(fn: () => T): Effect<T> {
  const e = new Effect(fn);
  e.run();
  return e;
}

export enum EffectFlags {
  /**
   * ReactiveEffect only
   */
  ALLOW_RECURSE = 1 << 7,
  PAUSED = 1 << 8,
  NOTIFIED = 1 << 9,
  STOP = 1 << 10,
}

export class Effect<T = any> implements Subscriber {
  readonly [ReactiveFlags.IS_SIGNAL] = true
  // Subscriber fields
  deps: Link | undefined = undefined;
  depsTail: Link | undefined = undefined;
  flags: SubscriberFlags = SubscriberFlags.Effect;
  constructor(
    public fn: () => T
  ) { }

  notify(): void {
    const flags = this.flags;
    if (
      flags & SubscriberFlags.Dirty
      || (flags & SubscriberFlags.PendingComputed && updateDirtyFlag(this, flags))
    ) {
      this.scheduler();
    }
  }

  scheduler(): void {
    if (this.dirty) {
      this.run()
    }
  }
  get active(): boolean {
    return !(this.flags & EffectFlags.STOP)
  }

  get dirty(): boolean {
    const flags = this.flags
    if (
      flags & SubscriberFlags.Dirty ||
      (flags & SubscriberFlags.PendingComputed && updateDirtyFlag(this, flags))
    ) {
      return true
    }
    return false
  }

  run(): T {
    const prevSub = activeSub;
    activeSub = this;
    startTracking(this);
    try {
      return this.fn();
    } finally {
      activeSub = prevSub;
      endTracking(this);
    }
  }

  stop(): void {
    startTracking(this);
    endTracking(this);
  }
}

export function batch<T>(fn: () => T): T {
  startBatch();
  try {
    return fn();
  } finally {
    endBatch();
  }
}

export function isSignal<T>(r: Signal<T> | unknown): r is Signal<T>
export function isSignal(s: any): s is Signal {
  return s ? s[ReactiveFlags.IS_SIGNAL] === true : false
}

export type MaybeSignal<T = any> =
  | T
  | Signal<T>

export type MaybeSignalOrGetter<T = any> = MaybeSignal<T> | Computed<T> | (() => T)

export function unSignal<T>(signal: MaybeSignal<T> | Computed<T>): T {
  return (isSignal(signal) ? signal.value : signal) as T;
}

export function toValue<T>(source: MaybeSignalOrGetter<T>): T {
  return isFunction(source) ? source() : unSignal(source)
}
