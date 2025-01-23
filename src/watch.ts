import { Computed, Effect, isSignal, Signal, } from './core';
import { hasChanged, isArray, traverse } from './utils';
import { isDeepSignal, isShallow } from "./deepSignal"

export type OnCleanup = (cleanupFn: () => void) => void
export type WatchEffect = (onCleanup: OnCleanup) => void

export type WatchSource<T = any> = Signal<T> | Computed<T> | (() => T)

export interface WatchOptions<Immediate = boolean> {
  immediate?: Immediate
  deep?: boolean | number
  once?: boolean
}

export type WatchCallback<V = any, OV = any> = (
  value: V,
  oldValue: OV,
  onCleanup: OnCleanup,
) => any

const INITIAL_WATCHER_VALUE = {}
let activeWatcher!: Effect

export const remove = <T>(arr: T[], el: T): void => {
  const i = arr.indexOf(el)
  if (i > -1) {
    arr.splice(i, 1)
  }
}

export function watch(
  source: WatchSource | WatchSource[] | WatchEffect | object,
  cb?: WatchCallback,
  options: WatchOptions = {}
) {
  const { once, immediate, deep } = options

  let effect!: Effect
  let getter!: () => any
  // let boundCleanup: typeof onWatcherCleanup
  let forceTrigger = false
  let isMultiSource = false

  const signalGetter = (source: object) => {
    // traverse will happen in wrapped getter below
    if (deep) return source
    // for `deep: false | 0` or shallow reactive, only traverse root-level properties
    if (isShallow(source) || deep === false || deep === 0)
      return traverse(source, 1)
    // for `deep: undefined` on a reactive object, deeply traverse all properties
    return traverse(source)
  }

  const watchHandle = () => {
    effect.stop()
    return effect
  }

  if (once && cb) {
    const _cb = cb
    cb = (...args) => {
      _cb(...args)
      watchHandle()
    }
  }

  if (isSignal(source)) {
    getter = () => source.value
    forceTrigger = isShallow(source)
  } else if (isDeepSignal(source)) {
    getter = () => {
      return signalGetter(source)
    }
    forceTrigger = true
  } else if (isArray(source)) {
    isMultiSource = true
    forceTrigger = source.some(s => isDeepSignal(s) || isShallow(s))
    getter = () =>
      source.map(s => {
        if (isSignal(s)) {
          return s.value
        } else if (isDeepSignal(s)) {
          return signalGetter(s)
        }
      })
  }
  if (cb && deep) {
    const baseGetter = getter
    const depth = deep === true ? Infinity : deep
    getter = () => traverse(baseGetter(), depth)
  }

  let oldValue: any = isMultiSource
    ? new Array((source as []).length).fill(INITIAL_WATCHER_VALUE)
    : INITIAL_WATCHER_VALUE

  const job = (immediateFirstRun?: boolean) => {
    if (!effect.active || (!immediateFirstRun && !effect.dirty)) {
      return
    }
    if (cb) {
      // watch(source, cb)
      const newValue = effect.run()

      if (
        deep ||
        forceTrigger ||
        (isMultiSource
          ? (newValue as any[]).some((v, i) => hasChanged(v, oldValue[i]))
          : hasChanged(newValue, oldValue))
      ) {
        const currentWatcher = activeWatcher
        activeWatcher = effect
        try {
          const args = [
            newValue,
            // pass undefined as the old value when it's changed for the first time
            oldValue === INITIAL_WATCHER_VALUE
              ? undefined
              : isMultiSource && oldValue[0] === INITIAL_WATCHER_VALUE
                ? []
                : oldValue,
            effect.stop,
          ]
          // @ts-ignore
          cb!(...args)
          oldValue = newValue
        } finally {
          activeWatcher = currentWatcher
        }
      }
    } else {
      // watchEffect
      effect.run()
    }
  }

  effect = new Effect(getter)
  effect.scheduler = job

  if (cb) {
    if (immediate) {
      job(true)
    } else {
      oldValue = effect.run()
    }
  } else {
    effect.run()
  }
  return watchHandle
}
