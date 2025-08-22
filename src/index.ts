import type { Tagged } from 'type-fest'

export type Bitflag = Tagged<number, 'Bitflag'>

export type Bitflags<T extends Record<string, number>> = {
  readonly [K in keyof T]: Tagged<T[K], 'Bitflag'>
}

interface FlagDescription {
  name: string
  value: number
  decimal: string
  hexadecimal: string
  binary: string
}

interface BitflagOperations {
  has(...flags: Bitflag[]): boolean
  hasAny(...flags: Bitflag[]): boolean
  hasExact(...flags: Bitflag[]): boolean
  add(...flags: Bitflag[]): Bitflag
  remove(...flags: Bitflag[]): Bitflag
  toggle(...flags: Bitflag[]): Bitflag
  clear(): Bitflag
  describe(flagDefinitions?: Record<string, Bitflag>): IterableIterator<FlagDescription>
  value: number
  valueOf(): number
  toString(): string
}

export function defineBitflags<T extends Record<string, number>>(obj: T): Bitflags<T> {
  const frozen = Object.freeze(obj)

  if (process.env['NODE_ENV'] !== 'production') {
    for (const [key, value] of Object.entries(frozen)) {
      if (!Number.isInteger(value) || value < 0 || value > 0x7fffffff) {
        throw new Error(
          `Invalid bitflag value for "${key}": ${value}. Must be a non-negative integer within 31-bit range.`
        )
      }
    }
  }

  return frozen as Bitflags<T>
}

function combineFlags(flags: Bitflag[]): number {
  let result = 0
  for (let i = 0; i < flags.length; i++) {
    result |= flags[i] as unknown as number
  }
  return result
}

export function bitflag(flag: Bitflag | number = 0): BitflagOperations {
  const value = (typeof flag === 'number' ? flag : (flag as unknown as number)) | 0

  return {
    has(...flags: Bitflag[]): boolean {
      if (flags.length === 0) return false
      const combined = combineFlags(flags)
      return (value & combined) === combined
    },

    hasAny(...flags: Bitflag[]): boolean {
      if (flags.length === 0) return false
      const combined = combineFlags(flags)
      return (value & combined) !== 0
    },

    hasExact(...flags: Bitflag[]): boolean {
      if (flags.length === 0) return value === 0
      const combined = combineFlags(flags)
      return value === combined
    },

    add(...flags: Bitflag[]): Bitflag {
      if (flags.length === 0) return value as Bitflag
      const combined = combineFlags(flags)
      return (value | combined) as Bitflag
    },

    remove(...flags: Bitflag[]): Bitflag {
      if (flags.length === 0) return value as Bitflag
      const combined = combineFlags(flags)
      return (value & ~combined) as Bitflag
    },

    toggle(...flags: Bitflag[]): Bitflag {
      if (flags.length === 0) return value as Bitflag
      const combined = combineFlags(flags)
      return (value ^ combined) as Bitflag
    },

    clear(): Bitflag {
      return 0 as Bitflag
    },

    *describe(flagDefinitions?: Record<string, Bitflag>): IterableIterator<FlagDescription> {
      if (value === 0) {
        yield {
          name: 'NONE',
          value: 0,
          decimal: '0',
          hexadecimal: '0x0',
          binary: '0b0',
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
              }
            }
          }
        }
      }
    },

    get value(): number {
      return value
    },

    valueOf(): number {
      return value
    },

    toString(): string {
      return value.toString()
    },
  }
}

export function isBitflag(value: unknown): value is Bitflag {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 0x7fffffff
}

export function unwrapBitflag(flag: Bitflag): number {
  return flag as unknown as number
}
