// Conservative review dates from the lower end of USDA FoodKeeper's
// "from date of purchase / refrigerate" ranges for whole, fresh vegetables.
// These are quality reminders, not food safety guarantees.
export const produce = [
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
] as const

export function reviewDate(days: number) {
  const value = new Date()
  value.setDate(value.getDate() + days)
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
