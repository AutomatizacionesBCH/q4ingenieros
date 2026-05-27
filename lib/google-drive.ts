/**
 * lib/google-drive.ts
 *
 * Thin wrapper around the Google Drive API v3.
 * Uses a service account (server-to-server — no OAuth popup needed).
 *
 * Required env vars when Drive mode is active:
 *   GOOGLE_SERVICE_ACCOUNT_JSON   — full JSON key of the service account
 *   DRIVE_BOLETAS_FOLDER_ID       — ID of the "Boletas 2026" folder
 *   DRIVE_FACTURAS_FOLDER_ID      — ID of the "Facturas 2026" folder
 *   DRIVE_PROPUESTAS_FOLDER_ID    — ID of the "Propuestas de Cierre" folder
 *
 * To get a folder ID: open the folder in drive.google.com and copy the last
 * segment of the URL (after /folders/).
 *
 * The service account must be shared as "Viewer" on each folder (or parent).
 */

import { google } from 'googleapis'
import type { drive_v3 } from 'googleapis'

// ── Drive config detection ────────────────────────────────────────────────────
export function isDriveConfigured(): boolean {
  return !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON
}

// ── Lazy-initialised Drive client ─────────────────────────────────────────────
let _drive: drive_v3.Drive | null = null

function getDrive(): drive_v3.Drive {
  if (_drive) return _drive
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not set')

  const credentials = JSON.parse(raw)
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  })

  _drive = google.drive({ version: 'v3', auth })
  return _drive
}

// ── List all PDF files in a Drive folder ──────────────────────────────────────
export interface DriveFile {
  id:   string
  name: string
}

export async function listDrivePDFs(folderId: string): Promise<DriveFile[]> {
  const drive  = getDrive()
  const files: DriveFile[] = []
  let pageToken: string | undefined

  do {
    const res = await drive.files.list({
      q:          `'${folderId}' in parents and mimeType='application/pdf' and trashed=false`,
      fields:     'nextPageToken, files(id, name)',
      pageSize:   1000,
      pageToken,
    })
    for (const f of res.data.files ?? []) {
      if (f.id && f.name) files.push({ id: f.id, name: f.name })
    }
    pageToken = res.data.nextPageToken ?? undefined
  } while (pageToken)

  return files
}

// ── Download a file from Drive as a Buffer ────────────────────────────────────
export async function getDriveFileBuffer(fileId: string): Promise<Buffer> {
  const drive = getDrive()
  const res   = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' },
  )
  return Buffer.from(res.data as ArrayBuffer)
}
