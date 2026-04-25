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

    const [linkModalOpen, setLinkModalOpen] = useState(false)
    const [linkValue, setLinkValue] = useState('')
    const [contextMenu, setContextMenu] = useState<{
        visible: boolean
        x: number
        y: number
        target: HTMLImageElement | null
    }>({ visible: false, x: 0, y: 0, target: null })

    const savedSelection = useRef<Range | null>(null)
    const contentRef = useRef<HTMLDivElement>(null)
    const titleRef = useRef<HTMLDivElement>(null)
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
                    setInitialContent(post.content || '')
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
            if (contentRef.current.innerHTML.trim() === '') contentRef.current.innerHTML = initialContent
        }
    }, [loading, initialContent, title])

    const executeCommand = (command: string, value?: string) => document.execCommand(command, false, value)

    const saveSelection = () => {
        const selection = window.getSelection()
        savedSelection.current =
            selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null
    }
    const restoreSelection = () => {
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
                restoreSelection()
                setTimeout(
                    () =>
                        executeCommand(
                            'insertHTML',
                            `<p><br></p><img src="${url}" alt="Uploaded image" /><p><br></p>`,
                        ),
                    50,
                )
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
            if (linkValue) executeCommand('createLink', linkValue)
        }, 10)
    }

    const handleSave = async (shouldPublish = false) => {
        if (!title.trim()) {
            addToast({ type: 'error', message: 'Please enter a title' })
            return
        }
        if (shouldPublish) setIsPublishing(true)
        else setSaving(true)

        try {
            const contentHtml = contentRef.current?.innerHTML || ''
            const [result] = await Promise.all([
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

            if (shouldPublish && result) {
                navigate(`/blog/${result.slug}`)
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

            <nav className="sticky top-0 z-50 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b bg-background px-6 py-3">
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigate(-1)}
                        aria-label="Back"
                        className="h-10 w-10 rounded-full p-0"
                    >
                        <ChevronLeft className="h-5 w-5 translate-x-px" />
                    </Button>
                    {lastSaved && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Saved
                        </div>
                    )}
                </div>

                <div className="flex min-w-0 justify-center overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none]">
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
                        <ToolbarButton onClick={() => executeCommand('justifyLeft')} title="Align Left">
                            <AlignLeft className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarButton onClick={() => executeCommand('justifyCenter')} title="Align Center">
                            <AlignCenter className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarButton onClick={() => executeCommand('justifyRight')} title="Align Right">
                            <AlignRight className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarButton onClick={() => executeCommand('justifyFull')} title="Justify">
                            <AlignJustify className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarDivider />
                        <ToolbarButton onClick={handleLink} title="Link">
                            <LinkIcon className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarButton onClick={handleImage} title="Image">
                            <ImageIcon className="h-4 w-4" />
                        </ToolbarButton>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3">
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

            <div className="mx-auto max-w-[720px] px-6 pb-12 pt-20">
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

                <div
                    ref={contentRef}
                    contentEditable
                    className="editor-content-editable min-h-[60vh] w-full break-words whitespace-pre-wrap bg-transparent text-lg leading-relaxed text-foreground outline-none"
                    data-placeholder="Start writing..."
                    onContextMenu={handleContextMenu}
                    onClick={handleContentClick}
                    onKeyDown={(e) => {
                        if (e.key === 'Tab') {
                            e.preventDefault()
                            document.execCommand('insertText', false, '\t')
                        }
                    }}
                />
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
                .editor-content-editable blockquote {
                    border-left: 4px solid hsl(var(--border));
                    padding-left: 1rem; margin: 1rem 0; font-style: italic;
                    color: hsl(var(--muted-foreground));
                }
                .editor-content-editable img { max-width: 100% !important; height: auto !important; border-radius: 0.5rem; margin: 1rem 0; display: block; }
                .editor-content-editable a { color: hsl(var(--foreground)); text-decoration: underline; }
                @media (max-width: 640px) {
                    .editor-page nav {
                        padding-left: 0.75rem !important;
                        padding-right: 0.75rem !important;
                    }
                    .editor-title-editable { font-size: 2rem !important; }
                    .editor-title-editable:empty:before { font-size: 2rem !important; }
                    .editor-content-editable { font-size: 1rem !important; min-height: 50vh !important; padding-bottom: 200px !important; }
                }
            `}</style>
        </div>
    )
}
