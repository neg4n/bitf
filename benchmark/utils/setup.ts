import { defineBitflags } from '../../src/index'

export const FLAGS = defineBitflags({
  NONE: 0,
  FLAG_0: 1 << 0,
  FLAG_1: 1 << 1,
  FLAG_2: 1 << 2,
  FLAG_3: 1 << 3,
  FLAG_4: 1 << 4,
  FLAG_5: 1 << 5,
  FLAG_6: 1 << 6,
  FLAG_7: 1 << 7,
  GROUP_LOW: (1 << 0) | (1 << 1) | (1 << 2) | (1 << 3),
  GROUP_HIGH: (1 << 4) | (1 << 5) | (1 << 6) | (1 << 7),
  ALL: (1 << 0) | (1 << 1) | (1 << 2) | (1 << 3) | (1 << 4) | (1 << 5) | (1 << 6) | (1 << 7),
})

export const BENCHMARK_CONFIG = {
  warmupTime: 50,
  warmupIterations: 3,
  benchmarkTime: 100,
}

export const OPERATIONS = [
  'has(single)',
  'has(double)',
  'hasAny()',
  'hasExact()',
  'add(single)',
  'add(multiple)',
  'remove(single)',
  'remove(multiple)',
  'toggle()',
  'clear()',
  'value',
  'valueOf()',
] as const

export type OperationName = (typeof OPERATIONS)[number]

export type BenchmarkResult = {
  name: string
  ops: number
  rme: number
  samples: number
  mean?: number
  sd?: number
}

export type SuiteResults = {
  implementation: 'bitf' | 'json'
  results: Map<OperationName, BenchmarkResult>
  totalTime: number
}
