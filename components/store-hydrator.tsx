"use client"

import { useEffect, useSyncExternalStore } from "react"

import { useGraphStore } from "@/store/graph-store"

let didInit = false

function subscribeHydration(cb: () => void) {
    return useGraphStore.persist.onFinishHydration(cb)
}

function getHydrationSnapshot() {
    return useGraphStore.persist.hasHydrated()
}

function getServerHydrationSnapshot() {
    return false
}

export function useHasHydrated(): boolean {
    return useSyncExternalStore(
        subscribeHydration,
        getHydrationSnapshot,
        getServerHydrationSnapshot
    )
}

export function StoreHydrator() {
    useEffect(() => {
        if (didInit) return
        didInit = true
        useGraphStore.persist.rehydrate()
    }, [])
    return null
}
