import type { InvoiceItem, Invoice } from './Invoice'
import type { Person } from '../person/Person'

export interface InvoiceShare {
  personId: string
  name: string
  amount: number
  tipPortion: number
  isBirthday: boolean
}

const roundToCents = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100

function resolvePersonName(id: string, people: Pick<Person, 'id' | 'name'>[]) {
  return people.find((p) => p.id === id)?.name ?? 'Desconocido'
}

export function getItemTotal(item: InvoiceItem) {
  return roundToCents(item.unitPrice * item.quantity)
}

export function buildItemShares(item: InvoiceItem) {
  const participants = item.participantIds
  if (participants.length === 0) return []
  const total = getItemTotal(item)
  const share = roundToCents(total / participants.length)
  const totalRounded = roundToCents(share * participants.length)
  const diff = roundToCents(total - totalRounded)
  return participants.map((personId, index) => ({
    personId,
    amount: roundToCents(share + (index === participants.length - 1 ? diff : 0)),
  }))
}

export function buildConsumptionsFromItems(
  items: InvoiceItem[],
  participantIds: string[],
) {
  const base = participantIds.reduce<Record<string, number>>((acc, id) => {
    acc[id] = 0
    return acc
  }, {})
  return items.reduce<Record<string, number>>((acc, item) => {
    buildItemShares(item).forEach((share) => {
      acc[share.personId] = roundToCents((acc[share.personId] ?? 0) + share.amount)
    })
    return acc
  }, base)
}

function redistributeBirthdayShares(
  baseShares: number[],
  participants: string[],
  birthdayPersonId?: string,
) {
  if (!birthdayPersonId) return baseShares
  const birthdayIndex = participants.findIndex((id) => id === birthdayPersonId)
  if (birthdayIndex === -1 || participants.length <= 1) return baseShares

  const updated = [...baseShares]
  const birthdayBase = updated[birthdayIndex] ?? 0
  updated[birthdayIndex] = 0

  const others = participants.filter((id) => id !== birthdayPersonId)
  const perOther = roundToCents(birthdayBase / others.length)
  const totalRounded = roundToCents(perOther * others.length)
  const diff = roundToCents(birthdayBase - totalRounded)

  others.forEach((id, idx) => {
    const target = participants.indexOf(id)
    updated[target] = roundToCents(
      (updated[target] ?? 0) + perOther + (idx === others.length - 1 ? diff : 0),
    )
  })

  return updated
}

function buildTipPortion(
  personId: string,
  tipReceivers: string[],
  tipShare: number,
  tipDiff: number,
) {
  if (!tipReceivers.includes(personId)) return 0
  const isLastTip =
    tipReceivers.length > 0 &&
    personId === tipReceivers[tipReceivers.length - 1]
  return roundToCents(tipShare + (isLastTip ? tipDiff : 0))
}

export function calculateShares(
  invoice: Invoice,
  people: Pick<Person, 'id' | 'name'>[],
): InvoiceShare[] {
  const participantIds = invoice.participantIds
  if (participantIds.length === 0) return []

  const tip = roundToCents(invoice.tipAmount ?? 0)
  const tipReceivers = invoice.birthdayPersonId
    ? participantIds.filter((id) => id !== invoice.birthdayPersonId)
    : participantIds
  const tipShare =
    tipReceivers.length > 0 ? roundToCents(tip / tipReceivers.length) : 0
  const tipTotalRounded = roundToCents(tipShare * tipReceivers.length)
  const tipDiff = roundToCents(tip - tipTotalRounded)
  const birthdayPersonId = invoice.birthdayPersonId

  if (invoice.divisionMethod === 'consumption') {
    const consumptions = invoice.consumptions ?? {}
    const rounded = participantIds.map((id) =>
      roundToCents(Number(consumptions[id] ?? 0)),
    )
    const totalRounded = roundToCents(rounded.reduce((acc, val) => acc + val, 0))
    const diff = roundToCents(invoice.amount - totalRounded)
    const adjustedBases = rounded.map((base, index) =>
      roundToCents(base + (index === participantIds.length - 1 ? diff : 0)),
    )
    const withBirthday = redistributeBirthdayShares(
      adjustedBases,
      participantIds,
      birthdayPersonId,
    )
    return participantIds.map((personId, index) => {
      const adjustedBase = withBirthday[index] ?? 0
      const adjustedTip = buildTipPortion(personId, tipReceivers, tipShare, tipDiff)
      return {
        personId,
        name: resolvePersonName(personId, people),
        amount: roundToCents(adjustedBase + adjustedTip),
        tipPortion: adjustedTip,
        isBirthday: personId === birthdayPersonId,
      }
    })
  }

  const count = participantIds.length
  const share = roundToCents(invoice.amount / count)
  const totalRounded = roundToCents(share * count)
  const diff = roundToCents(invoice.amount - totalRounded)
  const adjustedBases = participantIds.map((_, index) =>
    index === participantIds.length - 1 ? roundToCents(share + diff) : share,
  )
  const withBirthday = redistributeBirthdayShares(
    adjustedBases,
    participantIds,
    birthdayPersonId,
  )
  return participantIds.map((personId, index) => {
    const adjusted = withBirthday[index] ?? 0
    const adjustedTip = buildTipPortion(personId, tipReceivers, tipShare, tipDiff)
    return {
      personId,
      name: resolvePersonName(personId, people),
      amount: roundToCents(adjusted + adjustedTip),
      tipPortion: adjustedTip,
      isBirthday: personId === birthdayPersonId,
    }
  })
}
