import { Bench } from 'tinybench'
import { defineJsonFlags, jsonFlag } from '../json-flags'
import { BENCHMARK_CONFIG, FLAGS, type OperationName, type SuiteResults } from '../utils/setup'

const JSON_FLAGS = defineJsonFlags(FLAGS as any)

export async function runJsonSuite(): Promise<SuiteResults> {
  const startTime = Date.now()

  console.log('\n🔧 Running JSON benchmark suite...')

  console.log('   Warming up...')
  const warmupBench = new Bench({ time: BENCHMARK_CONFIG.warmupTime })
  const warmupFlag = jsonFlag(FLAGS.FLAG_0)

  warmupBench.add('warmup', () => warmupFlag.has(JSON_FLAGS.FLAG_0))

  for (let i = 0; i < BENCHMARK_CONFIG.warmupIterations; i++) {
    await warmupBench.run()
  }

  const singleFlag = jsonFlag(FLAGS.FLAG_0)
  const multiFlags = jsonFlag(FLAGS.FLAG_0 | FLAGS.FLAG_1 | FLAGS.FLAG_2)
  const allFlags = jsonFlag(FLAGS.ALL)

  const bench = new Bench({
    time: BENCHMARK_CONFIG.benchmarkTime,
  })

  bench
    .add('has(single)', () => {
      return singleFlag.has(JSON_FLAGS.FLAG_0)
    })
    .add('has(double)', () => {
      return multiFlags.has(JSON_FLAGS.FLAG_0, JSON_FLAGS.FLAG_1)
    })
    .add('hasAny()', () => {
      return multiFlags.hasAny(JSON_FLAGS.FLAG_0, JSON_FLAGS.FLAG_5)
    })
    .add('hasExact()', () => {
      return multiFlags.hasExact(JSON_FLAGS.FLAG_0, JSON_FLAGS.FLAG_1, JSON_FLAGS.FLAG_2)
    })

    .add('add(single)', () => {
      return singleFlag.add(JSON_FLAGS.FLAG_5)
    })
    .add('add(multiple)', () => {
      return singleFlag.add(JSON_FLAGS.FLAG_5, JSON_FLAGS.FLAG_6)
    })
    .add('remove(single)', () => {
      return multiFlags.remove(JSON_FLAGS.FLAG_1)
    })
    .add('remove(multiple)', () => {
      return allFlags.remove(JSON_FLAGS.FLAG_0, JSON_FLAGS.FLAG_1)
    })
    .add('toggle()', () => {
      return multiFlags.toggle(JSON_FLAGS.FLAG_5)
    })
    .add('clear()', () => {
      return allFlags.clear()
    })

    .add('value', () => {
      return multiFlags.value
    })
    .add('valueOf()', () => {
      return multiFlags.valueOf()
    })

  console.log('   Running benchmarks...')
  await bench.run()

  const results = new Map<OperationName, any>()

  for (const task of bench.tasks) {
    const name = task.name as OperationName
    results.set(name, {
      name: task.name,
      ops: Math.round(task.result?.hz || 0),
      rme: task.result?.rme || 0,
      samples: task.result?.samples?.length || 0,
      mean: task.result?.mean,
      sd: task.result?.sd,
    })
  }

  const totalTime = Date.now() - startTime
  console.log(`   ✅ JSON suite completed in ${(totalTime / 1000).toFixed(2)}s`)

  return {
    implementation: 'json',
    results,
    totalTime,
  }
}
