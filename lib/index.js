/**
 * dsh-archive-manager — host half (plain JavaScript).
 *
 * Registers HTTP routes under /api/dsh-archive-manager/* that let the browser
 * settings card list, restore, and delete archived sessions. An "archived session" is
 * recorded in ~/.dsh/storages/workspace.json (global.archivedSessionIds) and
 * its metadata lives in ~/.dsh/storages/session_projcache.json; the session
 * data file (session.jsonl.zstd) sits in ~/.dsh/sessions/<workspace-dir>/.
 *
 * Routes (all loopback-only, same-origin):
 *   GET  /api/dsh-archive-manager/archives   — list archived sessions (with title parsed from zstd)
 *   POST /api/dsh-archive-manager/unarchive  — restore one or more sessions from archive via workspaceRegistry
 *   POST /api/dsh-archive-manager/delete     — delete one or more sessions completely (from disk, projcache, and workspace sessionIds)
 *   POST /api/dsh-archive-manager/delete-all — delete every archived session
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, rmSync, statSync, readdirSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { homedir } from 'node:os'
import { execFileSync } from 'node:child_process'

/** Stable cordis plugin name. */
export const name = 'archive-manager'

/** Services required (webServer for route registration, workspaceRegistry for live state sync). */
export const inject = ['webServer', 'workspaceRegistry']

/** API path prefix. */
const API_PREFIX = '/api/dsh-archive-manager'

/** Cap on JSON request bodies. */
const MAX_JSON_BODY_BYTES = 256 * 1024

/** DSH home directory. */
function dshHome() {
  return join(homedir(), '.dsh')
}

/** Path to workspace.json. */
function workspacePath() {
  return join(dshHome(), 'storages', 'workspace.json')
}

/** Path to session_projcache.json. */
function projcachePath() {
  return join(dshHome(), 'storages', 'session_projcache.json')
}

/** Path to sessions directory. */
function sessionsDir() {
  return join(dshHome(), 'sessions')
}

/** Read and parse JSON safely. */
function readJsonFile(filePath) {
  if (!existsSync(filePath)) return undefined
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'))
  } catch {
    return undefined
  }
}

/** Write JSON atomically (tmp + rename). */
function writeJsonFile(filePath, data) {
  const dir = dirname(filePath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 })
  const tmp = filePath + '.tmp'
  writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 })
  renameSync(tmp, filePath)
}

/**
 * Find the session data directory for a given session id.
 * Searches all workspace sub-directories under ~/.dsh/sessions/.
 */
function findSessionDir(sessionId) {
  const root = sessionsDir()
  if (!existsSync(root)) return undefined
  for (const entry of readdirSync(root)) {
    const dir = join(root, entry)
    try {
      if (statSync(dir).isDirectory()) {
        const sessionDir = join(dir, sessionId)
        if (existsSync(sessionDir)) return sessionDir
      }
    } catch {
      // skip unreadable entries
    }
  }
  return undefined
}

/** Get total size of a directory (recursive). */
function dirSize(dir) {
  let total = 0
  if (!existsSync(dir)) return 0
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      const stat = statSync(full)
      if (stat.isDirectory()) {
        total += dirSize(full)
      } else {
        total += stat.size
      }
    }
  } catch {
    // best effort
  }
  return total
}

/** Read title and metadata directly from session.jsonl.zstd if missing from projcache. */
function readSessionMetaFromZstd(dataFile) {
  if (!existsSync(dataFile)) return {}
  try {
    const out = execFileSync('zstd', ['-dc', dataFile], {
      maxBuffer: 10 * 1024 * 1024,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    })
    let title = null
    let createdAt = null
    let cwd = null
    let firstUserMsg = null

    const lines = out.split('\n')
    for (const line of lines) {
      if (!line) continue
      try {
        const ev = JSON.parse(line)
        if (ev.type === 'session') {
          if (ev.createdAt) createdAt = ev.createdAt
          if (ev.cwd) cwd = ev.cwd
        } else if (ev.type === 'session/title/set' || ev.type === 'title') {
          title = ev.title || ev.data?.title || title
        } else if (!firstUserMsg && (ev.type === 'user/message' || ev.type === 'agent/inbox/spliced')) {
          const text =
            ev.data?.content?.[0]?.text ||
            ev.inserted?.[0]?.content?.[0]?.text ||
            ev.data?.inserted?.[0]?.content?.[0]?.text
          if (text) firstUserMsg = text
        }
      } catch {}
    }
    return { title: title || firstUserMsg, createdAt, cwd }
  } catch {
    return {}
  }
}

