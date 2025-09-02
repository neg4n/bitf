# bitf

`bitf` is a tiny and fast bit flags _(other terms: bit fields, optionsets)_ management library for TypeScript/JavaScript

## What are bitflags?

Bitflags are a way to represent a set of boolean options using a single integer. Each bit in the number corresponds to a different option, allowing for efficient storage and manipulation of multiple flags at once. Concept of creating this library originates from the article ["Everything About Bitflags"](https://neg4n.dev/blog/everything-about-bitflags).

### Features

- Type safety via [Tagged](https://github.com/sindresorhus/type-fest/blob/main/source/tagged.d.ts) types.
- Lightweight and fast, almost native bitwise performance with minimal abstraction layer.
- No runtime dependencies.
- Robust and ready-to-use on production.
- Comprehensive tests suite with 100% test coverage.
- `.describe()` iterator for better debugging and visualization of the bit flags.
- Range guards while defining bit flags.

## Installation

```bash
npm i bitf
# or
yarn add bitf
# or
pnpm add bitf
# or
bun add bitf
```

## Usage Example


This example shows a pizza ordering system where customers can customize their toppings. The restaurant starts with a default Pepperoni pizza and enforces three business rules:

1. cheese must always be included (it's the base of toppings every pizza being sold)
2. only one meat type is allowed per pizza (to ensure good taste combinations)
3. customers get an automatic discount when they order a Hawaiian pizza (cheese + ham + pineapple)

The code uses bitflags to efficiently track which toppings are selected and validate these rules, demonstrating how bitflags can handle complex combinations while enforcing business logic and detecting special cases for promotions without hundreds of lines of code of copying, modyfing and iterating over `Object`s and `Array`s of `Object`s and mapping boolean states and wasting the network bandwidth.

```ts
import { type Bitflag, bitflag, defineBitflags } from "bitf";

// This should probably live in a file shared between frontend/backend contexts
const Toppings = defineBitflags({
  CHEESE: 1 << 0,
  PEPPERONI: 1 << 1,
  MUSHROOMS: 1 << 2,
  OREGANO: 1 << 3,
  PINEAPPLE: 1 << 4,
  BACON: 1 << 5,
  HAM: 1 << 6,
});

// Can be mapped on frontend using InferBitflagsDefinitions<typeof Toppings> and .describe() function
type PizzaOrderPreferences = Readonly<{
  desiredSize: "small" | "medium" | "large";
  toppingsToAdd: Bitflag;
  toppingsToRemove: Bitflag;
}>;

export async function configurePizzaOrder({
  desiredSize,
  toppingsToAdd,
  toppingsToRemove,
}: PizzaOrderPreferences) {
  if (bitflag(toppingsToRemove).has(Toppings.CHEESE))
    throw new Error("Cheese is always included in our pizzas!");

  const defaultPizza = bitflag().add(Toppings.CHEESE, Toppings.PEPPERONI);
  const pizzaAfterRemoval = processToppingsRemoval(
    defaultPizza,
    toppingsToRemove
  );

  validateMeatAddition(pizzaAfterRemoval, toppingsToAdd);

  // ... some additional logic like checking the toppings availability in the restaurant inventory
  // ... some additional logging using the .describe() function for comprehensive info

  const finalPizza = bitflag(pizzaAfterRemoval).add(toppingsToAdd);

  return {
    size: desiredSize,
    pizza: finalPizza,
    metadata: {
      hawaiianPizzaDiscount: bitflag(finalPizza).hasExact(
        Toppings.CHEESE,
        Toppings.HAM,
        Toppings.PINEAPPLE
      ),
    },
  };
}

function processToppingsRemoval(
  currentPizza: Bitflag,
  toppingsToRemove: Bitflag
) {
  if (toppingsToRemove) return bitflag(currentPizza).remove(toppingsToRemove);
  return currentPizza;
}

function validateMeatAddition(currentPizza: Bitflag, toppingsToAdd: Bitflag) {
  const currentHasMeat = bitflag(currentPizza).hasAny(
    Toppings.PEPPERONI,
    Toppings.BACON,
    Toppings.HAM
  );

  const requestingMeat = bitflag(toppingsToAdd).hasAny(
    Toppings.PEPPERONI,
    Toppings.BACON,
    Toppings.HAM
  );

  if (currentHasMeat && requestingMeat)
    throw new Error("Only one type of meat is allowed per pizza!");
}
```

## Top-level API

`bitf` library exposes the following:

**Core runtime functionality:**

- [`bitflag`](#bitflagbitflag--number) - the main function to perform bitwise operations on the flags.
  - Bitwise operations abstraction
    - [`has`](#hasbitflag) - checks if the specified flags are set
    - [`hasAny`](#hasanybitflag) - checks if any of the specified flags are set
    - [`hasExact`](#hasexactbitflag) - checks if the specified flags are set exactly
    - [`add`](#addbitflag) - adds the specified flags
    - [`remove`](#removebitflag) - removes the specified flags
    - [`toggle`](#togglebitflag) - toggles the specified flags
    - [`clear`](#clear) - clears all flags
  - Debugging and visualization
    - [`describe`](#describeflagdefinitions-bitflagsdefinitionst) - returns an iterator for describing the flags
  - Interoperability between the library and other code
    - [`value`](#value) - returns the current value of the flags
    - [`valueOf`](#valueof) - returns the current value of the flags
    - [`toString`](#tostring) - returns the string representation of the flags
- [`defineBitflags`](#definebitflagst-extends-recordstring-numberobj-t) - utility to define type-safe set of bit flags

> [!NOTE]
> All of the operations support passing multiple flags at once through variadic arguments.

**Utility functions**

- [`makeBitflag`](#makebitflagvalue-number) - utility to create a `Bitflag` Tagged Type from a number if it is possible.
- [`isBitflag`](#isbitflagvalue-unknown) - utility to check if number is within allowed range and to create a `Bitflag` Tagged type out of it
- [`unwrapBitflag`](#unwrapbitflagflag-bitflag) - utility to unwrap the Tagged type of `Bitflag` to be just `number`

**Type utilities**

- `Bitflag` - The tagged type for individual bitflag numbers
- `BitflagsDefinitions<T>` - The type for frozen bitflag definition objects returned by `defineBitflags`
- `InferBitflagsDefinitions<T>` - Type utility to extract the shape from bitflag definitions (similar to Zod's `z.infer`)

## API Reference

### `bitflag(Bitflag | number)`

Bitflag is a factory function that returns object with a specific set of operations for managing the flags. It accepts any number or `Bitflag` Tagged Type as an argument and then allows you to perform various operations on it. It also supports methods like `toString()`, `value` getter and `valueOf()` for compatibility with other JavaScript APIs.

**Important:** The `bitflag` function's returned object's methods are **non-chainable** - each call to the bitwise operations returns just a number wrapped with the `Bitflag` Tagged Type. It does not return a new instance of the `bitflag` object.

#### Correct Usage

```ts
const combinedFlags = bitflag(flags.NONE).add(
  flags.MY_OTHER_FLAG,
  flags.ANOTHER_FLAG
);

if (bitflag(combinedFlags).has(flags.ANOTHER_FLAG)) {
  console.log("has ANOTHER_FLAG");
}
```

#### Incorrect Usage

```ts
// ❌ This will not work as expected
if (
  bitflag(flags.NONE)
    .add(flags.MY_OTHER_FLAG, flags.ANOTHER_FLAG)
    .has(flags.ANOTHER_FLAG)
) {
  console.log("has ANOTHER_FLAG");
}
```

### Bitwise Operations

### `.has(...Bitflag[])`

Checks if all the specified flags are set in the current set. Returns `true` if all flags are present, `false` otherwise.

**Tip:** Passing no arguments to `.has()` always returns `false`.

#### Examples

```ts
bitflag(flags.READ | flags.WRITE).has(flags.READ); // single defined
bitflag(flags.READ | flags.WRITE | flags.EXECUTE).has(
  flags.READ,
  flags.WRITE
); // multiple defined
bitflag(flags.READ | flags.WRITE).has(flags.READ, makeBitflag(1 << 1)); // mixed
```

### `.hasAny(...Bitflag[])`

Checks if any of the specified flags are set in the current set. Returns `true` if at least one flag is present, `false` if none are present.

**Tip:** Passing no arguments to `.hasAny()` always returns `false`.

#### Examples

```ts
bitflag(flags.READ | flags.WRITE).hasAny(flags.EXECUTE); // single defined
bitflag(flags.READ).hasAny(flags.EXECUTE, flags.DELETE); // multiple defined
bitflag(flags.READ).hasAny(flags.EXECUTE, makeBitflag(1 << 0)); // mixed
```

### `.hasExact(...Bitflag[])`

Checks if the current set matches exactly the specified flags - no more, no less. Returns `true` if the flags match exactly, `false` otherwise.

**Tip:** Calling `.hasExact()` with no arguments checks if the current value is exactly zero.

#### Examples

```ts
bitflag(flags.READ | flags.WRITE).hasExact(flags.READ, flags.WRITE); // single defined exact match
bitflag(flags.NONE).hasExact(); // multiple defined (empty means zero flags)
bitflag(flags.READ).hasExact(makeBitflag(1 << 0)); // mixed
```

### `.add(...Bitflag[])`

Adds the specified flags to the current set. Returns a new number wrapped in `Bitflag<T>` as the updated flags.

**Tip:** Adding the same flag multiple times is idempotent - it won't change the result.

#### Examples

```ts
bitflag(flags.MY_FLAG).add(flags.MY_OTHER_FLAG); // single defined
bitflag(flags.MY_FLAG).add(flags.MY_OTHER_FLAG, flags.ANOTHER_FLAG); // multiple defined
bitflag(flags.MY_FLAG).add(flags.MY_OTHER_FLAG, makeBitflag(1 << 2)); // mixed
```

### `.remove(...Bitflag[])`

Removes the specified flags from the current set. Returns a new number wrapped in `Bitflag<T>` as the updated flags.

**Tip:** Removing non-existent flags has no effect and won't change the result.

#### Examples

```ts
bitflag(flags.READ | flags.WRITE).remove(flags.WRITE); // single defined
bitflag(flags.ALL).remove(flags.WRITE, flags.DELETE); // multiple defined
bitflag(flags.READ | flags.WRITE).remove(flags.WRITE, makeBitflag(1 << 3)); // mixed
```

### `.toggle(...Bitflag[])`

Toggles the specified flags in the current set - adds them if not present, removes them if present. Returns a new number wrapped in `Bitflag<T>` as the updated flags.

#### Examples

```ts
bitflag(flags.READ).toggle(flags.WRITE); // single defined
bitflag(flags.READ | flags.EXECUTE).toggle(flags.WRITE, flags.EXECUTE); // multiple defined
bitflag(flags.read).toggle(flags.WRITE, makeBitflag(1 << 4)); // mixed
```

### `.clear()`

Clears all flags, setting the value to zero. Returns a new number wrapped in `Bitflag<T>` with value 0.

#### Examples

```ts
bitflag(flags.ALL).clear(); // returns 0 as Bitflag
```

### Debugging and Visualization

### `.describe(flagDefinitions?: BitflagsDefinitions<T>)`

Returns an iterator that yields `FlagDescription` objects for each set bit, providing detailed information about the flags including name, value, and bit position visualization.

#### FlagDescription Structure

```ts
type FlagDescription = {
  name: string; // Flag name or "BIT_X"/"UNKNOWN_BIT_X"
  value: number; // Numeric value of this specific flag
  decimal: string; // Decimal representation (e.g., "42")
  hexadecimal: string; // Hexadecimal with 0x prefix (e.g., "0x2A")
  binary: string; // Binary with 0b prefix (e.g., "0b101010")
  unknown: boolean; // true if flag not found in the definitions provided via parameter
  bitPosition: {
    exact: number; // Highest bit position (-1 for zero)
    remaining: number; // Remaining available bit positions
    visual: string; // Visual bit representation with [1] markers
  };
};
```

#### Examples

**Basic Usage with Flag Definitions**

```ts
[...bitflag(flags.READ | flags.WRITE).describe(flags)];
```

Returns:
```js
[
  {
    name: "READ",
    value: 1,
    decimal: "1",
    hexadecimal: "0x1",
    binary: "0b1",
    unknown: false,
    bitPosition: {
      exact: 0,
      remaining: 31,
      visual: "(0)000000000000000000000000000000[1]",
    },
  },
  {
    name: "WRITE",
    value: 2,
    decimal: "2",
    hexadecimal: "0x2",
    binary: "0b10",
    unknown: false,
    bitPosition: {
      exact: 1,
      remaining: 30,
      visual: "(0)00000000000000000000000000000[1]0",
    },
  },
]
```

**Generic Bit Names (No Definitions)**

```ts
// Without definitions - shows generic BIT_X names
[...bitflag(5).describe()]; // value 5 = bits 0 and 2
```

Returns:
```js
[
  {
    name: "BIT_0",
    value: 1,
    binary: "0b1",
    unknown: false,
    bitPosition: {
      exact: 0,
      remaining: 31,
      visual: "(0)000000000000000000000000000000[1]",
    },
  },
  {
    name: "BIT_2",
    value: 4,
    binary: "0b100",
    unknown: false,
    bitPosition: {
      exact: 2,
      remaining: 29,
      visual: "(0)0000000000000000000000000000[1]00",
    },
  },
]
```

**Mixed Known and Unknown Flags**

```ts
// Mixed known and unknown flags
[...bitflag(flags.READ | makeBitflag(1 << 10)).describe(flags)];
```

Returns:
```js
[
  {
    name: "READ",
    value: 1,
    decimal: "1",
    hexadecimal: "0x1",
    binary: "0b1",
    unknown: false,
    bitPosition: {
      exact: 0,
      remaining: 31,
      visual: "(0)000000000000000000000000000000[1]",
    },
  },
  {
    name: "UNKNOWN_BIT_10",
    value: 1024,
    decimal: "1024",
    hexadecimal: "0x400",
    binary: "0b10000000000",
    unknown: true,
    bitPosition: {
      exact: 10,
      remaining: 21,
      visual: "(0)00000000000000000000[1]0000000000",
    },
  },
]
```

**Zero Value Special Case**

```ts
// Zero value special case
[...bitflag(0).describe()];
```

Returns:
```js
[
  {
    name: "NONE",
    value: 0,
    decimal: "0",
    hexadecimal: "0x0",
    binary: "0b0",
    unknown: false,
    bitPosition: {
      exact: -1,
      remaining: 31,
      visual: "(0)0000000000000000000000000000000",
    },
  },
]
```

**High Bit Positions (15 & 30)**

```ts
// High bit positions (bit 15 and 30)
[...bitflag(makeBitflag((1 << 15) | (1 << 30))).describe()];
```

Returns:
```js
[
  {
    name: "BIT_15",
    value: 32768,
    binary: "0b1000000000000000",
    bitPosition: {
      exact: 15,
      remaining: 16,
      visual: "(0)000000000000000[1]000000000000000",
    },
  },
  {
    name: "BIT_30",
    value: 1073741824,
    binary: "0b1000000000000000000000000000000",
    bitPosition: {
      exact: 30,
      remaining: 1,
      visual: "(0)[1]000000000000000000000000000000",
    },
  },
]
```

#### Important Notes

**Bit Position Visualization:** The `visual` field shows a 32-character representation where `[1]` indicates set bits and `0` shows unset bits. The format is `(0)[bit31][bit30]...[bit1][bit0]` with the sign bit always shown as `(0)`.

**Flag Resolution Order:** When using flag definitions, the iterator yields known flags first (in the order they match), then unknown bits as `UNKNOWN_BIT_X` in ascending bit order.

**Complex Flags:** Combined flags (like `READ_WRITE: (1<<0)|(1<<1)`) are detected when their exact bit pattern matches the current value, alongside their individual component flags.

### Interoperability between the library and other code

### `.value`

A getter that returns the current numeric value of the flags as a regular number.

#### Examples

```ts
bitflag(flags.READ | flags.WRITE).value; // returns 3
bitflag().value; // returns 0
bitflag(flags.ALL).value; // returns the combined numeric value
```

### `.valueOf()`

Returns the current numeric value of the flags, enabling implicit conversion to number in JavaScript operations.

#### Examples

```ts
bitflag(flags.READ).valueOf(); // explicit call
+bitflag(flags.WRITE); // implicit conversion
Number(bitflag(flags.EXECUTE)); // explicit conversion
```

### `.toString()`

Returns the string representation of the current numeric value of the flags.

#### Examples

```ts
bitflag(flags.READ).toString(); // returns "1"
String(bitflag(flags.READ | flags.WRITE)); // returns "3"
`Current flags: ${bitflag(flags.ALL)}`; // template literal usage
```

### Utility Functions

### `defineBitflags<T extends Record<string, number>>(obj: T)`

Utility function to define a type-safe set of bit flags. It validates that all values are non-negative integers within the 31-bit range and returns a frozen object with `Bitflag` Tagged Types.

**Tip:** The returned object is frozen to prevent accidental modifications. All values must be within the range 0 to 0x7FFFFFFF (31-bit signed integer range).

#### Examples

```ts
const flags = defineBitflags({
  READ: 1 << 0,
  WRITE: 1 << 1,
  EXECUTE: 1 << 2,
}); // basic usage

const complexFlags = defineBitflags({
  NONE: 0,
  READ: 1 << 0,
  WRITE: 1 << 1,
  READ_WRITE: (1 << 0) | (1 << 1),
}); // with combined flags

const permissions = defineBitflags({
  VIEWER: 1,
  EDITOR: 3,
  ADMIN: 15,
}); // with arbitrary values
```

### `makeBitflag(value: number)`

Utility function to create a `Bitflag` Tagged Type from a number if it's within the valid range. Throws an error if the conversion would result in a data loss.

**Tip:** This function validates the input and throws a descriptive error for invalid values (negative numbers or values exceeding 31 bits). It is also the only function that throws.

#### Examples

```ts
makeBitflag(5); // creates Bitflag from valid number
makeBitflag(0); // creates Bitflag for zero
makeBitflag(0x7fffffff); // creates Bitflag for maximum value
```

### `isBitflag(value: unknown)`

Type guard utility to check if a value can be used as a `Bitflag`. Returns `true` if the value is a non-negative integer within the 31-bit range.

**Tip:** This function is useful for runtime validation before using values with the bitflag operations.

#### Examples

```ts
isBitflag(5); // returns true
isBitflag(-1); // returns false
isBitflag(1.5); // returns false
```

### `unwrapBitflag(flag: Bitflag)`

Utility function to extract the numeric value from a `Bitflag` Tagged Type, converting it back to a regular number.

#### Examples

```ts
const flags = defineBitflags({ TEST: 5 });
unwrapBitflag(flags.TEST); // returns 5 as number
unwrapBitflag(bitflag(flags.TEST).add(makeBitflag(2))); // returns 7 as number
unwrapBitflag(bitflag().clear()); // returns 0 as number
```

### Type Utilities

### `Bitflag`

The tagged type for individual bitflag numbers. This ensures type safety by distinguishing bitflag numbers from regular numbers.

It is mostly used internally inside the library source. Export exists for complex cases where you would need this type.

### `BitflagsDefinitions<T>`

The type for frozen bitflag definition objects returned by `defineBitflags`. This represents the complete set of flag definitions.

It is mostly used internally inside the library source. Export exists for complex cases where you would need this type.

### `InferBitflagsDefinitions<T>`

Type utility to extract the shape from bitflag definitions. Converts `BitflagsDefinitions<T>` to `Record<keyof T, Bitflag>`.

#### Examples

```ts
import { type InferBitflagsDefinitions } from "bitf";

// Define flags
const UserPermissions = defineBitflags({
  READ: 1 << 0,
  WRITE: 1 << 1,
  DELETE: 1 << 2,
});

// Extract type shape
type UserPermissionsType = InferBitflagsDefinitions<typeof UserPermissions>;
// Result: { READ: Bitflag; WRITE: Bitflag; DELETE: Bitflag }
```

## Benchmarks

See more ["Everything About Bitflags - Benchmarks"](https://neg4n.dev/blog/everything-about-bitflags#benchmarks).

## License

The MIT License