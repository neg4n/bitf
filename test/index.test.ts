import { describe, expect, it } from 'vitest'
import { bitflag, defineBitflags, isBitflag, unwrapBitflag } from '../src/index'

describe('defineBitflags', () => {
  it('should create a frozen bitflags object', () => {
    const flags = defineBitflags({
      READ: 1 << 0,
      WRITE: 1 << 1,
      EXECUTE: 1 << 2,
    })

    expect(flags.READ).toBe(1)
    expect(flags.WRITE).toBe(2)
    expect(flags.EXECUTE).toBe(4)
    expect(Object.isFrozen(flags)).toBe(true)
  })

  it('should accept combined flags', () => {
    const flags = defineBitflags({
      READ: 1 << 0,
      WRITE: 1 << 1,
      READ_WRITE: (1 << 0) | (1 << 1),
    })

    expect(flags.READ).toBe(1)
    expect(flags.WRITE).toBe(2)
    expect(flags.READ_WRITE).toBe(3)
  })

  it('should handle zero flag', () => {
    const flags = defineBitflags({
      NONE: 0,
      FLAG_A: 1 << 0,
      FLAG_B: 1 << 1,
    })

    expect(flags.NONE).toBe(0)
    expect(flags.FLAG_A).toBe(1)
    expect(flags.FLAG_B).toBe(2)
  })
})

