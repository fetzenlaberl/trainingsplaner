/**
 * Entry of a menu to focus after a key press (first to last and back around), or null for other
 * keys and empty menus. `current` is -1 while no entry has the focus.
 */
export function nextMenuIndex(key: string, current: number, count: number): number | null {
  if (count === 0) return null
  if (key === 'ArrowDown') return (current + 1) % count
  if (key === 'ArrowUp') return current <= 0 ? count - 1 : current - 1
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  return null
}
