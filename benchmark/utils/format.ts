export function formatOps(ops: number): string {
  if (ops >= 1_000_000_000) {
    return `${(ops / 1_000_000_000).toFixed(2)}B`
  } else if (ops >= 1_000_000) {
    return `${(ops / 1_000_000).toFixed(2)}M`
  } else if (ops >= 1_000) {
    return `${(ops / 1_000).toFixed(2)}K`
  }
  return ops.toFixed(0)
}

export function formatNumber(num: number): string {
  return num.toLocaleString('en-US')
}

export function calculateCV(stdDev: number, mean: number): number {
  return mean > 0 ? stdDev / mean : 0
}

export function formatRatio(ratio: number): string {
  if (ratio >= 100) {
    return `${ratio.toFixed(0)}x`
  } else if (ratio >= 10) {
    return `${ratio.toFixed(1)}x`
  } else {
    return `${ratio.toFixed(2)}x`
  }
}

export function formatSamples(bitfSamples: number, jsonSamples: number): string {
  const bitfStr =
    bitfSamples >= 1000 ? `${(bitfSamples / 1000).toFixed(0)}k` : bitfSamples.toString()
  const jsonStr =
    jsonSamples >= 1000 ? `${(jsonSamples / 1000).toFixed(0)}k` : jsonSamples.toString()
  return `${bitfStr}/${jsonStr}`
}