describe('bitflag operations', () => {
  const Permissions = defineBitflags({
    NONE: 0,
    READ: 1 << 0,
    WRITE: 1 << 1,
    EXECUTE: 1 << 2,
    DELETE: 1 << 3,
    ALL: (1 << 0) | (1 << 1) | (1 << 2) | (1 << 3),
  })

  describe('has', () => {
    it('should check if flag has specific permissions', () => {
      const perms = bitflag(Permissions.READ | Permissions.WRITE)

      expect(perms.has(Permissions.READ)).toBe(true)
      expect(perms.has(Permissions.WRITE)).toBe(true)
      expect(perms.has(Permissions.EXECUTE)).toBe(false)
      expect(perms.has(Permissions.DELETE)).toBe(false)
    })

    it('should check multiple flags at once', () => {
      const perms = bitflag(Permissions.READ | Permissions.WRITE | Permissions.EXECUTE)

      expect(perms.has(Permissions.READ, Permissions.WRITE)).toBe(true)
      expect(perms.has(Permissions.READ, Permissions.EXECUTE)).toBe(true)
      expect(perms.has(Permissions.READ, Permissions.DELETE)).toBe(false)
      expect(perms.has(Permissions.WRITE, Permissions.DELETE)).toBe(false)
    })

    it('should return false for empty arguments', () => {
      const perms = bitflag(Permissions.READ)
      expect(perms.has()).toBe(false)
    })
  })

  describe('hasAny', () => {
    it('should check if flag has any of the specified permissions', () => {
      const perms = bitflag(Permissions.READ | Permissions.WRITE)

      expect(perms.hasAny(Permissions.READ)).toBe(true)
      expect(perms.hasAny(Permissions.EXECUTE)).toBe(false)
      expect(perms.hasAny(Permissions.READ, Permissions.EXECUTE)).toBe(true)
      expect(perms.hasAny(Permissions.EXECUTE, Permissions.DELETE)).toBe(false)
    })

    it('should return false for empty arguments', () => {
      const perms = bitflag(Permissions.READ)
      expect(perms.hasAny()).toBe(false)
    })
  })

  describe('hasExact', () => {
    it('should check if flags match exactly', () => {
      const perms = bitflag(Permissions.READ | Permissions.WRITE)

      expect(perms.hasExact(Permissions.READ, Permissions.WRITE)).toBe(true)
      expect(perms.hasExact(Permissions.READ)).toBe(false)
      expect(perms.hasExact(Permissions.READ, Permissions.WRITE, Permissions.EXECUTE)).toBe(false)
    })

    it('should handle zero flags', () => {
      const noPerms = bitflag(Permissions.NONE)
      expect(noPerms.hasExact()).toBe(true)
      expect(noPerms.hasExact(Permissions.READ)).toBe(false)

      const somePerms = bitflag(Permissions.READ)
      expect(somePerms.hasExact()).toBe(false)
    })
  })

  describe('add', () => {
    it('should add single flag', () => {
      const perms = bitflag(Permissions.READ)
      const updated = bitflag(perms.add(Permissions.WRITE))

      expect(updated.has(Permissions.READ)).toBe(true)
      expect(updated.has(Permissions.WRITE)).toBe(true)
      expect(updated.has(Permissions.EXECUTE)).toBe(false)
    })

    it('should add multiple flags', () => {
      const perms = bitflag(Permissions.READ)
      const updated = bitflag(perms.add(Permissions.WRITE, Permissions.EXECUTE))

      expect(updated.has(Permissions.READ, Permissions.WRITE, Permissions.EXECUTE)).toBe(true)
      expect(updated.has(Permissions.DELETE)).toBe(false)
    })

    it('should be idempotent', () => {
      const perms = bitflag(Permissions.READ | Permissions.WRITE)
      const updated = bitflag(perms.add(Permissions.READ))

      expect(updated.value).toBe(perms.value)
    })

    it('should return same value with no arguments', () => {
      const perms = bitflag(Permissions.READ)
      const updated = bitflag(perms.add())
      expect(updated.value).toBe(perms.value)
    })
  })

  describe('remove', () => {
    it('should remove single flag', () => {
      const perms = bitflag(Permissions.READ | Permissions.WRITE)
      const updated = bitflag(perms.remove(Permissions.WRITE))

      expect(updated.has(Permissions.READ)).toBe(true)
      expect(updated.has(Permissions.WRITE)).toBe(false)
    })

    it('should remove multiple flags', () => {
      const perms = bitflag(Permissions.ALL)
      const updated = bitflag(perms.remove(Permissions.WRITE, Permissions.DELETE))

      expect(updated.has(Permissions.READ)).toBe(true)
      expect(updated.has(Permissions.EXECUTE)).toBe(true)
      expect(updated.has(Permissions.WRITE)).toBe(false)
      expect(updated.has(Permissions.DELETE)).toBe(false)
    })

    it('should handle removing non-existent flag', () => {
      const perms = bitflag(Permissions.READ)
      const updated = bitflag(perms.remove(Permissions.WRITE))

      expect(updated.value).toBe(perms.value)
    })

    it('should return same value with no arguments', () => {
      const perms = bitflag(Permissions.READ)
      const updated = bitflag(perms.remove())
      expect(updated.value).toBe(perms.value)
    })
  })

  describe('toggle', () => {
    it('should toggle single flag', () => {
      const perms = bitflag(Permissions.READ)
      const toggled = bitflag(perms.toggle(Permissions.WRITE))

      expect(toggled.has(Permissions.READ)).toBe(true)
      expect(toggled.has(Permissions.WRITE)).toBe(true)

      const toggledAgain = bitflag(toggled.toggle(Permissions.WRITE))
      expect(toggledAgain.has(Permissions.READ)).toBe(true)
      expect(toggledAgain.has(Permissions.WRITE)).toBe(false)
    })

    it('should toggle multiple flags', () => {
      const perms = bitflag(Permissions.READ | Permissions.EXECUTE)
      const toggled = bitflag(perms.toggle(Permissions.WRITE, Permissions.EXECUTE))

      expect(toggled.has(Permissions.READ)).toBe(true)
      expect(toggled.has(Permissions.WRITE)).toBe(true)
      expect(toggled.has(Permissions.EXECUTE)).toBe(false)
    })

    it('should return same value with no arguments', () => {
      const perms = bitflag(Permissions.READ)
      const toggled = bitflag(perms.toggle())
      expect(toggled.value).toBe(perms.value)
    })
  })

  describe('clear', () => {
    it('should clear all flags', () => {
      const perms = bitflag(Permissions.ALL)
      const cleared = bitflag(perms.clear())

      expect(cleared.value).toBe(0)
      expect(cleared.has(Permissions.READ)).toBe(false)
      expect(cleared.has(Permissions.WRITE)).toBe(false)
      expect(cleared.has(Permissions.EXECUTE)).toBe(false)
      expect(cleared.has(Permissions.DELETE)).toBe(false)
    })
  })

  describe('describe', () => {
    it('should describe flags with definitions', () => {
      const perms = bitflag(Permissions.READ | Permissions.WRITE)
      const descriptions = [...perms.describe(Permissions)]

      expect(descriptions).toHaveLength(2)
      expect(descriptions.find(d => d.name === 'READ')).toBeDefined()
      expect(descriptions.find(d => d.name === 'WRITE')).toBeDefined()

      const readDesc = descriptions.find(d => d.name === 'READ')
      expect(readDesc).toBeDefined()
      expect(readDesc?.value).toBe(1)
      expect(readDesc?.decimal).toBe('1')
      expect(readDesc?.hexadecimal).toBe('0x1')
      expect(readDesc?.binary).toBe('0b1')
      expect(readDesc?.unknown).toBe(false)
      expect(readDesc?.bitPosition.exact).toBe(0)
    })

    it('should describe unknown flags', () => {
      const unknownFlag = bitflag(1 << 10)
      const descriptions = [...unknownFlag.describe(Permissions)]

      expect(descriptions).toHaveLength(1)
      expect(descriptions[0]?.name).toBe('UNKNOWN_BIT_10')
      expect(descriptions[0]?.value).toBe(1024)
    })

    it('should describe flags without definitions', () => {
      const perms = bitflag((1 << 0) | (1 << 2) | (1 << 5))
      const descriptions = [...perms.describe()]

      expect(descriptions).toHaveLength(3)
      expect(descriptions.find(d => d.name === 'BIT_0')).toBeDefined()
      expect(descriptions.find(d => d.name === 'BIT_2')).toBeDefined()
      expect(descriptions.find(d => d.name === 'BIT_5')).toBeDefined()
    })

    it('should describe zero flag', () => {
      const noPerms = bitflag(Permissions.NONE)
      const descriptions = [...noPerms.describe()]

      expect(descriptions).toHaveLength(1)
      expect(descriptions[0]?.name).toBe('NONE')
      expect(descriptions[0]?.value).toBe(0)
      expect(descriptions[0]?.unknown).toBe(false)
      expect(descriptions[0]?.bitPosition.exact).toBe(-1)
      expect(descriptions[0]?.bitPosition.remaining).toBe(31)
      expect(descriptions[0]?.bitPosition.visual).toBe('(0)0000000000000000000000000000000')
    })

    it('should be iterable', () => {
      const perms = bitflag(Permissions.READ | Permissions.WRITE)
      const names: string[] = []

      for (const desc of perms.describe(Permissions)) {
        names.push(desc.name)
      }

      expect(names).toContain('READ')
      expect(names).toContain('WRITE')
    })
  })

  describe('bitPosition and unknown properties', () => {
    it('should provide correct bit position information for single bits', () => {
      const flags = defineBitflags({
        BIT_0: 1 << 0,
        BIT_1: 1 << 1,
        BIT_15: 1 << 15,
        BIT_30: 1 << 30,
      })

      const bit0 = bitflag(flags.BIT_0)
      const descriptions0 = [...bit0.describe(flags)]
      expect(descriptions0[0]?.bitPosition.exact).toBe(0)
      expect(descriptions0[0]?.bitPosition.remaining).toBe(31)
      expect(descriptions0[0]?.bitPosition.visual).toBe('(0)000000000000000000000000000000[1]')
      expect(descriptions0[0]?.unknown).toBe(false)

      const bit1 = bitflag(flags.BIT_1)
      const descriptions1 = [...bit1.describe(flags)]
      expect(descriptions1[0]?.bitPosition.exact).toBe(1)
      expect(descriptions1[0]?.bitPosition.remaining).toBe(30)
      expect(descriptions1[0]?.bitPosition.visual).toBe('(0)00000000000000000000000000000[1]0')
      expect(descriptions1[0]?.unknown).toBe(false)

      const bit15 = bitflag(flags.BIT_15)
      const descriptions15 = [...bit15.describe(flags)]
      expect(descriptions15[0]?.bitPosition.exact).toBe(15)
      expect(descriptions15[0]?.bitPosition.remaining).toBe(16)
      expect(descriptions15[0]?.bitPosition.visual).toBe('(0)000000000000000[1]000000000000000')
      expect(descriptions15[0]?.unknown).toBe(false)

      const bit30 = bitflag(flags.BIT_30)
      const descriptions30 = [...bit30.describe(flags)]
      expect(descriptions30[0]?.bitPosition.exact).toBe(30)
      expect(descriptions30[0]?.bitPosition.remaining).toBe(1)
      expect(descriptions30[0]?.bitPosition.visual).toBe('(0)[1]000000000000000000000000000000')
      expect(descriptions30[0]?.unknown).toBe(false)
    })

    it('should handle unknown flags correctly', () => {
      const flags = defineBitflags({
        KNOWN: 1 << 0,
      })

      const unknownFlag = bitflag((1 << 5) | (1 << 10))
      const descriptions = [...unknownFlag.describe(flags)]

      expect(descriptions).toHaveLength(2)

      const bit5Desc = descriptions.find(d => d.name === 'UNKNOWN_BIT_5')
      expect(bit5Desc?.unknown).toBe(true)
      expect(bit5Desc?.bitPosition.exact).toBe(5)
      expect(bit5Desc?.bitPosition.remaining).toBe(26)
      expect(bit5Desc?.bitPosition.visual).toBe('(0)0000000000000000000000000[1]00000')

      const bit10Desc = descriptions.find(d => d.name === 'UNKNOWN_BIT_10')
      expect(bit10Desc?.unknown).toBe(true)
      expect(bit10Desc?.bitPosition.exact).toBe(10)
      expect(bit10Desc?.bitPosition.remaining).toBe(21)
      expect(bit10Desc?.bitPosition.visual).toBe('(0)00000000000000000000[1]0000000000')
    })

    it('should handle multiple bits in combined flags', () => {
      const flags = defineBitflags({
        COMBINED: (1 << 2) | (1 << 7) | (1 << 20),
      })

      const combined = bitflag(flags.COMBINED)
      const descriptions = [...combined.describe(flags)]

      expect(descriptions).toHaveLength(1)
      expect(descriptions[0]?.name).toBe('COMBINED')
      expect(descriptions[0]?.unknown).toBe(false)
      expect(descriptions[0]?.bitPosition.exact).toBe(20)
      expect(descriptions[0]?.bitPosition.remaining).toBe(11)
      expect(descriptions[0]?.bitPosition.visual).toBe('(0)0000000000[1]000000000000[1]0000[1]00')
    })

    it('should handle mixed known and unknown flags', () => {
      const flags = defineBitflags({
        KNOWN_A: 1 << 3,
        KNOWN_B: 1 << 8,
      })

      const mixed = bitflag((1 << 3) | (1 << 8) | (1 << 15) | (1 << 25))
      const descriptions = [...mixed.describe(flags)]

      expect(descriptions).toHaveLength(4)

      const knownA = descriptions.find(d => d.name === 'KNOWN_A')
      expect(knownA?.unknown).toBe(false)
      expect(knownA?.bitPosition.exact).toBe(3)

      const knownB = descriptions.find(d => d.name === 'KNOWN_B')
      expect(knownB?.unknown).toBe(false)
      expect(knownB?.bitPosition.exact).toBe(8)

      const unknown15 = descriptions.find(d => d.name === 'UNKNOWN_BIT_15')
      expect(unknown15?.unknown).toBe(true)
      expect(unknown15?.bitPosition.exact).toBe(15)

      const unknown25 = descriptions.find(d => d.name === 'UNKNOWN_BIT_25')
      expect(unknown25?.unknown).toBe(true)
      expect(unknown25?.bitPosition.exact).toBe(25)
    })

    it('should handle describe without definitions correctly', () => {
      const mixed = bitflag((1 << 0) | (1 << 10) | (1 << 29))
      const descriptions = [...mixed.describe()]

      expect(descriptions).toHaveLength(3)

      const bit0 = descriptions.find(d => d.name === 'BIT_0')
      expect(bit0?.unknown).toBe(false)
      expect(bit0?.bitPosition.exact).toBe(0)
      expect(bit0?.bitPosition.visual).toBe('(0)000000000000000000000000000000[1]')

      const bit10 = descriptions.find(d => d.name === 'BIT_10')
      expect(bit10?.unknown).toBe(false)
      expect(bit10?.bitPosition.exact).toBe(10)

      const bit29 = descriptions.find(d => d.name === 'BIT_29')
      expect(bit29?.unknown).toBe(false)
      expect(bit29?.bitPosition.exact).toBe(29)
      expect(bit29?.bitPosition.visual).toBe('(0)0[1]00000000000000000000000000000')
    })

    it('should handle edge case with maximum value', () => {
      const flags = defineBitflags({
        MAX_VALUE: 0x7fffffff,
      })

      const maxFlag = bitflag(flags.MAX_VALUE)
      const descriptions = [...maxFlag.describe(flags)]

      expect(descriptions).toHaveLength(1)
      expect(descriptions[0]?.name).toBe('MAX_VALUE')
      expect(descriptions[0]?.unknown).toBe(false)
      expect(descriptions[0]?.bitPosition.exact).toBe(30)
      expect(descriptions[0]?.bitPosition.remaining).toBe(1)
      expect(descriptions[0]?.bitPosition.visual).toBe(
        '(0)[1][1][1][1][1][1][1][1][1][1][1][1][1][1][1][1][1][1][1][1][1][1][1][1][1][1][1][1][1][1][1]'
      )
    })

    it('should handle bitflag parameters with non-number type path', () => {
      const flags = defineBitflags({
        TEST: 5,
      })

      const result = bitflag(flags.TEST as Bitflag)
      expect(result.value).toBe(5)
      expect(result.has(flags.TEST)).toBe(true)
    })
  })

  describe('value properties', () => {
    it('should expose numeric value', () => {
      const perms = bitflag(Permissions.READ | Permissions.WRITE)

      expect(perms.value).toBe(3)
      expect(perms.valueOf()).toBe(3)
      expect(perms.toString()).toBe('3')
    })

    it('should handle default zero value', () => {
      const perms = bitflag()

      expect(perms.value).toBe(0)
      expect(perms.valueOf()).toBe(0)
      expect(perms.toString()).toBe('0')
    })

    it('should handle bitflag input instead of number', () => {
      const flags = defineBitflags({
        READ: 1 << 0,
        WRITE: 1 << 1,
      })

      const original = bitflag(flags.READ)
      const fromBitflag = bitflag(flags.READ)

      expect(fromBitflag.value).toBe(1)
      expect(fromBitflag.has(flags.READ)).toBe(true)
      expect(fromBitflag.valueOf()).toBe(original.valueOf())
    })

    it('should handle non-number bitflag values', () => {
      const flags = defineBitflags({
        TEST: 5,
      })

      const bf1 = bitflag(5)
      const bf2 = bitflag(bf1.add(flags.TEST))

      expect(bf2.value).toBe(5)
      expect(bf2.has(flags.TEST)).toBe(true)
    })
  })
})

