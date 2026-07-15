import { NextRequest } from 'next/server'

// Use globalThis to maintain the set of connected SSE clients across hot-reloads and route invocations
type SSEClient = {
  id: string
  userId: string
  controller: ReadableStreamDefaultController
}

declare global {
  var sseClients: Set<SSEClient> | undefined
}

if (!globalThis.sseClients) {
  globalThis.sseClients = new Set<SSEClient>()
}

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) {
    return new Response('Missing userId', { status: 400 })
  }

  const stream = new ReadableStream({
    start(controller) {
      const client: SSEClient = {
        id: Math.random().toString(36).substring(2),
        userId,
        controller,
      }

      globalThis.sseClients!.add(client)

      // Send initial connection event
      const msg = `data: ${JSON.stringify({ type: 'connected' })}\n\n`
      controller.enqueue(new TextEncoder().encode(msg))

      // Keep connection alive with a ping every 20 seconds
      const intervalId = setInterval(() => {
        try {
          const pingMsg = `data: ${JSON.stringify({ type: 'ping' })}\n\n`
          controller.enqueue(new TextEncoder().encode(pingMsg))
        } catch {
          // If write fails, the stream is likely closed
          clearInterval(intervalId)
          globalThis.sseClients!.delete(client)
        }
      }, 20000)

      req.signal.addEventListener('abort', () => {
        clearInterval(intervalId)
        globalThis.sseClients!.delete(client)
        try {
          controller.close()
        } catch {}
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  })
}

// Helper to broadcast events to a specific user
export function notifyUser(userId: string, event: string, payload: any) {
  if (!globalThis.sseClients) return
  const dataStr = JSON.stringify({ event, payload })
  const msg = `data: ${dataStr}\n\n`
  const encoded = new TextEncoder().encode(msg)

  for (const client of globalThis.sseClients) {
    if (client.userId === userId) {
      try {
        client.controller.enqueue(encoded)
      } catch (err) {
        console.error('Failed to send SSE to client', client.id, err)
        globalThis.sseClients.delete(client)
      }
    }
  }
}

// Helper to broadcast events to all connected users
export function broadcastEvent(event: string, payload: any) {
  if (!globalThis.sseClients) return
  const dataStr = JSON.stringify({ event, payload })
  const msg = `data: ${dataStr}\n\n`
  const encoded = new TextEncoder().encode(msg)

  for (const client of globalThis.sseClients) {
    try {
      client.controller.enqueue(encoded)
    } catch (err) {
      console.error('Failed to send SSE to client during broadcast', client.id, err)
      globalThis.sseClients.delete(client)
    }
  }
}
