import { formatOps, formatRatio, formatSamples } from './format'
import { OPERATIONS, OperationName, type SuiteResults } from './setup'

export function displayComparison(bitfResults: SuiteResults, jsonResults: SuiteResults) {
  console.log(
    '\n╔════════════════════════════════════════════════════════════════════════════════╗'
  )
  console.log(
    '║                          BENCHMARK RESULTS                                        ║'
  )
  console.log('╠════════════════════╤═══════════════╤═══════════════╤═════════╤═════════════════╣')
  console.log('║ Operation          │ bitf ops/sec │ JSON ops/sec  │ Ratio   │ Samples         ║')
  console.log('╠════════════════════╪═══════════════╪═══════════════╪═════════╪═════════════════╣')

  let totalRatio = 0
  let validComparisons = 0

  for (const op of OPERATIONS) {
    const bitfResult = bitfResults.results.get(op)
    const jsonResult = jsonResults.results.get(op)

    if (!bitfResult || !jsonResult) continue

    const ratio = bitfResult.ops / jsonResult.ops
    totalRatio += ratio
    validComparisons++

    const opName = op.padEnd(18)
    const bitfOps = formatOps(bitfResult.ops).padStart(13)
    const jsonOps = formatOps(jsonResult.ops).padStart(13)
    const ratioStr = formatRatio(ratio).padStart(7)
    const samples = formatSamples(bitfResult.samples, jsonResult.samples).padStart(15)

    console.log(`║ ${opName} │ ${bitfOps} │ ${jsonOps} │ ${ratioStr} │ ${samples} ║`)

    if (bitfResult.rme > 3 || jsonResult.rme > 3) {
      const warning = `  ⚠ High RME: bitf=${bitfResult.rme.toFixed(2)}% json=${jsonResult.rme.toFixed(2)}%`
      console.log(`║ ${warning.padEnd(82)} ║`)
    }
  }

  console.log('╚════════════════════╧═══════════════╧═══════════════╧═════════╧═════════════════╝')

  if (validComparisons > 0) {
    const avgRatio = totalRatio / validComparisons
    console.log(`\n📊 Average Performance Improvement: ${formatRatio(avgRatio)} faster than JSON`)
  }

  console.log(`\n⏱️  Benchmark Time:`)
  console.log(`   bitf suite: ${(bitfResults.totalTime / 1000).toFixed(2)}s`)
  console.log(`   JSON suite:  ${(jsonResults.totalTime / 1000).toFixed(2)}s`)
}

export function displaySingleSuite(results: SuiteResults) {
  console.log(`\n═══ ${results.implementation.toUpperCase()} Benchmark Results ═══`)
  console.log('┌────────────────────┬───────────────┬──────────┬───────────┐')
  console.log('│ Operation          │ Ops/sec       │ RME %    │ Samples   │')
  console.log('├────────────────────┼───────────────┼──────────┼───────────┤')

  for (const op of OPERATIONS) {
    const result = results.results.get(op)
    if (!result) continue

    const opName = op.padEnd(18)
    const ops = formatOps(result.ops).padStart(13)
    const rme = result.rme.toFixed(2).padStart(8)
    const samples = result.samples.toString().padStart(9)

    console.log(`│ ${opName} │ ${ops} │ ${rme} │ ${samples} │`)
  }

  console.log('└────────────────────┴───────────────┴──────────┴───────────┘')
  console.log(`Total time: ${(results.totalTime / 1000).toFixed(2)}s`)
}
