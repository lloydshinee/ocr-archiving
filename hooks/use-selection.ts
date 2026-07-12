"use client"

import { useState, useCallback, useMemo } from "react"

export function useSelection(visibleIds: string[]) {
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [lastClickedId, setLastClickedId] = useState<string | null>(null)

  const toggle = useCallback((id: string, shiftKey = false) => {
    setSelectedIds((prev) => {
      if (shiftKey && lastClickedId) {
        const startIdx = visibleIds.indexOf(lastClickedId)
        const endIdx = visibleIds.indexOf(id)
        if (startIdx !== -1 && endIdx !== -1) {
          const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx]
          const range = visibleIds.slice(from, to + 1)
          const next = new Set(prev)
          for (const rid of range) next.add(rid)
          return next
        }
      }
      setLastClickedId(id)
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [visibleIds, lastClickedId])

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(visibleIds))
  }, [visibleIds])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds],
  )

  const allSelected = useMemo(
    () => visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id)),
    [visibleIds, selectedIds],
  )

  const toggleAll = useCallback(() => {
    if (allSelected) {
      clearSelection()
    } else {
      selectAll()
    }
  }, [allSelected, clearSelection, selectAll])

  const selectedCount = selectedIds.size

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false)
    setSelectedIds(new Set())
  }, [])

  return {
    selectionMode,
    setSelectionMode,
    selectedIds,
    selectedCount,
    toggle,
    selectAll,
    clearSelection,
    isSelected,
    allSelected,
    toggleAll,
    exitSelectionMode,
  }
}
