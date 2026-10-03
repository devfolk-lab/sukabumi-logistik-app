import type { PackageItem } from '#shared/types'

/**
 * Biteship's item categories. The value is what the API takes; the label is
 * what the form shows.
 */
export const ITEM_CATEGORIES = [
  { value: 'fashion', label: 'Fashion' },
  { value: 'electronic', label: 'Elektronik' },
  { value: 'food', label: 'Makanan & minuman' },
  { value: 'beauty', label: 'Kecantikan' },
  { value: 'health', label: 'Kesehatan' },
  { value: 'document', label: 'Dokumen' },
  { value: 'book', label: 'Buku' },
  { value: 'household', label: 'Perlengkapan rumah' },
  { value: 'hobby', label: 'Hobi & mainan' },
  { value: 'automotive', label: 'Otomotif' },
  { value: 'others', label: 'Lainnya' }
] as const

export function itemCategoryLabel(value: string): string {
  return ITEM_CATEGORIES.find(c => c.value === value)?.label ?? value
}

export function emptyItem(): PackageItem {
  return {
    name: '',
    description: '',
    category: 'others',
    sku: '',
    value: 0,
    quantity: 1,
    weight: 1000,
    length: null,
    width: null,
    height: null
  }
}

/** Total weight in grams: every line's weight times its quantity. */
export function itemsWeight(items: readonly Pick<PackageItem, 'weight' | 'quantity'>[]): number {
  return items.reduce((sum, item) => sum + (item.weight || 0) * (item.quantity || 0), 0)
}

export function itemsQuantity(items: readonly Pick<PackageItem, 'quantity'>[]): number {
  return items.reduce((sum, item) => sum + (item.quantity || 0), 0)
}

/** "Kaos (2), Buku" — item names on one line. */
export function itemsSummary(items: readonly Pick<PackageItem, 'name' | 'quantity'>[]): string {
  return items
    .map(item => item.quantity > 1 ? `${item.name} (${item.quantity})` : item.name)
    .join(', ')
}

/** What is still missing from a line, or `''` when it can be quoted. */
export function itemProblem(item: PackageItem): string {
  if (!item.name.trim()) return 'Isi nama barang.'
  if (!(item.quantity >= 1)) return `Jumlah "${item.name}" minimal 1.`
  if (!(item.weight >= 1)) return `Isi berat "${item.name}".`
  if (!(item.value >= 1)) return `Isi nilai barang "${item.name}".`
  return ''
}
