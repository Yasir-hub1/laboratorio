/** ID estable para rutas API (evita usar row.id de TanStack Table, que es el índice). */
export function resolveEntityId(entity) {
  if (entity == null) return undefined
  const id = entity.id ?? entity.user_id ?? entity.uuid ?? entity._id
  if (id == null || id === '') return undefined
  return String(id)
}
