import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    ChevronLeft,
    Undo,
    Redo,
    Bold,
    Italic,
    Underline,
    List,
    ListOrdered,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    Link as LinkIcon,
    Image as ImageIcon,
    FileCode2,
    Eye,
    Quote,
    Trash2,
} from 'lucide-react'
import { postService } from '@/services/postService'
import EditorSkeleton from '@/components/admin/skeletons/EditorSkeleton'
import DecryptedText from '@/components/common/animations/DecryptedText'
import { useAuthStore } from '@/stores/authStore'
import { useAdminStore } from '@/stores/adminStore'
// useAdminStore used for fetchPosts(true) on save
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll'
import { useToast } from '@/components/common/feedback/Toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Separator } from '@/components/ui/separator'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
    contentToMarkdownSource,
    isMarkdownContent,
    renderGitHubContent,
    renderMermaidDiagrams,
} from '@/lib/githubMarkdown'

interface LinkModalProps {
    open: boolean
    value: string
    onClose: () => void
    onConfirm: () => void
    onChange: (value: string) => void
}

function LinkModal({ open, value, onClose, onConfirm, onChange }: LinkModalProps) {
    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Insert Link</DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
                    <Label htmlFor="link-url">URL</Label>
                    <Input
                        id="link-url"
                        type="url"
                        placeholder="https://example.com"
                        value={value}
                        autoFocus
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') onConfirm()
                            if (e.key === 'Escape') onClose()
                        }}
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={onConfirm}>Confirm</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function ToolbarButton({
    onClick,
    title,
    children,
}: {
    onClick: () => void
    title: string
    children: React.ReactNode
}) {
    return (
        <button
            type="button"
            title={title}
            aria-label={title}
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClick}
            className="flex h-9 w-9 items-center justify-center rounded-md p-0 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
            {children}
        </button>
    )
}

function ToolbarDivider() {
    return <Separator orientation="vertical" className="mx-1 h-5" />
}

function PublishingScreen() {
    useLockBodyScroll()
    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background text-foreground">
            <div className="font-mono text-3xl font-semibold">
                <DecryptedText
                    text="Publishing..."
                    speed={80}
                    maxIterations={30}
                    animateOn="view"
                    revealDirection="center"
                />
            </div>
            <div className="mt-4 font-mono text-sm opacity-50">
                <DecryptedText
                    text="PLEASE WAIT"
                    speed={50}
                    maxIterations={15}
                    animateOn="view"
                    revealDirection="end"
                />
            </div>
        </div>
    )
}

