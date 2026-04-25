import { useEffect, useState, useRef, useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
    ArrowLeft,
    Share2,
    Linkedin,
    Github,
    Globe,
    Dribbble,
    Mail,
} from 'lucide-react'
import { format } from 'date-fns'
import DOMPurify from 'dompurify'
import { postService } from '@/services/postService'
import { settingsService, type SiteSettings } from '@/services/settingsService'
import { statsService } from '@/services/statsService'
import { useToast } from '@/components/common/feedback/Toast'
import { useCodeCopy } from '@/hooks/useCodeCopy'
import ThemeToggle from '@/components/common/ui/ThemeToggle'
import SubscribeModal from '@/components/common/ui/SubscribeModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { Post } from '@/types'

const XIcon = ({ size = 18 }: { size?: number }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
    >
        <path d="M18.901 3H21L14.415 10.531L22.158 21H16.857L12.706 15.578L7.957 21H5.857L12.923 12.922L5.525 3H10.957L14.618 7.95L18.901 3ZM18.163 19.742H19.325L9.288 5.161H8.042L18.163 19.742Z" />
    </svg>
)

function HuggingFaceIcon({ size = 18 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <circle cx="12" cy="12" r="10" />
            <path d="M9 13h.01M15 13h.01M10 16s1 1 2 1 2-1 2-1" />
        </svg>
    )
}

function LeetCodeIcon({ size = 18 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.527 5.527 0 0 0 .062 2.362 5.843 5.843 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-.8-.647-1.766-1.045-2.774-1.202l2.015-2.158A1.384 1.384 0 0 0 13.483 0zm-2.866 12.815a1.38 1.38 0 0 0-1.38 1.382 1.38 1.38 0 0 0 1.38 1.382H20.79a1.38 1.38 0 0 0 1.38-1.382 1.38 1.38 0 0 0-1.38-1.382z" />
        </svg>
    )
}

const ITEMS_PER_PAGE = 6

export default function Blog() {
    const { slug } = useParams<{ slug?: string }>()
    const [searchParams, setSearchParams] = useSearchParams()
    const [posts, setPosts] = useState<Post[] | null>(null)
    const [activePost, setActivePost] = useState<Post | null>(null)
    const [settings, setSettings] = useState<SiteSettings | null>(null)
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [isSubscribeOpen, setIsSubscribeOpen] = useState(false)
    const { addToast } = useToast()
    const contentRef = useRef<HTMLDivElement>(null)
    useCodeCopy(contentRef)

    const currentPage = parseInt(searchParams.get('page') || '1', 10)

    useEffect(() => {
        let cancelled = false
        const load = async () => {
            setLoading(true)
            try {
                const [list, s] = await Promise.all([
                    postService.getPublicPosts(),
                    settingsService.getSettings(),
                ])
                if (cancelled) return
                setPosts(list)
                setSettings(s)
            } catch (err) {
                console.error(err)
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        load()
        return () => {
            cancelled = true
        }
    }, [])

    useEffect(() => {
        if (!slug || !posts) {
            setActivePost(null)
            return
        }
        const found = posts.find((p) => p.slug === slug) ?? null
        setActivePost(found)
        if (found) {
            statsService.trackEvent(found.id, 'view').catch(() => {})
        }
    }, [slug, posts])

    const visiblePosts = useMemo(() => {
        if (!posts) return []
        const filtered = posts.filter((p) =>
            p.title.toLowerCase().includes(searchTerm.toLowerCase()),
        )
        return filtered
    }, [posts, searchTerm])

    const totalPages = Math.max(1, Math.ceil(visiblePosts.length / ITEMS_PER_PAGE))
    const pageStart = (currentPage - 1) * ITEMS_PER_PAGE
    const pagePosts = visiblePosts.slice(pageStart, pageStart + ITEMS_PER_PAGE)

    const handleShare = async () => {
        if (!activePost) return
        const url = window.location.href
        try {
            if (navigator.share) {
                await navigator.share({ title: activePost.title, url })
            } else {
                await navigator.clipboard.writeText(url)
                addToast({ type: 'success', message: 'Link copied to clipboard' })
            }
            statsService.trackEvent(activePost.id, 'share').catch(() => {})
        } catch {
            // user cancelled
        }
    }

    return (
        <div className="relative min-h-screen overflow-x-hidden">
            <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_10%_10%,hsl(var(--card)),hsl(var(--background)))]" />

            <div className="fixed right-6 top-6 z-50">
                <ThemeToggle />
            </div>

            <div className="relative z-10 mx-auto grid max-w-5xl gap-12 px-6 py-16 lg:grid-cols-[260px_1fr]">
                <BlogSidebar settings={settings} loading={loading} onSubscribe={() => setIsSubscribeOpen(true)} />

                <main className="min-w-0">
                    {activePost ? (
                        <article className="animate-fade-in">
                            <Link
                                to="/blog"
                                className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back to all posts
                            </Link>

                            {activePost.coverImage && (
                                <img
                                    src={activePost.coverImage}
                                    alt=""
                                    className="mb-8 max-h-[420px] w-full rounded-xl object-cover"
                                />
                            )}

                            <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
                                {activePost.title}
                            </h1>
                            <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
                                <span>
                                    {activePost.publishedAt
                                        ? format(new Date(activePost.publishedAt), 'MMM d, yyyy')
                                        : ''}
                                </span>
                                <span>·</span>
                                <span>{(activePost.views || 0).toLocaleString()} views</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleShare}
                                    className="ml-auto h-8 gap-2"
                                >
                                    <Share2 className="h-4 w-4" /> Share
                                </Button>
                            </div>

                            <div
                                ref={contentRef}
                                className="post-content mt-8"
                                dangerouslySetInnerHTML={{
                                    __html: DOMPurify.sanitize(activePost.content, {
                                        ADD_ATTR: ['target', 'rel'],
                                    }),
                                }}
                            />
                        </article>
                    ) : (
                        <BlogIndex
                            loading={loading}
                            posts={pagePosts}
                            searchTerm={searchTerm}
                            onSearchChange={setSearchTerm}
                            page={currentPage}
                            totalPages={totalPages}
                            onPageChange={(p) => setSearchParams({ page: p.toString() })}
                        />
                    )}
                </main>
            </div>

            <SubscribeModal isOpen={isSubscribeOpen} onClose={() => setIsSubscribeOpen(false)} />
        </div>
    )
}