describe('utility functions', () => {
  describe('isBitflag', () => {
    it('should validate valid bitflags', () => {
      expect(isBitflag(0)).toBe(true)
      expect(isBitflag(1)).toBe(true)
      expect(isBitflag(255)).toBe(true)
      expect(isBitflag(0x7fffffff)).toBe(true)
    })

    it('should reject invalid values', () => {
      expect(isBitflag(-1)).toBe(false)
      expect(isBitflag(1.5)).toBe(false)
      expect(isBitflag(0x80000000)).toBe(false)
      expect(isBitflag('1')).toBe(false)
      expect(isBitflag(null)).toBe(false)
      expect(isBitflag(undefined)).toBe(false)
      expect(isBitflag({})).toBe(false)
    })
  })

  describe('unwrapBitflag', () => {
    it('should unwrap bitflag to number', () => {
      const flags = defineBitflags({
        FLAG_A: 1 << 0,
        FLAG_B: 1 << 1,
      })

      expect(unwrapBitflag(flags.FLAG_A)).toBe(1)
      expect(unwrapBitflag(flags.FLAG_B)).toBe(2)

      const combined = bitflag(flags.FLAG_A).add(flags.FLAG_B)
      expect(unwrapBitflag(combined)).toBe(3)
    })
  })
})

