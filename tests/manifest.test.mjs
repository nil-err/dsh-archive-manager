import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('declares the supported DSH client SDK packages', async () => {
  const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  const injected = manifest.dsh.client.inject

  assert.deepEqual(injected, [
    '@deepseek-ai/dsh-client-runtime',
    '@deepseek-ai/dsh-client-locale',
    '@deepseek-ai/dsh-client-ui-settings',
  ])
  assert.equal(injected.includes('@deepseek-ai/dsh-client-ui-slots'), false)
  assert.equal(manifest.dependencies['@deepseek-ai/dsh-home-paths'], '0.1.2-alpha.2')
  assert.equal(manifest.dsh.engines.dsh, '>=0.1.2-alpha.2')
})
