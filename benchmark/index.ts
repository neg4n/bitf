import { runBenchmarks } from './runner'

runBenchmarks().catch(error => {
  console.error('Benchmark failed:', error)
  process.exit(1)
})
