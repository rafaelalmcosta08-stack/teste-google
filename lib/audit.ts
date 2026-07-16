import { promises as fs } from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const DATA_FILE = path.join(process.cwd(), 'audit-logs-data.json')

export interface AuditEntry {
  id: string
  whoId: string
  whoQra: string
  action: string
  targetUser: string
  description: string
  createdAt: string
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function readAuditLogs(): Promise<AuditEntry[]> {
  const admin = getAdminClient()
  if (admin) {
    try {
      const { data, error } = await admin
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(2000)
      if (!error && data) {
        return data.map((row: any) => ({
          id: row.id,
          whoId: row.who_id,
          whoQra: row.who_qra,
          action: row.action,
          targetUser: row.target_user,
          description: row.description,
          createdAt: row.created_at || new Date().toISOString()
        }))
      }
    } catch (e) {
      console.error('Failed to read audit logs from Supabase, falling back to local file:', e)
    }
  }

  try {
    const content = await fs.readFile(DATA_FILE, 'utf8')
    return JSON.parse(content)
  } catch (_) {
    return []
  }
}

export async function writeAuditLog(entry: Omit<AuditEntry, 'id' | 'createdAt'>) {
  const newEntry: AuditEntry = {
    ...entry,
    id: Math.random().toString(36).substring(2, 11),
    createdAt: new Date().toISOString()
  }

  // 1. Write locally
  let currentLogs: AuditEntry[] = []
  try {
    const content = await fs.readFile(DATA_FILE, 'utf8')
    currentLogs = JSON.parse(content)
  } catch (_) {}

  currentLogs.unshift(newEntry)
  // Limit local file to 1000 items
  if (currentLogs.length > 1000) {
    currentLogs = currentLogs.slice(0, 1000)
  }

  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(currentLogs, null, 2), 'utf8')
  } catch (err) {
    console.error('Error writing local audit log:', err)
  }

  // 2. Write to Supabase (best effort)
  const admin = getAdminClient()
  if (admin) {
    try {
      await admin.from('audit_logs').insert([{
        id: newEntry.id,
        who_id: newEntry.whoId,
        who_qra: newEntry.whoQra,
        action: newEntry.action,
        target_user: newEntry.targetUser,
        description: newEntry.description,
        created_at: newEntry.createdAt
      }])
    } catch (err) {
      console.error('Error writing Supabase audit log:', err)
    }
  }

  // Broadcast an SSE update if any clients are listening for audit logs
  try {
    const { broadcastEvent } = await import('@/app/api/events/route')
    broadcastEvent('audit-logs-updated', { newEntry })
  } catch (_) {}
}
