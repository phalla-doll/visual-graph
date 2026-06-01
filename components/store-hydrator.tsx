"use client"

import { useEffect } from "react"

import { useGraphStore } from "@/store/graph-store"

export function StoreHydrator() {
    useEffect(() => {
        useGraphStore.persist.rehydrate()
    }, [])
    return null
}
