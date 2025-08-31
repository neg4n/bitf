import { Bench } from 'tinybench'
import { bitflag, defineBitflags } from '../src/index'
import { bitToFlagName, defineJsonFlags, jsonFlag } from './json-flags'

const FLAGS = defineBitflags({
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

const JSON_FLAGS = defineJsonFlags(FLAGS as any)

function calculateCV(stdDev: number, mean: number): number {
  return mean > 0 ? stdDev / mean : 0
}

function formatOps(ops: number): string {
  if (ops >= 1_000_000_000) {
    return `${(ops / 1_000_000_000).toFixed(2)}B`
  } else if (ops >= 1_000_000) {
    return `${(ops / 1_000_000).toFixed(2)}M`
  } else if (ops >= 1_000) {
    return `${(ops / 1_000).toFixed(2)}K`
  }
  return ops.toFixed(0)
}

type BenchmarkResult = {
  name: string
  ops: number
  rme: number
  samples: number
  cv?: number
}

export async function runOperationsBenchmark() {
  async function warmup() {
    const warmupBench = new Bench({ time: 100 })

    const bf = bitflag(FLAGS.FLAG_0)
    const jf = jsonFlag(FLAGS.FLAG_0)

    warmupBench
      .add('warmup-bitflag', () => bf.has(FLAGS.FLAG_0))
      .add('warmup-json', () => jf.has(JSON_FLAGS.FLAG_0))

    await warmupBench.run()
  }

  console.log('Running warmup iterations...')
  for (let i = 0; i < 5; i++) {
    await warmup()
  }

  const bitfSingle = bitflag(FLAGS.FLAG_0)
  const bitfMulti = bitflag(FLAGS.FLAG_0 | FLAGS.FLAG_1 | FLAGS.FLAG_2)
  const bitfAll = bitflag(FLAGS.ALL)

  const jsonSingle = jsonFlag(FLAGS.FLAG_0)
  const jsonMulti = jsonFlag(FLAGS.FLAG_0 | FLAGS.FLAG_1 | FLAGS.FLAG_2)
  const jsonAll = jsonFlag(FLAGS.ALL)

  const bench = new Bench({
    time: 500,
    iterations: 100000,
  })

  bench
    .add('bitf.has(single)', () => {
      return bitfSingle.has(FLAGS.FLAG_0)
    })
    .add('bitf.has(double)', () => {
      return bitfMulti.has(FLAGS.FLAG_0, FLAGS.FLAG_1)
    })
    .add('bitf.hasAny()', () => {
      return bitfMulti.hasAny(FLAGS.FLAG_0, FLAGS.FLAG_5)
    })
    .add('bitf.hasExact()', () => {
      return bitfMulti.hasExact(FLAGS.FLAG_0, FLAGS.FLAG_1, FLAGS.FLAG_2)
    })

  bench
    .add('json.has(single)', () => {
      return jsonSingle.has(JSON_FLAGS.FLAG_0)
    })
    .add('json.has(double)', () => {
      return jsonMulti.has(JSON_FLAGS.FLAG_0, JSON_FLAGS.FLAG_1)
    })
    .add('json.hasAny()', () => {
      return jsonMulti.hasAny(JSON_FLAGS.FLAG_0, JSON_FLAGS.FLAG_5)
    })
    .add('json.hasExact()', () => {
      return jsonMulti.hasExact(JSON_FLAGS.FLAG_0, JSON_FLAGS.FLAG_1, JSON_FLAGS.FLAG_2)
    })

  bench
    .add('bitf.add(single)', () => {
      return bitfSingle.add(FLAGS.FLAG_5)
    })
    .add('bitf.add(multiple)', () => {
      return bitfSingle.add(FLAGS.FLAG_5, FLAGS.FLAG_6)
    })
    .add('bitf.remove(single)', () => {
      return bitfMulti.remove(FLAGS.FLAG_1)
    })
    .add('bitf.remove(multiple)', () => {
      return bitfAll.remove(FLAGS.FLAG_0, FLAGS.FLAG_1)
    })
    .add('bitf.toggle()', () => {
      return bitfMulti.toggle(FLAGS.FLAG_5)
    })
    .add('bitf.clear()', () => {
      return bitfAll.clear()
    })

  bench
    .add('json.add(single)', () => {
      return jsonSingle.add(JSON_FLAGS.FLAG_5)
    })
    .add('json.add(multiple)', () => {
      return jsonSingle.add(JSON_FLAGS.FLAG_5, JSON_FLAGS.FLAG_6)
    })
    .add('json.remove(single)', () => {
      return jsonMulti.remove(JSON_FLAGS.FLAG_1)
    })
    .add('json.remove(multiple)', () => {
      return jsonAll.remove(JSON_FLAGS.FLAG_0, JSON_FLAGS.FLAG_1)
    })
    .add('json.toggle()', () => {
      return jsonMulti.toggle(JSON_FLAGS.FLAG_5)
    })
    .add('json.clear()', () => {
      return jsonAll.clear()
    })

  bench
    .add('bitf.value', () => {
      return bitfMulti.value
    })
    .add('bitf.valueOf()', () => {
      return bitfMulti.valueOf()
    })

  bench
    .add('json.value', () => {
      return jsonMulti.value
    })
    .add('json.valueOf()', () => {
      return jsonMulti.valueOf()
    })

  console.log('\nRunning benchmarks (500ms each, max 100k iterations)...\n')
  await bench.run()

  const operations = [
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
  ]

  const results: Map<string, { bitf?: BenchmarkResult; json?: BenchmarkResult }> = new Map()

  for (const task of bench.tasks) {
    const [system, ...opParts] = task.name.split('.')
    const operation = opParts.join('.')

    if (!results.has(operation)) {
      results.set(operation, {})
    }

    const result: BenchmarkResult = {
      name: task.name,
      ops: Math.round(task.result?.hz || 0),
      rme: task.result?.rme || 0,
      samples: task.result?.samples?.length || 0,
    }

    if (task.result?.sd && task.result?.mean) {
      result.cv = calculateCV(task.result.sd, task.result.mean)
    }

    const entry = results.get(operation)!
    if (system === 'bitf') {
      entry.bitf = result
    } else {
      entry.json = result
    }
  }

  console.log('╔════════════════════════════════════════════════════════════════════════════════╗')
  console.log(
    '║                          BENCHMARK RESULTS                                        ║'
  )
  console.log('╠════════════════════╤═══════════════╤═══════════════╤═════════╤═════════════════╣')
  console.log('║ Operation          │ bitf ops/sec │ JSON ops/sec  │ Ratio   │ Samples         ║')
  console.log('╠════════════════════╪═══════════════╪═══════════════╪═════════╪═════════════════╣')

  for (const op of operations) {
    const result = results.get(op)
    if (!result || !result.bitf || !result.json) continue

    const ratio = result.bitf.ops / result.json.ops
    const opName = op.padEnd(18)
    const bitfOps = formatOps(result.bitf.ops).padStart(13)
    const jsonOps = formatOps(result.json.ops).padStart(13)
    const ratioStr = `${ratio.toFixed(1)}x`.padStart(7)
    const samples = `${result.bitf.samples}/${result.json.samples}`.padStart(15)

    console.log(`║ ${opName} │ ${bitfOps} │ ${jsonOps} │ ${ratioStr} │ ${samples} ║`)

    if (result.bitf.rme > 3 || result.json.rme > 3) {
      const warning = `  ⚠ High RME: bitf=${result.bitf.rme.toFixed(2)}% json=${result.json.rme.toFixed(2)}%`
      console.log(`║ ${warning.padEnd(82)} ║`)
    }
  }

  console.log('╚════════════════════╧═══════════════╧═══════════════╧═════════╧═════════════════╝')

  let totalRatio = 0
  let count = 0
  for (const result of results.values()) {
    if (result.bitf && result.json) {
      totalRatio += result.bitf.ops / result.json.ops
      count++
    }
  }

  console.log(
    `\n📊 Average Performance Improvement: ${(totalRatio / count).toFixed(1)}x faster than JSON`
  )

  if (global.gc) {
    console.log('\n💾 Memory Usage Comparison:')

    global.gc()
    const bitfBefore = process.memoryUsage().heapUsed
    const bitfInstances = Array.from({ length: 10000 }, () => bitflag(FLAGS.ALL))
    const bitfAfter = process.memoryUsage().heapUsed
    const bitfMemory = (bitfAfter - bitfBefore) / 10000

    global.gc()
    const jsonBefore = process.memoryUsage().heapUsed
    const jsonInstances = Array.from({ length: 10000 }, () => jsonFlag(FLAGS.ALL))
    const jsonAfter = process.memoryUsage().heapUsed
    const jsonMemory = (jsonAfter - jsonBefore) / 10000

    console.log(`  bitf: ~${bitfMemory.toFixed(2)} bytes per instance`)
    console.log(`  JSON:  ~${jsonMemory.toFixed(2)} bytes per instance`)
    console.log(`  Ratio: ${(jsonMemory / bitfMemory).toFixed(1)}x more memory for JSON`)
  } else {
    console.log('\n💡 Tip: Run with --expose-gc flag for memory usage comparison')
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runOperationsBenchmark().catch(console.error)
}
