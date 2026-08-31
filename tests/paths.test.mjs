import test from 'node:test'
import assert from 'node:assert/strict'
import { dshHome } from '../lib/index.js'

test('uses DSH_HOME when resolving the active data root', () => {
  const previous = process.env.DSH_HOME
  process.env.DSH_HOME = 'C:\\dsh-archive-manager-test-home'
  try {
    assert.equal(dshHome(), 'C:\\dsh-archive-manager-test-home')
  } finally {
    if (previous === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previous
  }
})