describe('defineBitflags error handling', () => {
  it('should throw error for non-integer values', () => {
    expect(() => {
      defineBitflags({
        INVALID: 1.5,
      })
    }).toThrow(
      'Invalid bitflag value for "INVALID": 1.5. Must be a non-negative integer within 31-bit range.'
    )

    expect(() => {
      defineBitflags({
        NAN_VALUE: NaN,
      })
    }).toThrow(
      'Invalid bitflag value for "NAN_VALUE": NaN. Must be a non-negative integer within 31-bit range.'
    )

    expect(() => {
      defineBitflags({
        INFINITY: Infinity,
      })
    }).toThrow(
      'Invalid bitflag value for "INFINITY": Infinity. Must be a non-negative integer within 31-bit range.'
    )
  })

  it('should throw error for negative values', () => {
    expect(() => {
      defineBitflags({
        NEGATIVE: -1,
      })
    }).toThrow(
      'Invalid bitflag value for "NEGATIVE": -1. Must be a non-negative integer within 31-bit range.'
    )
  })

  it('should throw error for values exceeding 31-bit range', () => {
    expect(() => {
      defineBitflags({
        TOO_LARGE: 0x80000000,
      })
    }).toThrow(
      'Invalid bitflag value for "TOO_LARGE": 2147483648. Must be a non-negative integer within 31-bit range.'
    )

    expect(() => {
      defineBitflags({
        WAY_TOO_LARGE: 0xffffffff,
      })
    }).toThrow(
      'Invalid bitflag value for "WAY_TOO_LARGE": 4294967295. Must be a non-negative integer within 31-bit range.'
    )
  })
})

