export const categories = [
  { id: 'vegetables', label: 'Овощи' },
  { id: 'fruit', label: 'Фрукты и ягоды' },
  { id: 'dairy', label: 'Молочные продукты' },
  { id: 'meat', label: 'Мясо и птица' },
  { id: 'fish', label: 'Рыба и морепродукты' },
  { id: 'bakery', label: 'Хлеб и выпечка' },
  { id: 'pantry', label: 'Бакалея' },
  { id: 'drinks', label: 'Напитки' },
  { id: 'ready', label: 'Готовая еда' },
  { id: 'other', label: 'Другое' },
] as const

export type Category = typeof categories[number]['id']
export const categoryLabel = (id: Category) => categories.find(category => category.id === id)?.label ?? 'Другое'

export function categoryFromBarcode(tags?: string[]): Category | null {
  if (!tags?.length) return null
  const joined = tags.join(' ').toLowerCase()
  const rules: { category: Category; pattern: RegExp }[] = [
    { category: 'fish', pattern: /fish|seafood|salmon|tuna|shrimp|prawn|crustacean/ },
    { category: 'meat', pattern: /meat|poultry|chicken|beef|pork|sausage|ham|turkey/ },
    { category: 'dairy', pattern: /dair|milk|yogurt|yoghurt|cheese|butter|cream/ },
    { category: 'vegetables', pattern: /vegetable|tomato|carrot|cucumber|mushroom|salad-leaf/ },
    { category: 'fruit', pattern: /fruit|berr|apple|banana|citrus/ },
    { category: 'bakery', pattern: /bread|baker|pastr|biscuit|cake|cookie/ },
    { category: 'drinks', pattern: /beverage|drink|juice|water|tea|coffee|soda/ },
    { category: 'ready', pattern: /ready-meal|prepared-meal|frozen-meal|sandwich|pizza/ },
    { category: 'pantry', pattern: /pasta|rice|cereal|grain|legume|bean|flour|oil|sauce|canned-food/ },
  ]
  return rules.find(rule => rule.pattern.test(joined))?.category ?? null
}
