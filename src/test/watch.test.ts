import { describe, expect, it } from "vitest";
import { deepSignal } from "../deepSignal";
import { watch } from "../watch";
import { watchEffect } from "../watchEffect";

describe('watch', () => {
  it('watch immediate', () => {
    const store = deepSignal({
      userinfo: {
        name: "tom"
      }
    })
    let val!: string
    watch(store, (newValue) => {
      val = newValue.userinfo.name
    }, {
      immediate: true,
      deep: true
    })
    expect(val).toEqual('tom')
  })
  it('watch deep', () => {
    const store = deepSignal({
      userinfo: {
        name: "tom"
      }
    })
    let val!: string
    watch(store, (newValue) => {
      val = newValue.userinfo.name
    }, {
      immediate: true,
      deep: true
    })
    let value2!: string
    watch(store, (newValue) => {
      value2 = newValue.userinfo.name
    }, { immediate: true })
    expect(val).toEqual('tom')
    store.userinfo.name = "jon"
    expect(val).toEqual('jon')
    expect(value2).toEqual('tom')
  })

  it('watch once', () => {
    const store = deepSignal({
      userinfo: {
        name: "tom"
      }
    })
    let val!: string
    watch(store, (newValue) => {
      val = newValue.userinfo.name
    }, {
      immediate: true,
      deep: true,
      once: true
    })

    expect(val).toEqual("tom")
    store.userinfo.name = "jon"
    expect(val).not.toEqual("jon")
    expect(val).toEqual("tom")
  })

  it('watch effect', () => {
    const store = deepSignal({
      userinfo: {
        name: "tom"
      }
    })
    let x = undefined
    watchEffect(() => {
      x = store.userinfo.name
    })

    expect(x).toEqual("tom")
    store.userinfo.name = "jon"
    expect(x).toEqual("jon")
  })
})