describe('complex real-world scenarios', () => {
  it('should handle permission cascading', () => {
    const Permissions = defineBitflags({
      NONE: 0,
      READ: 1 << 0,
      WRITE: 1 << 1,
      EXECUTE: 1 << 2,
      DELETE: 1 << 3,
      ADMIN: 1 << 4,
      SUPER_ADMIN: (1 << 0) | (1 << 1) | (1 << 2) | (1 << 3) | (1 << 4),
      EDITOR: (1 << 0) | (1 << 1),
      VIEWER: 1 << 0,
    })

    const superAdmin = bitflag(Permissions.SUPER_ADMIN)
    expect(
      superAdmin.has(
        Permissions.READ,
        Permissions.WRITE,
        Permissions.EXECUTE,
        Permissions.DELETE,
        Permissions.ADMIN
      )
    ).toBe(true)
    expect(superAdmin.hasAny(Permissions.EDITOR)).toBe(true)
    expect(superAdmin.hasAny(Permissions.VIEWER)).toBe(true)

    const editor = bitflag(Permissions.EDITOR)
    expect(editor.has(Permissions.READ, Permissions.WRITE)).toBe(true)
    expect(editor.has(Permissions.EXECUTE)).toBe(false)
    expect(editor.hasAny(Permissions.DELETE, Permissions.ADMIN)).toBe(false)
  })

  it('should handle state machine transitions', () => {
    const States = defineBitflags({
      IDLE: 0,
      LOADING: 1 << 0,
      SUCCESS: 1 << 1,
      ERROR: 1 << 2,
      RETRY: 1 << 3,
      CACHED: 1 << 4,
      LOADING_WITH_CACHE: (1 << 0) | (1 << 4),
      ERROR_WITH_RETRY: (1 << 2) | (1 << 3),
    })

    let currentState = bitflag(States.IDLE)

    currentState = bitflag(currentState.add(States.LOADING))
    expect(currentState.has(States.LOADING)).toBe(true)
    expect(currentState.hasExact(States.LOADING)).toBe(true)

    const removedLoading = bitflag(currentState.remove(States.LOADING))
    currentState = bitflag(removedLoading.add(States.SUCCESS, States.CACHED))
    expect(currentState.has(States.SUCCESS, States.CACHED)).toBe(true)
    expect(currentState.has(States.LOADING)).toBe(false)

    const clearedState = bitflag(currentState.clear())
    currentState = bitflag(clearedState.add(States.LOADING_WITH_CACHE))
    expect(currentState.has(States.LOADING, States.CACHED)).toBe(true)
  })

  it('should handle feature flag combinations', () => {
    const Features = defineBitflags({
      NONE: 0,
      DARK_MODE: 1 << 0,
      NOTIFICATIONS: 1 << 1,
      PREMIUM: 1 << 2,
      BETA: 1 << 3,
      ANALYTICS: 1 << 4,
      PREMIUM_ONLY: (1 << 0) | (1 << 1) | (1 << 4),
      BETA_FEATURES: (1 << 3) | (1 << 4),
    })

    const userFeatures = bitflag(Features.DARK_MODE | Features.NOTIFICATIONS)
    const premiumUpgrade = bitflag(userFeatures.add(Features.PREMIUM, Features.ANALYTICS))

    expect(premiumUpgrade.has(Features.PREMIUM_ONLY)).toBe(true)
    expect(premiumUpgrade.hasAny(Features.BETA_FEATURES)).toBe(true)
    expect(premiumUpgrade.has(Features.BETA)).toBe(false)

    const betaUser = bitflag(premiumUpgrade.toggle(Features.BETA))
    expect(betaUser.has(Features.BETA_FEATURES)).toBe(true)
    expect(betaUser.hasExact(Features.BETA_FEATURES)).toBe(false)
  })

  it('should handle audit logging scenarios', () => {
    const Actions = defineBitflags({
      NONE: 0,
      CREATE: 1 << 0,
      READ: 1 << 1,
      UPDATE: 1 << 2,
      DELETE: 1 << 3,
      ADMIN_ACTION: 1 << 4,
      BULK_OPERATION: 1 << 5,
      CRITICAL: (1 << 3) | (1 << 4),
      MODIFICATION: (1 << 0) | (1 << 2) | (1 << 3) | (1 << 5),
    })

    const userAction = bitflag(Actions.UPDATE | Actions.BULK_OPERATION)
    expect(userAction.hasAny(Actions.MODIFICATION)).toBe(true)
    expect(userAction.has(Actions.CRITICAL)).toBe(false)

    const adminAction = bitflag(Actions.DELETE | Actions.ADMIN_ACTION)
    expect(adminAction.hasExact(Actions.CRITICAL)).toBe(true)
    expect(adminAction.hasAny(Actions.MODIFICATION)).toBe(true)

    const logEntry = [...adminAction.describe(Actions)]
    expect(logEntry.length).toBe(3)
    expect(logEntry.find(entry => entry.name === 'DELETE')).toBeDefined()
    expect(logEntry.find(entry => entry.name === 'ADMIN_ACTION')).toBeDefined()
    expect(logEntry.find(entry => entry.name === 'CRITICAL')).toBeDefined()
  })
})

