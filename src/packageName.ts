// OCR on packaging is fallible: offer likely printed lines as editable suggestions.
const nonName = /\b(?:exp(?:iry)?|best before|use by|lot|batch|sn|serial|gtin|ean|mfg|manufactur(?:ed|er)|ingredients|nutrition|tablet(?:s)?|capsule(?:s)?)\b|tablečių|kapsul|таблетк|капсул|годен|срок|серия|партия|состав|пищевая ценность|laikymo|tinkamumo|geriausias iki|sudėtis|vaistinis preparatas/i

export function packageNameCandidates(text: string): string[] {
  const lines = text.split(/\r?\n/)
    .map(line => line.replace(/\s+/g, ' ').replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N})]+$/gu, '').trim())
    .filter(line => {
      const letters = line.match(/\p{L}/gu)?.length ?? 0
      return letters >= 4 && line.length <= 90 && !nonName.test(line) && !/\b\d{2}[./-]\d{2}[./-]\d{2,4}\b/.test(line)
    })
  return [...new Map(lines.map(line => [line.toLocaleLowerCase(), line])).values()].slice(0, 4)
}
