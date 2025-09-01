import { describe, expect, it } from 'vitest'
import { configurePizzaOrder } from '../examples/pizza'
import { bitflag, defineBitflags } from '../src/index'

const Toppings = defineBitflags({
  CHEESE: 1 << 0,
  PEPPERONI: 1 << 1,
  MUSHROOMS: 1 << 2,
  OREGANO: 1 << 3,
  PINEAPPLE: 1 << 4,
  BACON: 1 << 5,
  HAM: 1 << 6,
})

describe('Pizza Order Configuration', () => {
  it('should create default pepperoni pizza with no modifications', async () => {
    const result = await configurePizzaOrder({
      desiredSize: 'medium',
      toppingsToAdd: bitflag().clear(),
      toppingsToRemove: bitflag().clear(),
    })

    const pizza = bitflag(result.pizza)
    expect(pizza.has(Toppings.CHEESE)).toBe(true)
    expect(pizza.has(Toppings.PEPPERONI)).toBe(true)
    expect(pizza.hasExact(Toppings.CHEESE, Toppings.PEPPERONI)).toBe(true)
    expect(result.size).toBe('medium')
    expect(result.metadata.hawaiianPizzaDiscount).toBe(false)
  })

  it('should add non-meat toppings to default pepperoni pizza', async () => {
    const result = await configurePizzaOrder({
      desiredSize: 'large',
      toppingsToAdd: bitflag().add(Toppings.MUSHROOMS, Toppings.OREGANO),
      toppingsToRemove: bitflag().clear(),
    })

    const pizza = bitflag(result.pizza)
    expect(pizza.has(Toppings.CHEESE)).toBe(true)
    expect(pizza.has(Toppings.PEPPERONI)).toBe(true)
    expect(pizza.has(Toppings.MUSHROOMS)).toBe(true)
    expect(pizza.has(Toppings.OREGANO)).toBe(true)
    expect(pizza.has(Toppings.BACON)).toBe(false)
    expect(result.size).toBe('large')
  })

  it('should throw error when trying to add another meat to pepperoni pizza', async () => {
    await expect(
      configurePizzaOrder({
        desiredSize: 'small',
        toppingsToAdd: bitflag().add(Toppings.BACON),
        toppingsToRemove: bitflag().clear(),
      })
    ).rejects.toThrow('Only one type of meat is allowed per pizza!')
  })

  it('should throw error when trying to add multiple meats at once', async () => {
    await expect(
      configurePizzaOrder({
        desiredSize: 'medium',
        toppingsToAdd: bitflag().add(Toppings.BACON, Toppings.HAM),
        toppingsToRemove: bitflag().clear(),
      })
    ).rejects.toThrow('Only one type of meat is allowed per pizza!')
  })

  it('should allow replacing pepperoni with bacon', async () => {
    const result = await configurePizzaOrder({
      desiredSize: 'small',
      toppingsToAdd: bitflag().add(Toppings.BACON),
      toppingsToRemove: bitflag().add(Toppings.PEPPERONI),
    })

    const pizza = bitflag(result.pizza)
    expect(pizza.has(Toppings.CHEESE)).toBe(true)
    expect(pizza.has(Toppings.PEPPERONI)).toBe(false)
    expect(pizza.has(Toppings.BACON)).toBe(true)
    expect(result.size).toBe('small')
    expect(result.metadata.hawaiianPizzaDiscount).toBe(false)
  })

  it('should allow replacing pepperoni with ham', async () => {
    const result = await configurePizzaOrder({
      desiredSize: 'large',
      toppingsToAdd: bitflag().add(Toppings.HAM, Toppings.MUSHROOMS),
      toppingsToRemove: bitflag().add(Toppings.PEPPERONI),
    })

    const pizza = bitflag(result.pizza)
    expect(pizza.has(Toppings.CHEESE)).toBe(true)
    expect(pizza.has(Toppings.PEPPERONI)).toBe(false)
    expect(pizza.has(Toppings.HAM)).toBe(true)
    expect(pizza.has(Toppings.MUSHROOMS)).toBe(true)
    expect(result.size).toBe('large')
  })

  it('should allow removing pepperoni completely (no meat pizza)', async () => {
    const result = await configurePizzaOrder({
      desiredSize: 'medium',
      toppingsToAdd: bitflag().add(Toppings.MUSHROOMS, Toppings.OREGANO),
      toppingsToRemove: bitflag().add(Toppings.PEPPERONI),
    })

    const pizza = bitflag(result.pizza)
    expect(pizza.has(Toppings.CHEESE)).toBe(true)
    expect(pizza.has(Toppings.PEPPERONI)).toBe(false)
    expect(pizza.has(Toppings.BACON)).toBe(false)
    expect(pizza.has(Toppings.HAM)).toBe(false)
    expect(pizza.has(Toppings.MUSHROOMS)).toBe(true)
    expect(pizza.has(Toppings.OREGANO)).toBe(true)
  })

  it('should throw error when trying to remove cheese', async () => {
    await expect(
      configurePizzaOrder({
        desiredSize: 'small',
        toppingsToAdd: bitflag().clear(),
        toppingsToRemove: bitflag().add(Toppings.CHEESE),
      })
    ).rejects.toThrow('Cheese is always included in our pizzas!')
  })

  it('should throw error when trying to remove cheese along with other toppings', async () => {
    await expect(
      configurePizzaOrder({
        desiredSize: 'medium',
        toppingsToAdd: bitflag().add(Toppings.MUSHROOMS),
        toppingsToRemove: bitflag().add(Toppings.CHEESE, Toppings.PEPPERONI),
      })
    ).rejects.toThrow('Cheese is always included in our pizzas!')
  })

  it('should create Hawaiian pizza and apply discount', async () => {
    const result = await configurePizzaOrder({
      desiredSize: 'large',
      toppingsToAdd: bitflag().add(Toppings.HAM, Toppings.PINEAPPLE),
      toppingsToRemove: bitflag().add(Toppings.PEPPERONI),
    })

    const pizza = bitflag(result.pizza)
    expect(pizza.has(Toppings.CHEESE)).toBe(true)
    expect(pizza.has(Toppings.HAM)).toBe(true)
    expect(pizza.has(Toppings.PINEAPPLE)).toBe(true)
    expect(pizza.has(Toppings.PEPPERONI)).toBe(false)
    expect(pizza.hasExact(Toppings.CHEESE, Toppings.HAM, Toppings.PINEAPPLE)).toBe(true)
    expect(result.metadata.hawaiianPizzaDiscount).toBe(true)
  })

  it('should not apply Hawaiian discount for incomplete Hawaiian pizza', async () => {
    const result = await configurePizzaOrder({
      desiredSize: 'medium',
      toppingsToAdd: bitflag().add(Toppings.HAM),
      toppingsToRemove: bitflag().add(Toppings.PEPPERONI),
    })

    expect(result.metadata.hawaiianPizzaDiscount).toBe(false)
  })

  it('should not apply Hawaiian discount when Hawaiian has extra toppings', async () => {
    const result = await configurePizzaOrder({
      desiredSize: 'large',
      toppingsToAdd: bitflag().add(Toppings.HAM, Toppings.PINEAPPLE, Toppings.MUSHROOMS),
      toppingsToRemove: bitflag().add(Toppings.PEPPERONI),
    })

    const pizza = bitflag(result.pizza)
    expect(pizza.has(Toppings.CHEESE)).toBe(true)
    expect(pizza.has(Toppings.HAM)).toBe(true)
    expect(pizza.has(Toppings.PINEAPPLE)).toBe(true)
    expect(pizza.has(Toppings.MUSHROOMS)).toBe(true)
    expect(result.metadata.hawaiianPizzaDiscount).toBe(false)
  })

  it('should handle complex topping changes correctly', async () => {
    const result = await configurePizzaOrder({
      desiredSize: 'medium',
      toppingsToAdd: bitflag().add(Toppings.BACON, Toppings.MUSHROOMS, Toppings.OREGANO),
      toppingsToRemove: bitflag().add(Toppings.PEPPERONI),
    })

    const pizza = bitflag(result.pizza)
    expect(pizza.has(Toppings.CHEESE)).toBe(true)
    expect(pizza.has(Toppings.PEPPERONI)).toBe(false)
    expect(pizza.has(Toppings.BACON)).toBe(true)
    expect(pizza.has(Toppings.MUSHROOMS)).toBe(true)
    expect(pizza.has(Toppings.OREGANO)).toBe(true)
    expect(pizza.has(Toppings.HAM)).toBe(false)
    expect(pizza.has(Toppings.PINEAPPLE)).toBe(false)
  })

  it('should handle empty bitflags correctly', async () => {
    const result = await configurePizzaOrder({
      desiredSize: 'small',
      toppingsToAdd: bitflag().clear(),
      toppingsToRemove: bitflag().clear(),
    })

    const pizza = bitflag(result.pizza)
    expect(pizza.hasExact(Toppings.CHEESE, Toppings.PEPPERONI)).toBe(true)
  })
})
