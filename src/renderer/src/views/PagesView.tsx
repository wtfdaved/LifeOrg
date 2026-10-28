import { useEffect, useMemo, useState } from 'react'
import type { PartialBlock } from '@blocknote/core'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import { uid, useStore } from '../lib/store'
import type { Page } from '../lib/types'
import type { Scheme } from '../lib/theme'

const MAX_IMAGE_BYTES = 8 * 1024 * 1024

// Files are embedded as data URLs so they live inside the encrypted vault, not on disk or online.
async function embedFile(file: File): Promise<string> {
  if (file.size > MAX_IMAGE_BYTES) throw new Error('Files larger than 8 MB are not supported.')
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

interface Props {
  openPageId: string | null
  onOpenPage: (id: string | null) => void
  scheme: Scheme
}

export function PagesView({ openPageId, onOpenPage, scheme }: Props) {
  const { data, update } = useStore()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')

  const page = data.pages.find((p) => p.id === openPageId) ?? data.pages[0]

  useEffect(() => {
    if (page && page.id !== openPageId) onOpenPage(page.id)
  }, [page, openPageId, onOpenPage])

  const children = useMemo(() => {
    const map = new Map<string | null, Page[]>()
    for (const p of data.pages) {
      const list = map.get(p.parentId) ?? []
      list.push(p)
      map.set(p.parentId, list)
    }
    return map
  }, [data.pages])

  const createPage = (parentId: string | null) => {
    const now = new Date().toISOString()
    const p: Page = { id: uid(), title: '', icon: '📄', parentId, content: [], createdAt: now, updatedAt: now }
    update((d) => ({ ...d, pages: [...d.pages, p] }))
    if (parentId) setCollapsed((s) => new Set([...s].filter((id) => id !== parentId)))
    onOpenPage(p.id)
  }

  const deletePage = (target: Page) => {
    const doomed = new Set<string>([target.id])
    let grew = true
    while (grew) {
      grew = false
      for (const p of data.pages) {
        if (p.parentId && doomed.has(p.parentId) && !doomed.has(p.id)) {
          doomed.add(p.id)
          grew = true
        }
      }
    }
    const extra = doomed.size - 1
    if (!confirm(`Delete "${target.title || 'Untitled'}"${extra ? ` and ${extra} sub-page(s)` : ''}? This cannot be undone.`))
      return
    update((d) => ({ ...d, pages: d.pages.filter((p) => !doomed.has(p.id)) }))
    onOpenPage(null)
  }

  const patchPage = (id: string, patch: Partial<Page>) =>
    update((d) => ({
      ...d,
      pages: d.pages.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p))
    }))

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return null
    return data.pages.filter((p) => p.title.toLowerCase().includes(q) || JSON.stringify(p.content).toLowerCase().includes(q))
  }, [query, data.pages])

  const renderTree = (parentId: string | null, depth: number) =>
    (children.get(parentId) ?? []).map((p) => {
      const kids = children.get(p.id)
      const isCollapsed = collapsed.has(p.id)
      return (
        <div key={p.id}>
          <div className={`tree-item ${page?.id === p.id ? 'active' : ''}`} style={{ paddingLeft: 6 + depth * 14 }}>
            <button
              className="icon-btn caret"
              style={{ visibility: kids ? 'visible' : 'hidden' }}
              onClick={() =>
                setCollapsed((s) => {
                  const next = new Set(s)
                  if (next.has(p.id)) next.delete(p.id)
                  else next.add(p.id)
                  return next
                })
              }
            >
              {isCollapsed ? '▸' : '▾'}
            </button>
            <button className="tree-label" onClick={() => onOpenPage(p.id)}>
              {p.icon} {p.title || 'Untitled'}
            </button>
            <button className="icon-btn" title="Add sub-page" onClick={() => createPage(p.id)}>
              +
            </button>
          </div>
          {kids && !isCollapsed && renderTree(p.id, depth + 1)}
        </div>
      )
    })

  return (
    <div className="two-pane">
      <aside className="pane-side">
        <div className="side-header">
          <h3>Pages</h3>
          <button className="btn small" onClick={() => createPage(null)}>
            + Page
          </button>
        </div>
        <input className="small-input" placeholder="Search pages…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="tree">
          {searchResults
            ? searchResults.map((p) => (
                <div key={p.id} className={`tree-item ${page?.id === p.id ? 'active' : ''}`}>
                  <button className="tree-label" onClick={() => onOpenPage(p.id)}>
                    {p.icon} {p.title || 'Untitled'}
                  </button>
                </div>
              ))
            : renderTree(null, 0)}
        </div>
      </aside>
      <section className="pane-main page-pane">
        {page ? (
          <>
            <div className="page-header">
              <input
                className="page-icon"
                value={page.icon}
                maxLength={4}
                onChange={(e) => patchPage(page.id, { icon: e.target.value })}
                aria-label="Page icon"
              />
              <input
                className="page-title"
                placeholder="Untitled"
                value={page.title}
                onChange={(e) => patchPage(page.id, { title: e.target.value })}
              />
              <button className="btn ghost small" onClick={() => deletePage(page)}>
                Delete
              </button>
            </div>
            <PageEditor key={page.id} page={page} scheme={scheme} onChange={(content) => patchPage(page.id, { content })} />
          </>
        ) : (
          <div className="empty">
            <p>No pages yet.</p>
            <button className="btn primary" onClick={() => createPage(null)}>
              Create a page
            </button>
          </div>
        )}
      </section>
    </div>
  )
}

function PageEditor({ page, scheme, onChange }: { page: Page; scheme: Scheme; onChange: (content: unknown[]) => void }) {
  const editor = useCreateBlockNote({
    initialContent: page.content.length ? (page.content as PartialBlock[]) : undefined,
    uploadFile: embedFile
  })
  return (
    <div className="editor-wrap">
      <BlockNoteView editor={editor} theme={scheme} onChange={() => onChange(editor.document)} />
    </div>
  )
}
