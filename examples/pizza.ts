import {
  type Bitflag,
  bitflag,
  defineBitflags,
} from '../src/index'

// This should probably live in a file shared between frontend/backend contexts
const Toppings = defineBitflags({
  CHEESE: 1 << 0,
  PEPPERONI: 1 << 1,
  MUSHROOMS: 1 << 2,
  OREGANO: 1 << 3,
  PINEAPPLE: 1 << 4,
  BACON: 1 << 5,
  HAM: 1 << 6,
})

// Can be mapped on frontend using InferBitflagsDefinitions<typeof Toppings> and .describe() function
type PizzaOrderPreferences = Readonly<{
  desiredSize: 'small' | 'medium' | 'large'
  toppingsToAdd: Bitflag 
  toppingsToRemove: Bitflag
}>

export async function configurePizzaOrder({
  desiredSize,
  toppingsToAdd,
  toppingsToRemove,
}: PizzaOrderPreferences) {
  if (bitflag(toppingsToRemove).has(Toppings.CHEESE))
    throw new Error('Cheese is always included in our pizzas!')

  const defaultPizza = bitflag().add(Toppings.CHEESE, Toppings.PEPPERONI)
  const pizzaAfterRemoval = processToppingsRemoval(defaultPizza, toppingsToRemove)

  validateMeatAddition(pizzaAfterRemoval, toppingsToAdd)

  // ... some additional logic like checking the toppings availability in the restaurant inventory
  // ... some additional logging using the .describe() function for comprehensive info

  const finalPizza = bitflag(pizzaAfterRemoval).add(toppingsToAdd)

  return {
    size: desiredSize,
    pizza: finalPizza,
    metadata: {
      hawaiianPizzaDiscount: bitflag(finalPizza)
       .hasExact(Toppings.CHEESE, Toppings.HAM, Toppings.PINEAPPLE)
    }
  }
}

function processToppingsRemoval(currentPizza: Bitflag, toppingsToRemove: Bitflag) {
  if (toppingsToRemove) return bitflag(currentPizza).remove(toppingsToRemove)
  return currentPizza
}

function validateMeatAddition(currentPizza: Bitflag, toppingsToAdd: Bitflag) {
  const currentHasMeat = bitflag(currentPizza)
    .hasAny(Toppings.PEPPERONI, Toppings.BACON, Toppings.HAM)

  const requestingMeat = bitflag(toppingsToAdd)
    .hasAny(Toppings.PEPPERONI, Toppings.BACON, Toppings.HAM)

  if (currentHasMeat && requestingMeat)
    throw new Error('Only one type of meat is allowed per pizza!')
}
