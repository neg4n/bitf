export type JsonFlags = {
  flags: Set<string>
  metadata?: Record<string, any>
}

export type JsonFlagOperations = {
  has(...flags: string[]): boolean
  hasAny(...flags: string[]): boolean
  hasExact(...flags: string[]): boolean
  add(...flags: string[]): JsonFlags
  remove(...flags: string[]): JsonFlags
  toggle(...flags: string[]): JsonFlags
  clear(): JsonFlags
  value: JsonFlags
  valueOf(): JsonFlags
  toString(): string
}

export function bitToFlagName(bit: number): string {
  return `feature_flag_${bit}`
}

export function numberToJsonFlags(value: number): JsonFlags {
  const flagsArray: string[] = []

  for (let bit = 0; bit < 31; bit++) {
    const mask = 1 << bit
    if (value & mask) {
      flagsArray.push(bitToFlagName(bit))
    }
  }

  return {
    flags: new Set(flagsArray),
    metadata: {
      createdAt: Date.now(),
      version: '1.0.0',
    },
  }
}

export function jsonFlag(initialValue: number = 0): JsonFlagOperations {
  let state = numberToJsonFlags(initialValue)

  return {
    has(...flagNames: string[]): boolean {
      if (!flagNames || flagNames.length === 0) {
        return false
      }

      return flagNames.every(flag => {
        if (typeof flag !== 'string') {
          return false
        }
        return state.flags.has(flag)
      })
    },

    hasAny(...flagNames: string[]): boolean {
      if (!flagNames || flagNames.length === 0) {
        return false
      }

      return flagNames.some(flag => {
        if (typeof flag !== 'string') {
          return false
        }
        return state.flags.has(flag)
      })
    },

    hasExact(...flagNames: string[]): boolean {
      const currentFlags = Array.from(state.flags)

      if (flagNames.length === 0) {
        return currentFlags.length === 0
      }

      if (currentFlags.length !== flagNames.length) {
        return false
      }

      const targetSet = new Set(flagNames)
      return currentFlags.every(flag => targetSet.has(flag))
    },

    add(...flagNames: string[]): JsonFlags {
      const newFlags = new Set(state.flags)

      flagNames.forEach(flag => {
        if (typeof flag === 'string') {
          newFlags.add(flag)
        }
      })

      state = {
        flags: newFlags,
        metadata: {
          ...state.metadata,
          lastModified: Date.now(),
        },
      }

      return {
        flags: new Set(newFlags),
        metadata: { ...state.metadata },
      }
    },

    remove(...flagNames: string[]): JsonFlags {
      const newFlags = new Set(state.flags)

      flagNames.forEach(flag => {
        if (typeof flag === 'string') {
          newFlags.delete(flag)
        }
      })

      state = {
        flags: newFlags,
        metadata: {
          ...state.metadata,
          lastModified: Date.now(),
        },
      }

      return {
        flags: new Set(newFlags),
        metadata: { ...state.metadata },
      }
    },

    toggle(...flagNames: string[]): JsonFlags {
      const newFlags = new Set(state.flags)

      flagNames.forEach(flag => {
        if (typeof flag === 'string') {
          if (newFlags.has(flag)) {
            newFlags.delete(flag)
          } else {
            newFlags.add(flag)
          }
        }
      })

      state = {
        flags: newFlags,
        metadata: {
          ...state.metadata,
          lastModified: Date.now(),
          toggleCount: (state.metadata?.toggleCount || 0) + 1,
        },
      }

      return {
        flags: new Set(newFlags),
        metadata: { ...state.metadata },
      }
    },

    clear(): JsonFlags {
      state = {
        flags: new Set(),
        metadata: {
          ...state.metadata,
          clearedAt: Date.now(),
        },
      }

      return {
        flags: new Set(),
        metadata: { ...state.metadata },
      }
    },

    get value(): JsonFlags {
      return {
        flags: new Set(state.flags),
        metadata: { ...state.metadata },
      }
    },

    valueOf(): JsonFlags {
      const flagsArray = Array.from(state.flags)
      return {
        flags: new Set(flagsArray),
        metadata: JSON.parse(JSON.stringify(state.metadata)),
      }
    },

    toString(): string {
      return JSON.stringify(
        {
          flags: Array.from(state.flags),
          metadata: state.metadata,
        },
        null,
        2
      )
    },
  }
}

export function defineJsonFlags(bitflags: Record<string, number>): Record<string, string> {
  const jsonFlags: Record<string, string> = {}

  Object.entries(bitflags).forEach(([key, value]) => {
    if (key === 'NONE') {
      jsonFlags[key] = 'NONE_FLAG'
    } else if (key === 'ALL') {
      jsonFlags[key] = 'ALL_FLAGS'
    } else if (key.startsWith('GROUP_')) {
      jsonFlags[key] = `group_${key.toLowerCase()}`
    } else {
      const bitPos = Math.log2(value)
      if (Number.isInteger(bitPos) && bitPos >= 0 && bitPos < 31) {
        jsonFlags[key] = bitToFlagName(bitPos)
      } else {
        jsonFlags[key] = `composite_${key.toLowerCase()}`
      }
    }
  })

  return Object.freeze(jsonFlags)
}
