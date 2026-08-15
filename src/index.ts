/**
 * dsh-archive-manager — host half (TypeScript source).
 *
 * This is the TypeScript source for lib/index.js. The compiled JavaScript
 * (lib/index.js) is the actual entry point dsh loads at runtime.
 *
 * Registers HTTP routes under /api/dsh-archive-manager/* that let the browser
 * settings card list and delete archived sessions.
 */

import type { Context } from '@deepseek-ai/cordis'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, rmSync, statSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'

/** Stable cordis plugin name. */
export const name = 'archive-manager'

/** Services required (webServer for route registration). */
export const inject = ['webServer']

/** DSH home directory. */
function dshHome(): string {
  return join(homedir(), '.dsh')
}

/** One archived session as returned to the browser. */
export interface ArchiveInfo {
  sessionId: string
  title: string | null
  workspacePath: string | null
  workspaceTitle: string | null
  workspaceId: string | null
  createdAt: number | null
  turns: number
  outputTokens: number
  dataSize: number
  hasDataFile: boolean
}

// (The full implementation is in lib/index.js — a plain JS file compiled
//  from this source. See lib/index.js for the complete route handlers,
//  storage reads/writes, and deletion logic.)
export function apply(ctx: Context, _config?: any): void {
  void ctx
  void _config
}