describe('32-bit boundary and edge cases', () => {
  it('should handle exact 32-bit boundaries', () => {
    const flags = defineBitflags({
      BIT_0: 1 << 0,
      BIT_15: 1 << 15,
      BIT_30: 1 << 30,
      MAX_VALUE: 0x7fffffff,
    })

    const bf30 = bitflag(flags.BIT_30)
    expect(bf30.value).toBe(1073741824)
    expect(bf30.toString()).toBe('1073741824')
    expect(bf30.valueOf()).toBe(1073741824)

    const maxBf = bitflag(flags.MAX_VALUE)
    expect(maxBf.value).toBe(0x7fffffff)
    expect(maxBf.has(flags.BIT_0, flags.BIT_15, flags.BIT_30)).toBe(true)
  })

  it('should handle all zeros edge cases', () => {
    const flags = defineBitflags({
      ZERO: 0,
      ONE: 1,
      TWO: 2,
    })

    const zeroFlag = bitflag(flags.ZERO)
    expect(zeroFlag.hasExact()).toBe(true)
    expect(zeroFlag.has()).toBe(false)
    expect(zeroFlag.hasAny()).toBe(false)
    expect(bitflag(zeroFlag.add()).value).toBe(0)
    expect(bitflag(zeroFlag.remove()).value).toBe(0)
    expect(bitflag(zeroFlag.toggle()).value).toBe(0)

    const addedToZero = bitflag(zeroFlag.add(flags.ONE, flags.TWO))
    expect(addedToZero.value).toBe(3)
    expect(addedToZero.has(flags.ONE, flags.TWO)).toBe(true)
  })

  it('should handle all-bits-set scenarios', () => {
    const allBits = 0x7fffffff
    const maxFlags = defineBitflags({
      ALL_BITS: allBits,
      SINGLE: 1,
    })

    const bf = bitflag(maxFlags.ALL_BITS)
    expect(bf.value).toBe(allBits)

    const removed = bitflag(bf.remove(maxFlags.SINGLE))
    expect(removed.value).toBe(allBits & ~1)
    expect(removed.has(maxFlags.SINGLE)).toBe(false)

    const toggled = bitflag(removed.toggle(maxFlags.SINGLE))
    expect(toggled.value).toBe(allBits)
    expect(toggled.hasExact(maxFlags.ALL_BITS)).toBe(true)
  })

  it('should handle mixed flag sources', () => {
    const Flags1 = defineBitflags({
      A: 1 << 0,
      B: 1 << 1,
    })

    const Flags2 = defineBitflags({
      C: 1 << 2,
      D: 1 << 3,
    })

    const mixed = bitflag(Flags1.A | Flags1.B | Flags2.C)
    expect(mixed.value).toBe(7)
    expect(mixed.has(Flags1.A, Flags1.B)).toBe(true)
    expect(mixed.has(Flags2.C)).toBe(true)
    expect(mixed.has(Flags2.D)).toBe(false)

    const descriptions1 = [...mixed.describe(Flags1)]
    expect(descriptions1.length).toBe(3)
    expect(descriptions1.find(d => d.name === 'A')).toBeDefined()
    expect(descriptions1.find(d => d.name === 'B')).toBeDefined()
    expect(descriptions1.find(d => d.name === 'UNKNOWN_BIT_2')).toBeDefined()
  })
})

