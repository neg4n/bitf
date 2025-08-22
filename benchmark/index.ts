import { runOperationsBenchmark } from './operations'

async function runBenchmark() {
  console.log('# bflag benchmarks')
  console.log(`# Node ${process.version}\n`)
  
  await runOperationsBenchmark()
}

runBenchmark().catch(error => {
  console.error('Benchmark failed:', error)
  process.exit(1)
})