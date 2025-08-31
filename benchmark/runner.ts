import { runbitfSuite } from './suites/bitf-suite'
import { runJsonSuite } from './suites/json-suite'
import { displayComparison, displaySingleSuite } from './utils/display'

export type RunnerOptions = {
  suite?: 'bitf' | 'json' | 'both'
  compare?: boolean
  verbose?: boolean
}

export async function runBenchmarks(options: RunnerOptions = {}) {
  const { suite = 'both', compare = suite === 'both' } = options

  console.log('# bitf benchmarks')
  console.log(`# Node ${process.version}`)

  let bitfResults = null
  let jsonResults = null

  if (suite === 'bitf' || suite === 'both') {
    try {
      bitfResults = await runbitfSuite()

      if (suite === 'bitf') {
        displaySingleSuite(bitfResults)
      }
    } catch (error) {
      console.error('❌ bitf suite failed:', error)
      if (suite === 'bitf') process.exit(1)
    }
  }

  if (global.gc && suite === 'both') {
    console.log('\n🧹 Running garbage collection...')
    global.gc()
  }

  if (suite === 'json' || suite === 'both') {
    try {
      jsonResults = await runJsonSuite()

      if (suite === 'json') {
        displaySingleSuite(jsonResults)
      }
    } catch (error) {
      console.error('❌ JSON suite failed:', error)
      if (suite === 'json') process.exit(1)
    }
  }

  if (suite === 'both' && bitfResults && jsonResults) {
    displayComparison(bitfResults, jsonResults)
  }

  if (global.gc && suite === 'both') {
    console.log('\n💾 Memory Usage (approximate):')

    global.gc()
    const bitfBefore = process.memoryUsage().heapUsed
    const { bitflag } = await import('../src/index')
    const { FLAGS } = await import('./utils/setup')
    const bitfInstances = Array.from({ length: 1000 }, () => bitflag(FLAGS.ALL))
    const bitfAfter = process.memoryUsage().heapUsed
    const bitfMemory = (bitfAfter - bitfBefore) / 1000

    global.gc()
    const jsonBefore = process.memoryUsage().heapUsed
    const { jsonFlag } = await import('./json-flags')
    const jsonInstances = Array.from({ length: 1000 }, () => jsonFlag(FLAGS.ALL))
    const jsonAfter = process.memoryUsage().heapUsed
    const jsonMemory = (jsonAfter - jsonBefore) / 1000

    console.log(`   bitf: ~${bitfMemory.toFixed(0)} bytes per instance`)
    console.log(`   JSON:  ~${jsonMemory.toFixed(0)} bytes per instance`)
    console.log(`   Ratio: ${(jsonMemory / bitfMemory).toFixed(1)}x more memory for JSON`)
  } else if (suite === 'both') {
    console.log('\n💡 Tip: Run with --expose-gc flag for memory usage comparison')
    console.log('   node --expose-gc node_modules/.bin/tsx benchmark/index.ts')
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)
  const options: RunnerOptions = {}

  for (const arg of args) {
    if (arg === '--bitf' || arg === '-b') {
      options.suite = 'bitf'
    } else if (arg === '--json' || arg === '-j') {
      options.suite = 'json'
    } else if (arg === '--no-compare') {
      options.compare = false
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true
    }
  }

  runBenchmarks(options).catch(error => {
    console.error('Benchmark failed:', error)
    process.exit(1)
  })
}
