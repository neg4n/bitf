import type { Tagged } from 'type-fest'

export type Bitflag = Tagged<number, 'Bitflag'>

export type BitflagsDefinitions<T extends Record<string, number>> = {
  readonly [K in keyof T]: Tagged<T[K], 'Bitflag'>
}

export type InferBitflagsDefinitions<T extends BitflagsDefinitions<any>> =
  T extends BitflagsDefinitions<infer U> ? { [K in keyof U]: Bitflag } : never

type BitPosition = {
  exact: number
  remaining: number
  visual: string
}

type FlagDescription = {
  name: string
  value: number
  decimal: string
  hexadecimal: string
  binary: string
  unknown: boolean
  bitPosition: BitPosition
}

type BitflagOperations<T extends Record<string, number> = Record<string, number>> = {
  has(...flags: Bitflag[]): boolean
  hasAny(...flags: Bitflag[]): boolean
  hasExact(...flags: Bitflag[]): boolean
  add(...flags: Bitflag[]): Bitflag
  remove(...flags: Bitflag[]): Bitflag
  toggle(...flags: Bitflag[]): Bitflag
  clear(): Bitflag
  describe(flagDefinitions?: BitflagsDefinitions<T>): IterableIterator<FlagDescription>
  value: number
  valueOf(): number
  toString(): string
}

export function defineBitflags<T extends Record<string, number>>(obj: T): BitflagsDefinitions<T> {
  const frozen = Object.freeze(obj)

  for (const [key, value] of Object.entries(frozen)) {
    if (!Number.isInteger(value) || value < 0 || value > 0x7fffffff) {
      throw new Error(
        `Invalid bitflag value for "${key}": ${value}. Must be a non-negative integer within 31-bit range.`
      )
    }
  }

  return frozen as BitflagsDefinitions<T>
}

function combineFlags(flags: Bitflag[]): number {
  let result = 0
  for (let i = 0; i < flags.length; i++) {
    result |= flags[i] as unknown as number
  }
  return result
}

function createBitPosition(value: number): BitPosition {
  if (value === 0) {
    return {
      exact: -1,
      remaining: 31,
      visual: '(0)0000000000000000000000000000000',
    }
  }

  const bits = []
  const exactPositions = []

  for (let i = 30; i >= 0; i--) {
    if (value & (1 << i)) {
      bits.push('[1]')
      exactPositions.push(i)
    } else {
      bits.push('0')
    }
  }

  const visual = `(0)${bits.join('')}`
  const maxPosition = exactPositions.length > 0 ? Math.max(...exactPositions) : 0

  return {
    exact: maxPosition,
    remaining: 31 - maxPosition,
    visual: visual,
  }
}

export function bitflag<T extends Record<string, number> = Record<string, number>>(
  flag: Bitflag | number = 0
): BitflagOperations<T> {
  const value = (typeof flag === 'number' ? flag : (flag as unknown as number)) | 0

  return {
    has(...flags: Bitflag[]) {
      if (flags.length === 0) return false
      const combined = combineFlags(flags)
      return (value & combined) === combined
    },

    hasAny(...flags: Bitflag[]) {
      if (flags.length === 0) return false
      const combined = combineFlags(flags)
      return (value & combined) !== 0
    },

    hasExact(...flags: Bitflag[]) {
      if (flags.length === 0) return value === 0
      const combined = combineFlags(flags)
      return value === combined
    },

    add(...flags: Bitflag[]) {
      if (flags.length === 0) return value as Bitflag
      const combined = combineFlags(flags)
      return (value | combined) as Bitflag
    },

    remove(...flags: Bitflag[]) {
      if (flags.length === 0) return value as Bitflag
      const combined = combineFlags(flags)
      return (value & ~combined) as Bitflag
    },

    toggle(...flags: Bitflag[]) {
      if (flags.length === 0) return value as Bitflag
      const combined = combineFlags(flags)
      return (value ^ combined) as Bitflag
    },

    clear() {
      return 0 as Bitflag
    },

    *describe(flagDefinitions?: BitflagsDefinitions<T>): IterableIterator<FlagDescription> {
      if (value === 0) {
        yield {
          name: 'NONE',
          value: 0,
          decimal: '0',
          hexadecimal: '0x0',
          binary: '0b0',
          unknown: false,
          bitPosition: createBitPosition(0),
        }
        return
      }

      const knownFlags: FlagDescription[] = []
      let unknownBits = value

      if (flagDefinitions) {
        for (const [name, flagValue] of Object.entries(flagDefinitions)) {
          const numValue = flagValue as unknown as number
          if (numValue !== 0 && (value & numValue) === numValue) {
            knownFlags.push({
              name,
              value: numValue,
              decimal: numValue.toString(),
              hexadecimal: `0x${numValue.toString(16).toUpperCase()}`,
              binary: `0b${numValue.toString(2)}`,
              unknown: false,
              bitPosition: createBitPosition(numValue),
            })
            unknownBits &= ~numValue
          }
        }
      }

      if (!flagDefinitions || Object.keys(flagDefinitions).length === 0) {
        for (let bit = 0; bit < 31; bit++) {
          const mask = 1 << bit
          if (value & mask) {
            yield {
              name: `BIT_${bit}`,
              value: mask,
              decimal: mask.toString(),
              hexadecimal: `0x${mask.toString(16).toUpperCase()}`,
              binary: `0b${mask.toString(2)}`,
              unknown: false,
              bitPosition: createBitPosition(mask),
            }
          }
        }
      } else {
        for (const flag of knownFlags) {
          yield flag
        }

        if (unknownBits !== 0) {
          for (let bit = 0; bit < 31; bit++) {
            const mask = 1 << bit
            if (unknownBits & mask) {
              yield {
                name: `UNKNOWN_BIT_${bit}`,
                value: mask,
                decimal: mask.toString(),
                hexadecimal: `0x${mask.toString(16).toUpperCase()}`,
                binary: `0b${mask.toString(2)}`,
                unknown: true,
                bitPosition: createBitPosition(mask),
              }
            }
          }
        }
      }
    },

    get value() {
      return value
    },

    valueOf() {
      return value
    },

    toString() {
      return value.toString()
    },
  }
}

export function makeBitflag(value: number): Bitflag {
  if (isBitflag(value)) {
    return value
  }
  throw new Error(
    'Value cannot be converted to Bitflag. Possible causes are: value exceeding 31 bits or value being a negative number.'
  )
}

export function isBitflag(value: unknown): value is Bitflag {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 0x7fffffff
}

export function unwrapBitflag(flag: Bitflag): number {
  return flag as unknown as number
}