function BlogSidebar({
    settings,
    loading,
    onSubscribe,
}: {
    settings: SiteSettings | null
    loading: boolean
    onSubscribe: () => void
}) {
    if (loading) {
        return (
            <aside className="space-y-4 lg:sticky lg:top-16 lg:self-start">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
            </aside>
        )
    }

    const socials: Array<{ href: string | null | undefined; label: string; icon: JSX.Element }> = [
        { href: settings?.twitterLink, label: 'Twitter / X', icon: <XIcon /> },
        { href: settings?.linkedinLink, label: 'LinkedIn', icon: <Linkedin size={18} /> },
        { href: settings?.githubLink, label: 'GitHub', icon: <Github size={18} /> },
        { href: settings?.dribbbleLink, label: 'Dribbble', icon: <Dribbble size={18} /> },
        { href: settings?.huggingfaceLink, label: 'Hugging Face', icon: <HuggingFaceIcon /> },
        { href: settings?.leetcodeLink, label: 'LeetCode', icon: <LeetCodeIcon /> },
        { href: settings?.websiteLink, label: 'Website', icon: <Globe size={18} /> },
    ]
    const visibleSocials = socials.filter((s) => !!s.href)

    return (
        <aside className="space-y-6 lg:sticky lg:top-16 lg:self-start">
            <div>
                <h1 className="break-words font-heading text-3xl font-normal leading-tight tracking-tight text-foreground">
                    {settings?.siteName || 'My Blog'}
                </h1>
                {settings?.siteDescription && (
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {settings.siteDescription}
                    </p>
                )}
                {settings?.authorName && (
                    <p className="mt-3 text-sm text-muted-foreground">
                        By <span className="font-medium text-foreground">{settings.authorName}</span>
                    </p>
                )}
            </div>

            {visibleSocials.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {visibleSocials.map((s) => (
                        <a
                            key={s.label}
                            href={s.href!}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={s.label}
                            className="flex h-9 w-9 items-center justify-center rounded-full border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                            {s.icon}
                        </a>
                    ))}
                </div>
            )}

            {settings?.newsletterEnabled && (
                <Button onClick={onSubscribe} className="w-full gap-2">
                    <Mail className="h-4 w-4" /> Subscribe
                </Button>
            )}
        </aside>
    )
}

function BlogIndex({
    loading,
    posts,
    searchTerm,
    onSearchChange,
    page,
    totalPages,
    onPageChange,
}: {
    loading: boolean
    posts: Post[]
    searchTerm: string
    onSearchChange: (v: string) => void
    page: number
    totalPages: number
    onPageChange: (p: number) => void
}) {
    if (loading) {
        return (
            <div className="space-y-6">
                {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-28 w-full rounded-xl" />
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <Input
                placeholder="Search posts…"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="h-11"
            />

            {posts.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                        {searchTerm ? 'No posts match that search.' : 'No posts yet.'}
                    </CardContent>
                </Card>
            ) : (
                <ul className="divide-y divide-border">
                    {posts.map((p) => (
                        <li key={p.id} className="py-6">
                            <Link to={`/blog/${p.slug}`} className="group block">
                                <h2 className="font-heading text-2xl font-normal leading-tight tracking-tight text-foreground group-hover:underline">
                                    {p.title}
                                </h2>
                                {p.excerpt && (
                                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                                        {p.excerpt}
                                    </p>
                                )}
                                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                                    {p.publishedAt && (
                                        <span>{format(new Date(p.publishedAt), 'MMM d, yyyy')}</span>
                                    )}
                                    {p.views !== undefined && (
                                        <>
                                            <span>·</span>
                                            <span>{p.views.toLocaleString()} views</span>
                                        </>
                                    )}
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}

            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 1}
                        onClick={() => onPageChange(page - 1)}
                    >
                        Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        {page} / {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page === totalPages}
                        onClick={() => onPageChange(page + 1)}
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    )
}
