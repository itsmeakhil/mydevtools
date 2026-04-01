/**
 * Bookmark parser for importing bookmarks from browser HTML exports
 * Supports Netscape Bookmark Format (used by Chrome, Firefox, Safari, Edge)
 */

import { Bookmark, BookmarkFolder } from '@/store/bookmark-store'

interface ParsedBookmark {
    title: string
    url: string
    addDate?: number
    icon?: string
}

interface ParsedFolder {
    name: string
    addDate?: number
    children: (ParsedBookmark | ParsedFolder)[]
}

interface ParseResult {
    bookmarks: Bookmark[]
    folders: BookmarkFolder[]
}

/**
 * Parse HTML bookmark file content
 */
export function parseBookmarkHTML(html: string): ParseResult {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    const bookmarks: Bookmark[] = []
    const folders: BookmarkFolder[] = []

    // Start parsing from the root DL element
    const rootDL = doc.querySelector('DL')
    if (rootDL) {
        parseFolder(rootDL, null, bookmarks, folders)
    }

    return { bookmarks, folders }
}

/**
 * Recursively parse a DL (Definition List) element
 */
function parseFolder(
    dl: Element,
    parentFolderId: string | null,
    bookmarks: Bookmark[],
    folders: BookmarkFolder[]
): void {
    const children = dl.children
    let currentFolderName: string | null = null
    let currentFolderAddDate: number | undefined

    for (let i = 0; i < children.length; i++) {
        const child = children[i]

        if (child.tagName === 'DT') {
            // Check if this DT contains a folder (H3) or a bookmark (A)
            const h3 = child.querySelector(':scope > H3')
            const anchor = child.querySelector(':scope > A')

            if (h3) {
                // This is a folder
                currentFolderName = h3.textContent?.trim() || 'Untitled Folder'
                currentFolderAddDate = parseAddDate(h3.getAttribute('ADD_DATE'))

                // Look for hidden nested DL (standard in some browsers or DOMParser behavior)
                let nestedDL = child.querySelector(':scope > DL')

                // If not found, look for siblings (Netscape spec)
                if (!nestedDL) {
                    const nextSibling = child.nextElementSibling
                    if (nextSibling?.tagName === 'DD') {
                        // Chrome/Netscape often wrap the DL in a DD
                        nestedDL = nextSibling.querySelector('DL')
                    } else {
                        // Some exports put DL as a sibling
                        nestedDL = findNextDL(child) as Element | null
                    }
                }

                if (nestedDL) {
                    const folderId = generateId()
                    folders.push({
                        id: folderId,
                        name: currentFolderName,
                        parentId: parentFolderId,
                        createdAt: currentFolderAddDate || Date.now(),
                        isExpanded: false
                    })
                    parseFolder(nestedDL, folderId, bookmarks, folders)
                }
            } else if (anchor) {
                // This is a bookmark
                const url = anchor.getAttribute('HREF')
                if (url && isValidUrl(url)) {
                    const title = anchor.textContent?.trim() || url
                    const addDate = parseAddDate(anchor.getAttribute('ADD_DATE'))
                    const icon = anchor.getAttribute('ICON') || undefined

                    bookmarks.push({
                        id: generateId(),
                        title,
                        url,
                        description: undefined,
                        favicon: icon,
                        tags: [],
                        folderId: parentFolderId,
                        createdAt: addDate || Date.now(),
                        updatedAt: Date.now()
                    })
                }
            }
        } else if (child.tagName === 'DL') {
            // Nested DL without a folder header (Bookmarks Bar, etc.)
            parseFolder(child, parentFolderId, bookmarks, folders)
        }
    }
}

/**
 * Find the next DL sibling, possibly nested in a P or other container
 */