export default function Editor() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { logout } = useAuthStore()
    const { addToast } = useToast()

    const [title, setTitle] = useState('')
    const [excerpt, setExcerpt] = useState('')
    const [coverImage, setCoverImage] = useState('')
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [isPublishing, setIsPublishing] = useState(false)
    const [lastSaved, setLastSaved] = useState<Date | null>(null)
    const [initialContent, setInitialContent] = useState('')
    const [richContent, setRichContent] = useState('')
    const [markdownContent, setMarkdownContent] = useState('')
    const [sourceMode, setSourceMode] = useState<'rich' | 'markdown'>('rich')
    const [previewOpen, setPreviewOpen] = useState(false)
    const [previewContent, setPreviewContent] = useState('')

    const [linkModalOpen, setLinkModalOpen] = useState(false)
    const [linkValue, setLinkValue] = useState('')
    const [contextMenu, setContextMenu] = useState<{
        visible: boolean
        x: number
        y: number
        target: HTMLImageElement | null
    }>({ visible: false, x: 0, y: 0, target: null })

    const savedSelection = useRef<Range | null>(null)
    const savedMarkdownSelection = useRef<{ start: number; end: number } | null>(null)
    const contentRef = useRef<HTMLDivElement>(null)
    const titleRef = useRef<HTMLDivElement>(null)
    const markdownRef = useRef<HTMLTextAreaElement>(null)
    const previewRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (!id) return
        const load = async () => {
            setLoading(true)
            try {
                const post = await postService.getPostById(id)
                if (post) {
                    setTitle(post.title)
                    setExcerpt(post.excerpt || '')
                    setCoverImage(post.coverImage || '')
                    const loadedContent = post.content || ''
                    const markdown = contentToMarkdownSource(loadedContent)
                    setInitialContent(loadedContent)
                    setRichContent(loadedContent)
                    setMarkdownContent(markdown)
                    setSourceMode(isMarkdownContent(loadedContent) ? 'markdown' : 'rich')
                }
            } catch (e) {
                console.error('Failed to load post:', e)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [id])

    useEffect(() => {
        const handleClick = () => setContextMenu((prev) => ({ ...prev, visible: false }))
        document.addEventListener('click', handleClick)
        return () => document.removeEventListener('click', handleClick)
    }, [])

    useEffect(() => {
        if (!loading && titleRef.current && contentRef.current) {
            if (titleRef.current.innerText.trim() === '') titleRef.current.innerText = title
            if (contentRef.current.innerHTML.trim() === '') contentRef.current.innerHTML = richContent || initialContent
        }
    }, [loading, initialContent, richContent, title])

    const previewHtml = renderGitHubContent(previewContent, '')

    useEffect(() => {
        if (!previewOpen || !previewRef.current) return
        renderMermaidDiagrams(previewRef.current)
    }, [previewHtml, previewOpen])

    useEffect(() => {
        if (sourceMode !== 'rich' || previewOpen || !contentRef.current) return
        if (contentRef.current.innerHTML.trim() === '') contentRef.current.innerHTML = richContent || initialContent
    }, [initialContent, previewOpen, richContent, sourceMode])

    const syncRichContent = () => {
        setRichContent(contentRef.current?.innerHTML || '')
    }

    const executeRichCommand = (command: string, value?: string) => {
        contentRef.current?.focus()
        document.execCommand(command, false, value)
        contentRef.current?.dispatchEvent(new Event('input', { bubbles: true }))
        syncRichContent()
    }

    const executeCommand = (command: string, value?: string) => {
        if (previewOpen) setPreviewOpen(false)
        if (sourceMode === 'markdown') {
            executeMarkdownCommand(command, value)
            return
        }
        executeRichCommand(command, value)
    }

    const executeAlignment = (command: 'justifyLeft' | 'justifyCenter' | 'justifyRight' | 'justifyFull') => {
        if (previewOpen) setPreviewOpen(false)
        if (sourceMode === 'markdown') {
            const align = command === 'justifyFull' ? 'justify' : command.replace('justify', '').toLowerCase()
            wrapMarkdownBlock(`<p align="${align}">\n`, '\n</p>', 'Aligned text')
            return
        }
        document.execCommand('styleWithCSS', false, 'true')
        executeRichCommand(command)
    }

    const saveSelection = () => {
        if (sourceMode === 'markdown') {
            const textarea = markdownRef.current
            savedMarkdownSelection.current = textarea
                ? { start: textarea.selectionStart, end: textarea.selectionEnd }
                : null
            return
        }

        const selection = window.getSelection()
        savedSelection.current =
            selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null
    }
    const restoreSelection = () => {
        if (sourceMode === 'markdown') {
            const textarea = markdownRef.current
            const selection = savedMarkdownSelection.current
            if (textarea && selection) {
                textarea.focus()
                textarea.setSelectionRange(selection.start, selection.end)
            }
            return
        }

        const selection = window.getSelection()
        if (selection && savedSelection.current) {
            selection.removeAllRanges()
            selection.addRange(savedSelection.current)
        }
    }

    const handleContextMenu = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).tagName === 'IMG') {
            e.preventDefault()
            setContextMenu({
                visible: true,
                x: e.clientX,
                y: e.clientY,
                target: e.target as HTMLImageElement,
            })
        }
    }

    const handleDeleteImage = () => {
        if (contextMenu.target) {
            contextMenu.target.remove()
            setContextMenu((prev) => ({ ...prev, visible: false }))
            contentRef.current?.dispatchEvent(new Event('input', { bubbles: true }))
        }
    }

    const handleContentClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement
        if (target.tagName === 'IMG') {
            const sel = window.getSelection()
            if (!sel) return
            const range = document.createRange()
            range.setStartAfter(target)
            range.collapse(true)
            sel.removeAllRanges()
            sel.addRange(range)
        }
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        try {
            const url = await postService.uploadImage(file)
            if (url) {
                setPreviewOpen(false)
                if (sourceMode === 'markdown') {
                    restoreSelection()
                    insertMarkdown(`\n![Uploaded image](${url})\n`, 'Uploaded image')
                } else {
                    restoreSelection()
                    setTimeout(
                        () =>
                            executeRichCommand(
                                'insertHTML',
                                `<p><br></p><img src="${url}" alt="Uploaded image" /><p><br></p>`,
                            ),
                        50,
                    )
                }
            } else {
                addToast({ type: 'error', message: 'Failed to upload image' })
            }
        } catch (err) {
            addToast({ type: 'error', message: 'Image upload failed' })
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleLink = () => {
        saveSelection()
        setLinkValue('')
        setLinkModalOpen(true)
    }

    const handleImage = () => {
        saveSelection()
        fileInputRef.current?.click()
    }

    const handleLinkConfirm = () => {
        setLinkModalOpen(false)
        setTimeout(() => {
            restoreSelection()
            if (!linkValue) return
            if (sourceMode === 'markdown') {
                wrapMarkdownInline('[', `](${linkValue})`, linkValue)
            } else {
                if (savedSelection.current?.collapsed) {
                    executeRichCommand(
                        'insertHTML',
                        `<a href="${escapeEditorAttribute(linkValue)}" target="_blank" rel="noopener noreferrer">${escapeEditorHtml(
                            linkValue,
                        )}</a>`,
                    )
                } else {
                    executeRichCommand('createLink', linkValue)
                }
            }
        }, 10)
    }

    const updateMarkdown = (value: string, selectionStart?: number, selectionEnd?: number) => {
        setMarkdownContent(value)
        requestAnimationFrame(() => {
            if (typeof selectionStart !== 'number' || typeof selectionEnd !== 'number') return
            markdownRef.current?.focus()
            markdownRef.current?.setSelectionRange(selectionStart, selectionEnd)
        })
    }

    const getMarkdownSelection = () => {
        const textarea = markdownRef.current
        if (!textarea) return { start: markdownContent.length, end: markdownContent.length, selected: '' }
        return {
            start: textarea.selectionStart,
            end: textarea.selectionEnd,
            selected: markdownContent.slice(textarea.selectionStart, textarea.selectionEnd),
        }
    }

    const insertMarkdown = (value: string, fallbackSelection = '') => {
        const { start, end, selected } = getMarkdownSelection()
        const text = selected || fallbackSelection
        const insertion = value.includes(fallbackSelection) ? value : value.replace('$selection', text)
        const next = `${markdownContent.slice(0, start)}${insertion}${markdownContent.slice(end)}`
        const cursor = start + insertion.length
        updateMarkdown(next, cursor, cursor)
    }

    const wrapMarkdownInline = (before: string, after = before, fallback = 'text') => {
        const { start, end, selected } = getMarkdownSelection()
        const text = selected || fallback
        const next = `${markdownContent.slice(0, start)}${before}${text}${after}${markdownContent.slice(end)}`
        updateMarkdown(next, start + before.length, start + before.length + text.length)
    }

    const wrapMarkdownBlock = (before: string, after = '', fallback = 'Text') => {
        const { start, end, selected } = getMarkdownSelection()
        const text = selected || fallback
        const insertion = `${before}${text}${after}`
        const next = `${markdownContent.slice(0, start)}${insertion}${markdownContent.slice(end)}`
        updateMarkdown(next, start + before.length, start + before.length + text.length)
    }

    const prefixMarkdownLines = (prefixer: (index: number) => string) => {
        const { start, end } = getMarkdownSelection()
        const lineStart = markdownContent.lastIndexOf('\n', Math.max(0, start - 1)) + 1
        const lineEndIndex = markdownContent.indexOf('\n', end)
        const lineEnd = lineEndIndex === -1 ? markdownContent.length : lineEndIndex
        const block = markdownContent.slice(lineStart, lineEnd)
        const lines = block.split('\n')
        const nextBlock = lines.map((line, index) => `${prefixer(index)}${line.replace(/^\s*(?:[-*+]|>\s?|\d+\.)\s+/, '')}`).join('\n')
        const next = `${markdownContent.slice(0, lineStart)}${nextBlock}${markdownContent.slice(lineEnd)}`
        updateMarkdown(next, lineStart, lineStart + nextBlock.length)
    }

    const executeMarkdownCommand = (command: string, value?: string) => {
        if (command === 'undo' || command === 'redo') {
            markdownRef.current?.focus()
            document.execCommand(command)
            requestAnimationFrame(() => setMarkdownContent(markdownRef.current?.value || markdownContent))
            return
        }
        if (command === 'bold') return wrapMarkdownInline('**', '**', 'bold text')
        if (command === 'italic') return wrapMarkdownInline('*', '*', 'italic text')
        if (command === 'underline') return wrapMarkdownInline('<ins>', '</ins>', 'underlined text')
        if (command === 'insertUnorderedList') return prefixMarkdownLines(() => '- ')
        if (command === 'insertOrderedList') return prefixMarkdownLines((index) => `${index + 1}. `)
        if (command === 'formatBlock' && value === 'blockquote') return prefixMarkdownLines(() => '> ')
        if (command === 'insertHTML' && value) return insertMarkdown(value)
        if (command === 'insertText' && value) return insertMarkdown(value)
    }

    const switchToMarkdown = () => {
        setPreviewOpen(false)
        if (sourceMode === 'rich') {
            setRichContent(contentRef.current?.innerHTML || richContent)
            setMarkdownContent(contentToMarkdownSource(contentRef.current?.innerHTML || richContent))
        }
        setSourceMode('markdown')
    }

    const switchToRich = () => {
        setPreviewOpen(false)
        if (sourceMode === 'markdown') {
            const html = renderGitHubContent(markdownContent, '')
            setRichContent(html)
        }
        setSourceMode('rich')
    }

    const togglePreview = () => {
        if (previewOpen) {
            setPreviewOpen(false)
            return
        }
        const current = sourceMode === 'markdown' ? markdownContent : contentRef.current?.innerHTML || richContent
        if (sourceMode === 'rich') setRichContent(current)
        setPreviewContent(current)
        setPreviewOpen(true)
    }

    const getContentForSave = () => {
        if (sourceMode === 'markdown') return markdownContent
        return previewOpen ? previewContent : contentRef.current?.innerHTML || richContent
    }

    const escapeEditorHtml = (value: string) =>
        value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')

    const escapeEditorAttribute = (value: string) => escapeEditorHtml(value.trim())

    const handleSave = async (shouldPublish = false) => {
        if (!title.trim()) {
            addToast({ type: 'error', message: 'Please enter a title' })
            return
        }
        if (shouldPublish) setIsPublishing(true)
        else setSaving(true)

        try {
            const contentHtml = getContentForSave()
            await Promise.all([
                id
                    ? postService.updatePost(id, {
                          title,
                          content: contentHtml,
                          excerpt,
                          coverImage: coverImage || '',
                          published: shouldPublish,
                      })
                    : postService.createPost({
                          title,
                          content: contentHtml,
                          excerpt,
                          coverImage: coverImage || '',
                          published: shouldPublish,
                      }),
                shouldPublish ? new Promise((resolve) => setTimeout(resolve, 3000)) : Promise.resolve(),
            ])

            setLastSaved(new Date())
            await useAdminStore.getState().fetchPosts(true)

            if (shouldPublish) {
                navigate('/admin')
            }
        } catch (error: any) {
            const msg = error?.message || 'Failed to save post'
            if (msg.includes('User not authenticated') || msg.includes('Unauthorized')) {
                addToast({ type: 'error', message: 'Session expired. Redirecting…' })
                await logout()
                navigate('/login')
            } else if (msg.includes('duplicate') || msg.includes('slug')) {
                addToast({
                    type: 'error',
                    message: 'A post with this title already exists. Choose a different title.',
                })
            } else {
                addToast({ type: 'error', message: msg })
            }
            setIsPublishing(false)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <EditorSkeleton />
    if (isPublishing) return <PublishingScreen />

    return (
        <div className="editor-page text-foreground">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
            />

            <LinkModal
                open={linkModalOpen}
                value={linkValue}
                onClose={() => setLinkModalOpen(false)}
                onConfirm={handleLinkConfirm}
                onChange={setLinkValue}
            />

            {contextMenu.visible && (
                <div
                    className="fixed z-[10000] rounded-md border bg-popover p-1 shadow-md"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={handleDeleteImage}
                        className="flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-500/10"
                    >
                        <Trash2 className="h-4 w-4" /> Delete Image
                    </button>
                </div>
            )}

            <nav className="editor-toolbar-nav sticky top-0 z-50 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b bg-background px-6 py-3">
                <div className="editor-nav-start flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigate(-1)}
                        aria-label="Back"
                        className="flex h-10 w-10 items-center justify-center rounded-full p-0 leading-none [&_svg]:!size-6"
                    >
                        <ChevronLeft className="!h-6 !w-6 -translate-x-0.5" />
                    </Button>
                    {lastSaved && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Saved
                        </div>
                    )}
                </div>

                <div className="editor-toolbar-scroll flex min-w-0 justify-center overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none]">
                    <div className="flex w-max items-center justify-center gap-1">
                        <ToolbarButton onClick={() => executeCommand('undo')} title="Undo">
                            <Undo className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarButton onClick={() => executeCommand('redo')} title="Redo">
                            <Redo className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarDivider />
                        <ToolbarButton onClick={() => executeCommand('bold')} title="Bold">
                            <Bold className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarButton onClick={() => executeCommand('italic')} title="Italic">
                            <Italic className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarButton onClick={() => executeCommand('underline')} title="Underline">
                            <Underline className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarDivider />
                        <ToolbarButton
                            onClick={() => executeCommand('insertUnorderedList')}
                            title="Bullet List"
                        >
                            <List className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={() => executeCommand('insertOrderedList')}
                            title="Numbered List"
                        >
                            <ListOrdered className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={() => executeCommand('formatBlock', 'blockquote')}
                            title="Quote"
                        >
                            <Quote className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarDivider />
                        <ToolbarButton onClick={() => executeAlignment('justifyLeft')} title="Align Left">
                            <AlignLeft className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarButton onClick={() => executeAlignment('justifyCenter')} title="Align Center">
                            <AlignCenter className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarButton onClick={() => executeAlignment('justifyRight')} title="Align Right">
                            <AlignRight className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarButton onClick={() => executeAlignment('justifyFull')} title="Justify">
                            <AlignJustify className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarDivider />
                        <ToolbarButton onClick={handleLink} title="Link">
                            <LinkIcon className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarButton onClick={handleImage} title="Image">
                            <ImageIcon className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarDivider />
                        <ToolbarButton
                            onClick={() => (sourceMode === 'markdown' ? switchToRich() : switchToMarkdown())}
                            title={sourceMode === 'markdown' ? 'Rich Text' : 'Markdown Source'}
                        >
                            <FileCode2 className={cn('h-4 w-4', sourceMode === 'markdown' && 'text-foreground')} />
                        </ToolbarButton>
                        <ToolbarButton onClick={togglePreview} title={previewOpen ? 'Edit' : 'Preview'}>
                            <Eye className={cn('h-4 w-4', previewOpen && 'text-foreground')} />
                        </ToolbarButton>
                    </div>
                </div>

                <div className="editor-nav-actions flex items-center justify-end gap-3">
                    <Button
                        onClick={() => handleSave(true)}
                        disabled={saving}
                        className="rounded-full px-7"
                    >
                        {saving && <Spinner size={16} />}
                        {saving ? 'Publishing…' : 'Continue'}
                    </Button>
                </div>
            </nav>

            <div className="editor-body mx-auto max-w-[720px] px-6 pb-12 pt-20">
                <div
                    ref={titleRef}
                    contentEditable
                    className={cn(
                        'editor-title-editable mb-4 w-full break-words bg-transparent text-[3.5rem] font-bold leading-tight text-foreground outline-none',
                    )}
                    data-placeholder="Title"
                    onInput={(e) => setTitle(e.currentTarget.innerText)}
                    onPaste={(e) => {
                        e.preventDefault()
                        const text = e.clipboardData.getData('text/plain')
                        document.execCommand('insertText', false, text)
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') e.preventDefault()
                    }}
                />

                {previewOpen ? (
                    <div
                        ref={previewRef}
                        className="editor-preview post-content min-h-[60vh] w-full break-words text-lg leading-relaxed text-foreground"
                        dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                ) : sourceMode === 'markdown' ? (
                    <textarea
                        ref={markdownRef}
                        value={markdownContent}
                        spellCheck
                        className="editor-markdown-source min-h-[60vh] w-full resize-none break-words border-0 bg-transparent font-mono text-base leading-relaxed text-foreground outline-none"
                        placeholder="Write Markdown here. Fenced ```mermaid blocks render in Preview and on the live blog."
                        onChange={(e) => setMarkdownContent(e.target.value)}
                        onSelect={saveSelection}
                        onKeyDown={(e) => {
                            if (e.key === 'Tab') {
                                e.preventDefault()
                                insertMarkdown('    ')
                            }
                        }}
                    />
                ) : (
                    <div
                        ref={contentRef}
                        contentEditable
                        className="editor-content-editable min-h-[60vh] w-full break-words whitespace-pre-wrap bg-transparent text-lg leading-relaxed text-foreground outline-none"
                        data-placeholder="Start writing..."
                        onContextMenu={handleContextMenu}
                        onClick={handleContentClick}
                        onInput={(e) => setRichContent(e.currentTarget.innerHTML)}
                        onKeyDown={(e) => {
                            if (e.key === 'Tab') {
                                e.preventDefault()
                                document.execCommand('insertText', false, '\t')
                                syncRichContent()
                            }
                        }}
                    />
                )}
            </div>

            <style>{`
                .editor-title-editable:empty:before,
                .editor-content-editable:empty:before {
                    content: attr(data-placeholder);
                    color: hsl(var(--muted-foreground));
                    pointer-events: none;
                }
                .editor-title-editable:empty:before { font-size: 3.5rem; font-weight: 700; opacity: 0.35; }
                .editor-content-editable h1 { font-size: 2.5em; margin: 0.67em 0; font-weight: 700; line-height: 1.2; }
                .editor-content-editable h2 { font-size: 2em; margin: 0.75em 0; font-weight: 600; line-height: 1.3; }
                .editor-content-editable h3 { font-size: 1.5em; margin: 0.83em 0; font-weight: 600; line-height: 1.4; }
                .editor-content-editable p { margin: 1em 0; }
                .editor-content-editable ul { list-style-type: disc; padding-left: 1.5em; margin: 1em 0; }
                .editor-content-editable ol { list-style-type: decimal; padding-left: 1.5em; margin: 1em 0; }
                .editor-markdown-source {
                    tab-size: 4;
                    white-space: pre-wrap;
                }
                .editor-preview > *:first-child { margin-top: 0; }
                .editor-preview h1 { font-size: 2.35em; margin: 0.67em 0; font-weight: 700; line-height: 1.16; }
                .editor-preview h2 { font-size: 1.85em; margin: 0.75em 0; font-weight: 650; line-height: 1.24; }
                .editor-preview h3 { font-size: 1.45em; margin: 0.83em 0; font-weight: 650; line-height: 1.32; }
                .editor-preview p { margin: 1em 0; }
                .editor-preview ul { list-style-type: disc; padding-left: 1.5em; margin: 1em 0; }
                .editor-preview ol { list-style-type: decimal; padding-left: 1.5em; margin: 1em 0; }
                .editor-content-editable blockquote {
                    border-left: 4px solid hsl(var(--border));
                    padding-left: 1rem; margin: 1rem 0; font-style: italic;
                    color: hsl(var(--muted-foreground));
                }
                .editor-content-editable img { max-width: 100% !important; height: auto !important; border-radius: 0.5rem; margin: 1rem 0; display: block; }
                .editor-content-editable a { color: hsl(var(--foreground)); text-decoration: underline; }
                .editor-preview a { color: hsl(var(--foreground)); text-decoration: underline; }
                .editor-preview img { max-width: 100%; height: auto; border-radius: 0.5rem; margin: 1rem 0; display: block; }
                .editor-preview pre,
                .editor-preview .github-mermaid,
                .editor-preview .github-diagram,
                .editor-preview .github-math-block {
                    max-width: 100%;
                    overflow-x: auto;
                    border: 1px solid hsl(var(--border));
                    border-radius: 0.75rem;
                    padding: 1rem;
                    background: hsl(var(--card));
                }
                .editor-preview code,
                .editor-preview pre {
                    font-family: var(--font-mono);
                    font-size: 0.9em;
                }
                .editor-preview .github-youtube-embed {
                    position: relative;
                    width: 100%;
                    aspect-ratio: 16 / 9;
                    overflow: hidden;
                    border: 1px solid hsl(var(--border));
                    border-radius: 0.75rem;
                    background: #000;
                }
                .editor-preview .github-youtube-embed iframe {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                }
                .editor-preview .github-markdown-table {
                    display: block;
                    width: 100%;
                    overflow-x: auto;
                    border-collapse: collapse;
                }
                .editor-preview .github-markdown-table th,
                .editor-preview .github-markdown-table td {
                    border: 1px solid hsl(var(--border));
                    padding: 0.65rem 0.8rem;
                }
                .editor-preview .github-alert {
                    border-left: 4px solid #0969da;
                    border-radius: 0.65rem;
                    padding: 0.85rem 1rem;
                    background: rgba(9, 105, 218, 0.08);
                }
                .editor-preview .github-alert-title {
                    margin-bottom: 0.35rem;
                    font-family: var(--font-mono);
                    font-size: 0.78rem;
                    font-weight: 700;
                    letter-spacing: 0.08em;
                    color: #0969da;
                }
                .editor-preview .github-alert-tip { border-left-color: #1a7f37; background: rgba(26, 127, 55, 0.08); }
                .editor-preview .github-alert-tip .github-alert-title { color: #1a7f37; }
                .editor-preview .github-alert-important { border-left-color: #8250df; background: rgba(130, 80, 223, 0.08); }
                .editor-preview .github-alert-important .github-alert-title { color: #8250df; }
                .editor-preview .github-alert-warning { border-left-color: #9a6700; background: rgba(154, 103, 0, 0.1); }
                .editor-preview .github-alert-warning .github-alert-title { color: #9a6700; }
                .editor-preview .github-alert-caution { border-left-color: #cf222e; background: rgba(207, 34, 46, 0.08); }
                .editor-preview .github-alert-caution .github-alert-title { color: #cf222e; }
                .editor-preview .github-task-list { list-style: none; padding-left: 0 !important; }
                .editor-preview .github-task-list-item { display: flex; align-items: flex-start; gap: 0.5rem; }
                .editor-preview .github-task-list-item input { margin-top: 0.32em; }
                .editor-preview .github-mermaid svg { display: block; max-width: 100%; height: auto; margin: 0 auto; }
                .editor-preview .github-mermaid-fallback::before {
                    content: 'Mermaid source';
                    display: block;
                    margin-bottom: 0.5rem;
                    font-family: var(--font-mono);
                    font-size: 0.75rem;
                    color: hsl(var(--muted-foreground));
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                }
                @media (max-width: 640px) {
                    .editor-toolbar-nav {
                        grid-template-columns: auto 1fr !important;
                        grid-template-areas:
                            "start actions"
                            "tools tools" !important;
                        gap: 0.55rem !important;
                        padding: 0.7rem 0.85rem 0.65rem !important;
                    }
                    .editor-nav-start { grid-area: start; min-width: 0; }
                    .editor-nav-actions { grid-area: actions; }
                    .editor-nav-actions button {
                        min-width: 0 !important;
                        min-height: 42px !important;
                        padding-left: 1rem !important;
                        padding-right: 1rem !important;
                    }
                    .editor-toolbar-scroll {
                        grid-area: tools;
                        justify-content: flex-start !important;
                        margin: 0 -0.25rem;
                        padding: 0.15rem 0.25rem 0;
                        scroll-snap-type: x proximity;
                    }
                    .editor-toolbar-scroll button {
                        width: 42px !important;
                        height: 42px !important;
                        scroll-snap-align: start;
                    }
                    .editor-toolbar-scroll [data-orientation="vertical"] {
                        margin-left: 0.15rem !important;
                        margin-right: 0.15rem !important;
                    }
                    .editor-body {
                        padding-left: 1rem !important;
                        padding-right: 1rem !important;
                        padding-top: 1.75rem !important;
                    }
                    .editor-title-editable { font-size: clamp(2rem, 10vw, 2.75rem) !important; line-height: 1.05 !important; }
                    .editor-title-editable:empty:before { font-size: clamp(2rem, 10vw, 2.75rem) !important; }
                    .editor-content-editable {
                        font-size: 1.04rem !important;
                        line-height: 1.72 !important;
                        min-height: 52vh !important;
                        padding-bottom: 7rem !important;
                    }
                    .editor-markdown-source,
                    .editor-preview {
                        font-size: 0.96rem !important;
                        line-height: 1.68 !important;
                        min-height: 52vh !important;
                        padding-bottom: 7rem !important;
                    }
                }
            `}</style>
        </div>
    )
}
