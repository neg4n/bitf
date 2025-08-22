import { Bench } from 'tinybench'
import { defineBitflags, bitflag } from '../src/index'

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
  ALL: (1 << 0) | (1 << 1) | (1 << 2) | (1 << 3) | (1 << 4) | (1 << 5) | (1 << 6) | (1 << 7)
})

function formatNumber(num: number): string {
  return num.toLocaleString('en-US')
}

function formatResult(task: any): string {
  if (!task.result) return 'Failed'
  const ops = Math.round(task.result.hz)
  const rme = task.result.rme?.toFixed(2) || '0.00'
  const samples = task.result.samples.length
  return `${formatNumber(ops).padStart(11)} ops/sec ±${rme}% (${samples} runs sampled)`
}

export async function runOperationsBenchmark() {
  // Create test subjects
  const singleFlag = bitflag(FLAGS.FLAG_0)
  const multiFlags = bitflag(FLAGS.FLAG_0 | FLAGS.FLAG_1 | FLAGS.FLAG_2)
  const allFlags = bitflag(FLAGS.ALL)
  
  const bench = new Bench({ 
    time: 100
  })

  // Add benchmarks - Library operations
  bench
    // Check operations
    .add('[lib] has() single', () => {
      return singleFlag.has(FLAGS.FLAG_0)
    })
    .add('[lib] has() double', () => {
      return multiFlags.has(FLAGS.FLAG_0, FLAGS.FLAG_1)
    })
    .add('[lib] hasAny()', () => {
      return multiFlags.hasAny(FLAGS.FLAG_0, FLAGS.FLAG_5)
    })
    .add('[lib] hasExact()', () => {
      return multiFlags.hasExact(FLAGS.FLAG_0, FLAGS.FLAG_1, FLAGS.FLAG_2)
    })
    
    // Mutation operations
    .add('[lib] add() single', () => {
      return singleFlag.add(FLAGS.FLAG_5)
    })
    .add('[lib] add() multiple', () => {
      return singleFlag.add(FLAGS.FLAG_5, FLAGS.FLAG_6)
    })
    .add('[lib] remove() single', () => {
      return multiFlags.remove(FLAGS.FLAG_1)
    })
    .add('[lib] remove() multiple', () => {
      return allFlags.remove(FLAGS.FLAG_0, FLAGS.FLAG_1)
    })
    .add('[lib] toggle()', () => {
      return multiFlags.toggle(FLAGS.FLAG_5)
    })
    .add('[lib] clear()', () => {
      return allFlags.clear()
    })
    
    // Property access
    .add('[lib] value getter', () => {
      return multiFlags.value
    })
    .add('[lib] valueOf()', () => {
      return multiFlags.valueOf()
    })

  // Raw bitwise operations for comparison
  bench
    // Check operations
    .add('[raw] AND check single', () => {
      const value = 7 // 0b111
      return (value & 1) === 1
    })
    .add('[raw] AND check double', () => {
      const value = 7 // 0b111
      return (value & 1) === 1 && (value & 2) === 2
    })
    .add('[raw] AND check any', () => {
      const value = 7 // 0b111
      const mask = 1 | 32 // FLAG_0 | FLAG_5
      return (value & mask) !== 0
    })
    .add('[raw] equality check', () => {
      const value = 7 // 0b111
      const expected = 7
      return value === expected
    })
    
    // Mutation operations
    .add('[raw] OR single', () => {
      const value = 1
      return value | 32
    })
    .add('[raw] OR multiple', () => {
      const value = 1
      return value | 32 | 64
    })
    .add('[raw] AND NOT single', () => {
      const value = 7
      return value & ~2
    })
    .add('[raw] AND NOT multiple', () => {
      const value = 255
      return value & ~(1 | 2)
    })
    .add('[raw] XOR toggle', () => {
      const value = 7
      return value ^ 32
    })
    .add('[raw] clear (assign 0)', () => {
      return 0
    })
    
    // Direct access
    .add('[raw] variable access', () => {
      const value = 7
      return value
    })
    .add('[raw] identity return', () => {
      const value = 7
      return value
    })

  // Run benchmarks
  console.log('Benchmark:')
  await bench.run()
  
  // Sort and display results by category
  const libTasks = bench.tasks.filter(t => t.name.startsWith('[lib]'))
  const rawTasks = bench.tasks.filter(t => t.name.startsWith('[raw]'))
  
  // Sort by performance (highest to lowest)
  libTasks.sort((a, b) => (b.result?.hz || 0) - (a.result?.hz || 0))
  rawTasks.sort((a, b) => (b.result?.hz || 0) - (a.result?.hz || 0))
  
  // Find max name length for alignment
  const allTasks = [...libTasks, ...rawTasks]
  const maxNameLength = Math.max(...allTasks.map(t => t.name.length))
  
  // Display library operations
  console.log('\n  Library operations (sorted by performance):')
  libTasks.forEach(task => {
    const name = task.name.padEnd(maxNameLength + 2)
    console.log(`  ${name}${formatResult(task)}`)
  })
  
  // Display raw operations
  console.log('\n  Raw bitwise operations (sorted by performance):')
  rawTasks.forEach(task => {
    const name = task.name.padEnd(maxNameLength + 2)
    console.log(`  ${name}${formatResult(task)}`)
  })
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runOperationsBenchmark().catch(console.error)
}