function findNextDL(element: Element): Element | null {
    let sibling = element.nextElementSibling
    while (sibling) {
        if (sibling.tagName === 'DL') {
            return sibling
        }
        const nested = sibling.querySelector('DL')
        if (nested) {
            return nested
        }
        if (sibling.tagName === 'DT' || sibling.tagName === 'HR') {
            // We've passed the folder's content
            return null
        }
        sibling = sibling.nextElementSibling
    }
    return null
}

/**
 * Parse ADD_DATE attribute (Unix timestamp in seconds)
 */
function parseAddDate(addDate: string | null): number | undefined {
    if (!addDate) return undefined
    const timestamp = parseInt(addDate, 10)
    if (isNaN(timestamp)) return undefined
    // Convert from seconds to milliseconds
    return timestamp * 1000
}

/**
 * Check if a URL is valid
 */
function isValidUrl(url: string): boolean {
    if (!url) return false
    // Skip javascript: and place: URLs
    if (url.startsWith('javascript:') || url.startsWith('place:')) {
        return false
    }
    try {
        new URL(url)
        return true
    } catch {
        return false
    }
}

/**
 * Generate a unique ID
 */
function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Export bookmarks to HTML format (Netscape Bookmark Format)
 */
export function exportBookmarksToHTML(bookmarks: Bookmark[], folders: BookmarkFolder[]): string {
    const lines: string[] = [
        '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
        '<!-- This is an automatically generated file. -->',
        '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
        '<TITLE>Bookmarks</TITLE>',
        '<H1>Bookmarks</H1>',
        '<DL><p>'
    ]

    // Build folder tree
    const rootBookmarks = bookmarks.filter(b => b.folderId === null)
    const rootFolders = folders.filter(f => f.parentId === null)

    // Add root folders first
    for (const folder of rootFolders) {
        exportFolder(folder, bookmarks, folders, lines, 1)
    }

    // Add root bookmarks
    for (const bookmark of rootBookmarks) {
        exportBookmark(bookmark, lines, 1)
    }

    lines.push('</DL><p>')

    return lines.join('\n')
}

function exportFolder(
    folder: BookmarkFolder,
    bookmarks: Bookmark[],
    folders: BookmarkFolder[],
    lines: string[],
    indent: number
): void {
    const spaces = '    '.repeat(indent)
    const addDate = Math.floor(folder.createdAt / 1000)

    lines.push(`${spaces}<DT><H3 ADD_DATE="${addDate}">${escapeHtml(folder.name)}</H3>`)
    lines.push(`${spaces}<DL><p>`)

    // Add nested folders
    const childFolders = folders.filter(f => f.parentId === folder.id)
    for (const childFolder of childFolders) {
        exportFolder(childFolder, bookmarks, folders, lines, indent + 1)
    }

    // Add bookmarks in this folder
    const folderBookmarks = bookmarks.filter(b => b.folderId === folder.id)
    for (const bookmark of folderBookmarks) {
        exportBookmark(bookmark, lines, indent + 1)
    }

    lines.push(`${spaces}</DL><p>`)
}

function exportBookmark(bookmark: Bookmark, lines: string[], indent: number): void {
    const spaces = '    '.repeat(indent)
    const addDate = Math.floor(bookmark.createdAt / 1000)
    const iconAttr = bookmark.favicon ? ` ICON="${escapeHtml(bookmark.favicon)}"` : ''

    lines.push(`${spaces}<DT><A HREF="${escapeHtml(bookmark.url)}" ADD_DATE="${addDate}"${iconAttr}>${escapeHtml(bookmark.title)}</A>`)
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

/**
 * Export bookmarks to JSON format
 */
export function exportBookmarksToJSON(bookmarks: Bookmark[], folders: BookmarkFolder[]): string {
    return JSON.stringify({ bookmarks, folders }, null, 2)
}

/**
 * Import bookmarks from JSON format
 */
export function parseBookmarkJSON(json: string): ParseResult {
    try {
        const data = JSON.parse(json)
        return {
            bookmarks: data.bookmarks || [],
            folders: data.folders || []
        }
    } catch {
        throw new Error('Invalid JSON format')
    }
}