/**
 * List every archived session with metadata from session_projcache.json and
 * workspace.json, fallback parsing directly from session.jsonl.zstd.
 */
function listArchives(ctx) {
  const workspace = readJsonFile(workspacePath())
  const projcache = readJsonFile(projcachePath())

  const archivedIds = ctx?.workspaceRegistry?.archivedSessionIds ?? workspace?.global?.archivedSessionIds ?? []
  const workspaces = workspace?.tables?.workspaces ?? {}
  const sessions = projcache?.tables?.sessions ?? {}

  // Build a reverse map: sessionId -> workspace info
  const sessionToWorkspace = new Map()
  for (const [wsId, ws] of Object.entries(workspaces)) {
    const wsPath = ws.path ?? ''
    const wsTitle = ws.title || (wsPath ? basename(wsPath) : '')
    for (const sid of ws.sessionIds ?? []) {
      sessionToWorkspace.set(sid, { id: wsId, path: wsPath, title: wsTitle })
    }
  }

  const result = []
  const ghostIds = []

  for (const sid of archivedIds) {
    const wsInfo = sessionToWorkspace.get(sid)
    const sessionMeta = sessions[sid]
    const rows = sessionMeta?.rows ?? {}

    let title = rows.title?.val ?? null
    let createdAt = sessionMeta?.identity?.createdAt ?? null
    const turns = rows.sessionStats?.val?.turns ?? 0
    const outputTokens = rows.tokenUsage?.val?.totals?.outputTokens ?? 0

    const dataDir = findSessionDir(sid)
    let dataSize = 0
    let hasDataFile = false
    let zstdPath = null

    if (dataDir !== undefined) {
      dataSize = dirSize(dataDir)
      zstdPath = join(dataDir, 'session.jsonl.zstd')
      hasDataFile = existsSync(zstdPath)
    }

    // GHOST DETECTION: If a session has no disk file and no projcache record, it is a ghost residue
    if (!hasDataFile && !sessionMeta) {
      ghostIds.push(sid)
      continue
    }

    let cwd = wsInfo?.path ?? null
    if (hasDataFile && (!title || !createdAt)) {
      const zstdMeta = readSessionMetaFromZstd(zstdPath)
      if (!title && zstdMeta.title) title = zstdMeta.title
      if (!createdAt && zstdMeta.createdAt) createdAt = zstdMeta.createdAt
      if (!cwd && zstdMeta.cwd) cwd = zstdMeta.cwd
    }

    let workspaceTitle = wsInfo?.title || null
    let workspacePathStr = wsInfo?.path || null
    if (!workspaceTitle && cwd) {
      workspaceTitle = basename(cwd)
      workspacePathStr = cwd
    }

    result.push({
      sessionId: sid,
      title: title || '未命名对话',
      workspacePath: workspacePathStr,
      workspaceTitle: workspaceTitle,
      workspaceId: wsInfo?.id ?? null,
      createdAt,
      turns,
      outputTokens,
      dataSize,
      hasDataFile,
    })
  }

  // Auto-prune ghost IDs from workspace.json in the background
  if (ghostIds.length > 0 && workspace?.global?.archivedSessionIds) {
    try {
      workspace.global.archivedSessionIds = workspace.global.archivedSessionIds.filter(id => !ghostIds.includes(id))
      writeJsonFile(workspacePath(), workspace)
    } catch {}
  }

  result.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
  return result
}

