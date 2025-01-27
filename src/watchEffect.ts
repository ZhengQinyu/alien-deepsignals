import { watch } from "./watch"

export function watchEffect(effect: () => void) {
  return watch(effect, undefined)
}
