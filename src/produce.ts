// Conservative quality reminders for whole, fresh produce. Most ranges are
// from USDA FoodKeeper; ripe tomatoes use Nebraska Extension's fridge range.
export type ProduceEntry = { id: string; name: string; days: number; range: string; sourceUrl?: string }
export const produce: ProduceEntry[] = [
  { id: '279', name: 'Морковь', days: 14, range: '2–3 недели' },
  { id: '283', name: 'Огурцы', days: 4, range: '4–6 дней' },
  { id: '276', name: 'Брокколи', days: 3, range: '3–5 дней' },
  { id: '278', name: 'Капуста', days: 7, range: '1–2 недели' },
  { id: '274', name: 'Свёкла', days: 7, range: '1–2 недели' },
  { id: '280', name: 'Цветная капуста', days: 3, range: '3–5 дней' },
  { id: '284', name: 'Баклажаны', days: 4, range: '4–7 дней' },
  { id: '296', name: 'Перец', days: 4, range: '4–14 дней' },
  { id: '291', name: 'Листовой салат', days: 3, range: '3–7 дней' },
  { id: '292', name: 'Грибы', days: 3, range: '3–7 дней' },
  { id: '299', name: 'Редис', days: 10, range: '10–14 дней' },
  { id: 'unl-tomatoes', name: 'Помидоры', days: 1, range: '1–2 дня для спелых в холодильнике', sourceUrl: 'https://food.unl.edu/free-resource/food-storage/' },
  { id: '600', name: 'Помидоры черри', days: 5, range: '5 дней в холодильнике' },
]

export function findProduce(name: string) {
  const normalized = name.toLocaleLowerCase('ru').replaceAll('ё', 'е')
  if (/соус|паст|консерв|марин|солен|сушен|вялен|заморож|пюре|кетчуп|сок|молот|жарен|варен/.test(normalized)) return null
  const patterns: { id: string; pattern: RegExp }[] = [
    { id: '600', pattern: /(?:помидор|томат).{0,15}черри|черри.{0,15}(?:помидор|томат)/ },
    { id: '280', pattern: /цветн.{0,8}капуст/ },
    { id: 'unl-tomatoes', pattern: /помидор|томат/ },
    { id: '279', pattern: /морков/ },
    { id: '283', pattern: /огур/ },
    { id: '276', pattern: /броккол/ },
    { id: '278', pattern: /капуст/ },
    { id: '274', pattern: /свекл/ },
    { id: '284', pattern: /баклажан/ },
    { id: '296', pattern: /перец|перца|перцы/ },
    { id: '291', pattern: /листов.{0,10}салат|салат.{0,10}лист/ },
    { id: '292', pattern: /гриб|шампиньон/ },
    { id: '299', pattern: /редис/ },
  ]
  const match = patterns.find(entry => entry.pattern.test(normalized))
  return match ? produce.find(entry => entry.id === match.id) ?? null : null
}

export function reviewDate(days: number) {
  const value = new Date()
  value.setDate(value.getDate() + days)
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
