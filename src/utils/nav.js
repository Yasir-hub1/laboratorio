/** Comprueba si una ruta del menú coincide con la URL actual. */
export function isNavItemActive(pathname, item) {
  if (item.end) return pathname === item.to
  return pathname === item.to || pathname.startsWith(`${item.to}/`)
}

/** ID del grupo que contiene la ruta activa. */
export function getActiveNavGroupId(pathname, groups) {
  const group = groups.find((g) =>
    g.items.some((item) => isNavItemActive(pathname, item)),
  )
  return group?.id ?? null
}

export function groupHasActiveItem(pathname, group) {
  return group.items.some((item) => isNavItemActive(pathname, item))
}