/**
 * Restore one or more archived sessions using live workspaceRegistry:
 * Calls setState on workspaceRegistry to immediately push changes to SSE clients.
 */
async function unarchiveSessions(ctx, sessionIds) {
  const unarchived = []
  const notFound = []
  const errors = []

  const registry = ctx?.workspaceRegistry
  if (registry && typeof registry.requireState === 'function' && typeof registry.setState === 'function') {
    try {
      const state = registry.requireState()
      const currentArchived = Array.isArray(state.archivedSessionIds) ? [...state.archivedSessionIds] : []
      const nextArchived = []
      for (const id of currentArchived) {
        if (sessionIds.includes(id)) {
          unarchived.push(id)
        } else {
          nextArchived.push(id)
        }
      }
      for (const id of sessionIds) {
        if (!unarchived.includes(id)) {
          notFound.push(id)
        }
      }
      if (unarchived.length > 0) {
        await registry.setState({
          ...state,
          archivedSessionIds: nextArchived,
        })
      }
    } catch (err) {
      errors.push('workspaceRegistry.setState: ' + (err instanceof Error ? err.message : String(err)))
    }
    return { unarchived, notFound, errors }
  }

  // Fallback to file modification if registry service unavailable
  const workspace = readJsonFile(workspacePath())
  if (!workspace) {
    return { unarchived, notFound: sessionIds, errors: ['workspace.json not found'] }
  }

  if (Array.isArray(workspace.global?.archivedSessionIds)) {
    const origLen = workspace.global.archivedSessionIds.length
    for (const sid of sessionIds) {
      const idx = workspace.global.archivedSessionIds.indexOf(sid)
      if (idx !== -1) {
        workspace.global.archivedSessionIds.splice(idx, 1)
        unarchived.push(sid)
      } else {
        notFound.push(sid)
      }
    }
    if (workspace.global.archivedSessionIds.length !== origLen) {
      try {
        writeJsonFile(workspacePath(), workspace)
      } catch (err) {
        errors.push('workspace.json write error: ' + (err instanceof Error ? err.message : String(err)))
      }
    }
  } else {
    notFound.push(...sessionIds)
  }

  return { unarchived, notFound, errors }
}

/**
 * Delete one or more archived sessions COMPLETELY:
 *   1. Remove from workspace.json -> global.archivedSessionIds
 *   2. Remove from every workspace in workspace.json -> tables.workspaces[id].sessionIds
 *   3. Remove from live workspace entities in workspaceRegistry (if available)
 *   4. Remove from session_projcache.json
 *   5. Remove on-disk session data directory from ~/.dsh/sessions/
 *   6. Push updated state to workspaceRegistry to notify all frontend clients
 */