describe('production reliability tests', () => {
  it('should maintain immutability across operations', () => {
    const flags = defineBitflags({
      READ: 1 << 0,
      WRITE: 1 << 1,
    })

    const original = bitflag(flags.READ)
    const originalValue = original.value

    const added = bitflag(original.add(flags.WRITE))
    const removed = bitflag(original.remove(flags.READ))
    const toggled = bitflag(original.toggle(flags.WRITE))
    const cleared = bitflag(original.clear())

    expect(original.value).toBe(originalValue)
    expect(added.value).not.toBe(original.value)
    expect(removed.value).not.toBe(original.value)
    expect(toggled.value).not.toBe(original.value)
    expect(cleared.value).not.toBe(original.value)
  })

  it('should maintain consistency across multiple operations', () => {
    const flags = defineBitflags({
      A: 1,
      B: 2,
      C: 4,
      D: 8,
    })

    for (let i = 0; i < 100; i++) {
      const bf = bitflag(flags.A | flags.C)
      expect(bf.value).toBe(5)
      expect(bf.has(flags.A, flags.C)).toBe(true)
      expect(bf.has(flags.B, flags.D)).toBe(false)
    }
  })

  it('should handle iterator multiple times without side effects', () => {
    const flags = defineBitflags({
      X: 1 << 0,
      Y: 1 << 1,
      Z: 1 << 2,
    })

    const bf = bitflag(flags.X | flags.Y | flags.Z)

    const firstRun = [...bf.describe(flags)]
    const secondRun = [...bf.describe(flags)]
    const thirdRun = [...bf.describe(flags)]

    expect(firstRun.length).toBe(3)
    expect(secondRun.length).toBe(3)
    expect(thirdRun.length).toBe(3)

    for (let i = 0; i < firstRun.length; i++) {
      expect(firstRun[i]?.name).toBe(secondRun[i]?.name)
      expect(secondRun[i]?.name).toBe(thirdRun[i]?.name)
      expect(firstRun[i]?.value).toBe(secondRun[i]?.value)
      expect(secondRun[i]?.value).toBe(thirdRun[i]?.value)
    }
  })

  it('should handle large-scale flag operations efficiently', () => {
    const flags = defineBitflags({
      BIT_0: 1 << 0,
      BIT_5: 1 << 5,
      BIT_10: 1 << 10,
      BIT_15: 1 << 15,
      BIT_20: 1 << 20,
      BIT_25: 1 << 25,
      BIT_30: 1 << 30,
    })

    let bf = bitflag()
    const startTime = Date.now()

    for (let i = 0; i < 1000; i++) {
      bf = bitflag(bf.add(flags.BIT_0))
      bf = bitflag(bf.toggle(flags.BIT_5))
      bf = bitflag(bf.remove(flags.BIT_10))
      bf = bitflag(bf.add(flags.BIT_15, flags.BIT_20))
      bf = bitflag(bf.toggle(flags.BIT_25, flags.BIT_30))
    }

    const endTime = Date.now()
    expect(endTime - startTime).toBeLessThan(100)
    expect(bf.has(flags.BIT_0)).toBe(true)
  })

  it('should handle concurrent-style operations correctly', () => {
    const flags = defineBitflags({
      TASK_A: 1 << 0,
      TASK_B: 1 << 1,
      TASK_C: 1 << 2,
      RUNNING: 1 << 10,
      COMPLETED: 1 << 11,
      ERROR: 1 << 12,
    })

    const initialState = bitflag()

    const task1 = bitflag(initialState.add(flags.TASK_A, flags.RUNNING))
    const task2 = bitflag(task1.add(flags.TASK_B))
    const removedRunning = bitflag(task2.remove(flags.RUNNING))
    const task3 = bitflag(removedRunning.add(flags.COMPLETED))
    const task4 = bitflag(task3.add(flags.TASK_C))
    const task5 = bitflag(task4.toggle(flags.ERROR))

    expect(task5.has(flags.TASK_A, flags.TASK_B, flags.TASK_C)).toBe(true)
    expect(task5.has(flags.COMPLETED, flags.ERROR)).toBe(true)
    expect(task5.has(flags.RUNNING)).toBe(false)

    const finalDescriptions = [...task5.describe(flags)]
    expect(finalDescriptions.length).toBe(5)
  })
})

