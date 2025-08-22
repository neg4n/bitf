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
