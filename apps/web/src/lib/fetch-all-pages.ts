export async function fetchAllPages<T>({
  pageSize,
  fetchPage,
}: {
  pageSize: number
  fetchPage: (skip: number, limit: number) => Promise<T[]>
}): Promise<T[]> {
  const limit = Math.max(1, pageSize)
  const allItems: T[] = []
  let skip = 0

  while (true) {
    const page = await fetchPage(skip, limit)
    if (!Array.isArray(page) || page.length === 0) break

    allItems.push(...page)
    if (page.length < limit) break
    skip += limit
  }

  return allItems
}