describe('edge cases and performance', () => {
  it('should handle maximum 31-bit value', () => {
    const maxFlag = 0x7fffffff
    const flags = defineBitflags({
      MAX: maxFlag,
    })

    const bf = bitflag(flags.MAX)
    expect(bf.value).toBe(maxFlag)
    expect(bf.has(flags.MAX)).toBe(true)
  })

  it('should optimize for SMI representation', () => {
    const flags = defineBitflags({
      BIT_30: 1 << 30,
    })

    const bf = bitflag(flags.BIT_30)
    expect(bf.value).toBe(1073741824)
    expect(bf.has(flags.BIT_30)).toBe(true)
  })

  it('should handle complex flag combinations', () => {
    const Flags = defineBitflags({
      A: 1 << 0,
      B: 1 << 1,
      C: 1 << 2,
      D: 1 << 3,
      E: 1 << 4,
      GROUP_ABC: (1 << 0) | (1 << 1) | (1 << 2),
      GROUP_DE: (1 << 3) | (1 << 4),
    })

    const bf = bitflag(Flags.GROUP_ABC)
    expect(bf.has(Flags.A, Flags.B, Flags.C)).toBe(true)
    expect(bf.has(Flags.D)).toBe(false)
    expect(bf.hasAny(Flags.GROUP_DE)).toBe(false)

    const updated = bitflag(bf.add(Flags.GROUP_DE))
    expect(updated.has(Flags.GROUP_ABC)).toBe(true)
    expect(updated.has(Flags.GROUP_DE)).toBe(true)
  })
})