async function deleteSessions(ctx, sessionIds) {
  const removed = []
  const notFound = []
  const errors = []

  const workspace = readJsonFile(workspacePath())
  const projcache = readJsonFile(projcachePath())

  let wsChanged = false
  let pcChanged = false

  for (const sid of sessionIds) {
    let found = false

    // 1. Remove from workspace.json -> global.archivedSessionIds
    if (workspace?.global?.archivedSessionIds) {
      const before = workspace.global.archivedSessionIds.length
      workspace.global.archivedSessionIds = workspace.global.archivedSessionIds.filter(
        (id) => id !== sid,
      )
      if (workspace.global.archivedSessionIds.length !== before) {
        wsChanged = true
        found = true
      }
    }

    // 2. CRITICAL: Remove from every workspace's sessionIds in workspace.json
    if (workspace?.tables?.workspaces) {
      for (const ws of Object.values(workspace.tables.workspaces)) {
        if (Array.isArray(ws.sessionIds)) {
          const before = ws.sessionIds.length
          ws.sessionIds = ws.sessionIds.filter((id) => id !== sid)
          if (ws.sessionIds.length !== before) {
            wsChanged = true
            found = true
          }
        }
      }
    }

    // 3. Remove metadata from session_projcache.json
    if (projcache?.tables?.sessions && projcache.tables.sessions[sid] !== undefined) {
      delete projcache.tables.sessions[sid]
      pcChanged = true
      found = true
    }

    // 4. Remove session data files on disk
    const dataDir = findSessionDir(sid)
    if (dataDir !== undefined) {
      try {
        rmSync(dataDir, { recursive: true, force: true })
        found = true
      } catch (err) {
        errors.push(sid + ': ' + (err instanceof Error ? err.message : String(err)))
      }
    }

    if (found) {
      removed.push(sid)
    } else {
      notFound.push(sid)
    }
  }

  // 5. Update workspaceRegistry live in memory (if available) so it doesn't resurrect sessions
  const registry = ctx?.workspaceRegistry
  if (registry) {
    try {
      // Sync entities map
      if (registry.entities && typeof registry.entities.values === 'function') {
        for (const entity of registry.entities.values()) {
          if (Array.isArray(entity.sessionIds)) {
            entity.sessionIds = entity.sessionIds.filter((id) => !sessionIds.includes(id))
          }
        }
      }

      // Sync workspace table records if storageTable exists
      const table = typeof registry.requireTable === 'function' ? registry.requireTable() : null
      if (table && workspace?.tables?.workspaces) {
        for (const [wsId, ws] of Object.entries(workspace.tables.workspaces)) {
          try {
            await table.set(wsId, ws)
          } catch {}
        }
      }

      // Sync global archivedSessionIds state
      if (typeof registry.requireState === 'function' && typeof registry.setState === 'function') {
        const state = registry.requireState()
        const currentArchived = Array.isArray(state.archivedSessionIds) ? [...state.archivedSessionIds] : []
        const nextArchived = currentArchived.filter((id) => !sessionIds.includes(id))
        await registry.setState({
          ...state,
          archivedSessionIds: nextArchived,
        })
      }
    } catch (err) {
      errors.push('workspaceRegistry sync: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  // 6. Persist atomic writes to disk
  if (wsChanged && workspace !== undefined) {
    try {
      writeJsonFile(workspacePath(), workspace)
    } catch (err) {
      errors.push('workspace.json write: ' + (err instanceof Error ? err.message : String(err)))
    }
  }
  if (pcChanged && projcache !== undefined) {
    try {
      writeJsonFile(projcachePath(), projcache)
    } catch (err) {
      errors.push('session_projcache.json write: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  return { removed, notFound, errors }
}

/** Loopback literal check plus browser same-origin markers. */
function isLoopbackRequest(request) {
  const address = request.socket?.remoteAddress
  if (address !== '127.0.0.1' && address !== '::1' && address !== '::ffff:127.0.0.1') return false
  const host = request.headers.host
  if (typeof host !== 'string') return false
  let hostUrl
  try {
    hostUrl = new URL('http://' + host)
  } catch {
    return false
  }
  if (hostUrl.hostname !== '127.0.0.1' && hostUrl.hostname !== 'localhost' && hostUrl.hostname !== '[::1]') return false
  if (request.headers['sec-fetch-site'] === 'cross-site') return false
  const origin = request.headers.origin
  if (origin === undefined) return true
  try {
    return new URL(origin).host === hostUrl.host
  } catch {
    return false
  }
}

/** Write a JSON response. */
function writeJson(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'referrer-policy': 'no-referrer',
  })
  res.end(payload)
}

/** Read a JSON request body. */
async function readJsonBody(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    const buffer = chunk
    size += buffer.length
    if (size > MAX_JSON_BODY_BYTES) return undefined
    chunks.push(buffer)
  }
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    return typeof parsed === 'object' && parsed !== null ? parsed : undefined
  } catch {
    return undefined
  }
}

/**
 * Mount the archive-manager HTTP routes.
 * @param ctx - host plugin context carrying webServer and workspaceRegistry.
 * @param _config - resolved plugin config (unused).
 */
export function apply(ctx, _config) {
  const route = {
    kind: 'exact',
    path: API_PREFIX + '/archives',
    handler: async (req, res) => {
      if (!isLoopbackRequest(req)) {
        writeJson(res, 403, { error: 'forbidden: loopback-only' })
        return
      }
      if (req.method !== 'GET') {
        writeJson(res, 405, { error: 'method not allowed: ' + req.method })
        return
      }
      try {
        const archives = listArchives(ctx)
        writeJson(res, 200, { archives, total: archives.length })
      } catch (err) {
        writeJson(res, 500, { error: err instanceof Error ? err.message : String(err) })
      }
    },
  }

  const unarchiveRoute = {
    kind: 'exact',
    path: API_PREFIX + '/unarchive',
    handler: async (req, res) => {
      if (!isLoopbackRequest(req)) {
        writeJson(res, 403, { error: 'forbidden: loopback-only' })
        return
      }
      if (req.method !== 'POST') {
        writeJson(res, 405, { error: 'method not allowed: ' + req.method })
        return
      }
      const body = await readJsonBody(req)
      if (body === undefined) {
        writeJson(res, 400, { error: 'invalid JSON body' })
        return
      }
      const ids = Array.isArray(body.sessionIds)
        ? body.sessionIds.filter((x) => typeof x === 'string')
        : typeof body.sessionId === 'string'
          ? [body.sessionId]
          : []
      if (ids.length === 0) {
        writeJson(res, 400, { error: 'sessionIds (array) or sessionId (string) is required' })
        return
      }
      try {
        const result = await unarchiveSessions(ctx, ids)
        writeJson(res, 200, result)
      } catch (err) {
        writeJson(res, 500, { error: err instanceof Error ? err.message : String(err) })
      }
    },
  }

  const deleteRoute = {
    kind: 'exact',
    path: API_PREFIX + '/delete',
    handler: async (req, res) => {
      if (!isLoopbackRequest(req)) {
        writeJson(res, 403, { error: 'forbidden: loopback-only' })
        return
      }
      if (req.method !== 'POST') {
        writeJson(res, 405, { error: 'method not allowed: ' + req.method })
        return
      }
      const body = await readJsonBody(req)
      if (body === undefined) {
        writeJson(res, 400, { error: 'invalid JSON body' })
        return
      }
      const ids = Array.isArray(body.sessionIds)
        ? body.sessionIds.filter((x) => typeof x === 'string')
        : typeof body.sessionId === 'string'
          ? [body.sessionId]
          : []
      if (ids.length === 0) {
        writeJson(res, 400, { error: 'sessionIds (array) or sessionId (string) is required' })
        return
      }
      try {
        const result = await deleteSessions(ctx, ids)
        writeJson(res, 200, result)
      } catch (err) {
        writeJson(res, 500, { error: err instanceof Error ? err.message : String(err) })
      }
    },
  }

  const deleteAllRoute = {
    kind: 'exact',
    path: API_PREFIX + '/delete-all',
    handler: async (req, res) => {
      if (!isLoopbackRequest(req)) {
        writeJson(res, 403, { error: 'forbidden: loopback-only' })
        return
      }
      if (req.method !== 'POST') {
        writeJson(res, 405, { error: 'method not allowed: ' + req.method })
        return
      }
      try {
        const archives = listArchives(ctx)
        const ids = archives.map((a) => a.sessionId)
        if (ids.length === 0) {
          writeJson(res, 200, { removed: [], notFound: [], errors: [], total: 0 })
          return
        }
        const result = await deleteSessions(ctx, ids)
        writeJson(res, 200, { ...result, total: ids.length })
      } catch (err) {
        writeJson(res, 500, { error: err instanceof Error ? err.message : String(err) })
      }
    },
  }

  const routes = [route, unarchiveRoute, deleteRoute, deleteAllRoute]

  ctx.effect(
    () => {
      const disposers = routes.map((r) => ctx.webServer.register(r))
      return () => {
        for (const dispose of disposers) dispose()
      }
    },
    'dsh-archive-manager: routes',
  )
}
