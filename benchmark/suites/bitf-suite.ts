import { Bench } from 'tinybench'
import { bitflag } from '../../src/index'
import { BENCHMARK_CONFIG, FLAGS, type OperationName, type SuiteResults } from '../utils/setup'

export async function runbitfSuite(): Promise<SuiteResults> {
  const startTime = Date.now()

  console.log('\n🚀 Running bitf benchmark suite...')

  console.log('   Warming up...')
  const warmupBench = new Bench({ time: BENCHMARK_CONFIG.warmupTime })
  const warmupFlag = bitflag(FLAGS.FLAG_0)

  warmupBench.add('warmup', () => warmupFlag.has(FLAGS.FLAG_0))

  for (let i = 0; i < BENCHMARK_CONFIG.warmupIterations; i++) {
    await warmupBench.run()
  }

  const singleFlag = bitflag(FLAGS.FLAG_0)
  const multiFlags = bitflag(FLAGS.FLAG_0 | FLAGS.FLAG_1 | FLAGS.FLAG_2)
  const allFlags = bitflag(FLAGS.ALL)

  const bench = new Bench({
    time: BENCHMARK_CONFIG.benchmarkTime,
  })

  bench
    .add('has(single)', () => {
      return singleFlag.has(FLAGS.FLAG_0)
    })
    .add('has(double)', () => {
      return multiFlags.has(FLAGS.FLAG_0, FLAGS.FLAG_1)
    })
    .add('hasAny()', () => {
      return multiFlags.hasAny(FLAGS.FLAG_0, FLAGS.FLAG_5)
    })
    .add('hasExact()', () => {
      return multiFlags.hasExact(FLAGS.FLAG_0, FLAGS.FLAG_1, FLAGS.FLAG_2)
    })

    .add('add(single)', () => {
      return singleFlag.add(FLAGS.FLAG_5)
    })
    .add('add(multiple)', () => {
      return singleFlag.add(FLAGS.FLAG_5, FLAGS.FLAG_6)
    })
    .add('remove(single)', () => {
      return multiFlags.remove(FLAGS.FLAG_1)
    })
    .add('remove(multiple)', () => {
      return allFlags.remove(FLAGS.FLAG_0, FLAGS.FLAG_1)
    })
    .add('toggle()', () => {
      return multiFlags.toggle(FLAGS.FLAG_5)
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
  console.log(`   ✅ bitf suite completed in ${(totalTime / 1000).toFixed(2)}s`)

  return {
    implementation: 'bitf',
    results,
    totalTime,
  }
}
