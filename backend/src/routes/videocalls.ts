import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'

type Bindings = {
  DB: D1Database
  KV: KVNamespace
}

const app = new Hono<{ Bindings: Bindings }>()

interface SignalState {
  offer?: RTCSessionDescriptionInit
  answer?: RTCSessionDescriptionInit
  callerCandidates: RTCIceCandidateInit[]
  calleeCandidates: RTCIceCandidateInit[]
  peerCount: number          // how many peers have joined
  hostJoinedAt?: number      // timestamp of first joiner
}

function emptyState(): SignalState {
  return { callerCandidates: [], calleeCandidates: [], peerCount: 0 }
}

/* ─── Helper: read/write state via D1 ─────────────────────── */
async function readState(db: D1Database, key: string): Promise<SignalState> {
  try {
    const row = await db.prepare('SELECT value FROM kv_store WHERE key = ?').bind(key).first<{value: string}>()
    return row && row.value ? JSON.parse(row.value) : emptyState()
  } catch (err) {
    console.error(`[WebRTC] Failed to parse D1 KV for ${key}, resetting state`, err)
    return emptyState()
  }
}

async function writeState(db: D1Database, key: string, state: SignalState): Promise<void> {
  await db.prepare('INSERT OR REPLACE INTO kv_store (key, value, updated_at) VALUES (?, ?, ?)')
    .bind(key, JSON.stringify(state), Date.now())
    .run()
}

async function applySignal(state: SignalState, body: Record<string, unknown>): Promise<void> {
  if (body.offer) state.offer = body.offer as RTCSessionDescriptionInit
  if (body.answer) state.answer = body.answer as RTCSessionDescriptionInit
  if (body.candidate && body.role) {
    const cand = body.candidate as RTCIceCandidateInit
    if (body.role === 'caller') state.callerCandidates.push(cand)
    else state.calleeCandidates.push(cand)
  }
}

/* ════════════════════════════════════════════════════════════
   PUBLIC TEST-ROOM ENDPOINTS (no auth required)
   ════════════════════════════════════════════════════════════ */

/**
 * POST /videocalls/test/:id/join
 * Atomically assigns a role to the joining peer.
 * First peer → 'caller', second peer → 'callee', subsequent → 'full'
 */
app.post('/test/:id/join', async (c) => {
  const { id } = c.req.param()
  const key = `videocall:test-${id}`
  const state = await readState(c.env.DB, key)

  if (state.peerCount === 0) {
    state.peerCount = 1
    state.hostJoinedAt = Date.now()
    await writeState(c.env.DB, key, state)
    return c.json({ role: 'caller' })
  }

  if (state.peerCount === 1) {
    state.peerCount = 2
    await writeState(c.env.DB, key, state)
    return c.json({ role: 'callee' })
  }

  return c.json({ role: 'full' }, 409)
})

app.get('/test/:id/signal', async (c) => {
  const { id } = c.req.param()
  const state = await readState(c.env.DB, `videocall:test-${id}`)
  return c.json({ data: state })
})

app.post('/test/:id/signal', async (c) => {
  const { id } = c.req.param()
  const body = await c.req.json() as Record<string, unknown>
  const key = `videocall:test-${id}`

  if (body.clear) {
    await c.env.DB.prepare('DELETE FROM kv_store WHERE key = ?').bind(key).run()
    return c.json({ success: true })
  }

  const state = await readState(c.env.DB, key)
  await applySignal(state, body)
  await writeState(c.env.DB, key, state)
  return c.json({ success: true, data: state })
})

/* ════════════════════════════════════════════════════════════
   PROTECTED ENDPOINTS (auth required)
   ════════════════════════════════════════════════════════════ */
app.use('*', authMiddleware)

/**
 * POST /videocalls/:id/join
 * Same role-assignment logic for real consultations
 */
app.post('/:id/join', async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')
  const key = `videocall:${id}`

  const state = await readState(c.env.DB, key)

  if (state.peerCount === 0) {
    state.peerCount = 1
    await writeState(c.env.DB, key, state)
    return c.json({ role: 'caller' })
  }

  if (state.peerCount === 1) {
    state.peerCount = 2
    await writeState(c.env.DB, key, state)
    return c.json({ role: 'callee' })
  }

  return c.json({ role: 'full' }, 409)
})

app.get('/:id/signal', async (c) => {
  const { id } = c.req.param()
  const state = await readState(c.env.DB, `videocall:${id}`)
  return c.json({ data: state })
})

app.post('/:id/signal', async (c) => {
  const { id } = c.req.param()
  const body = await c.req.json() as Record<string, unknown>
  const key = `videocall:${id}`

  if (body.clear) {
    await c.env.DB.prepare('DELETE FROM kv_store WHERE key = ?').bind(key).run()
    return c.json({ success: true })
  }

  const state = await readState(c.env.DB, key)
  await applySignal(state, body)
  await writeState(c.env.DB, key, state)
  return c.json({ success: true, data: state })
})

export const videocallsRouter = app
