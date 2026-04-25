import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Dribbble, Github, Globe, Linkedin, Share2 } from 'lucide-react'
import ThemeToggle from '@/components/common/ui/ThemeToggle'
import SubscribeModal from '@/components/common/ui/SubscribeModal'
import { useToast } from '@/components/common/feedback/Toast'
import { useCodeCopy } from '@/hooks/useCodeCopy'
import { postService } from '@/services/postService'
import { settingsService, type SiteSettings } from '@/services/settingsService'
import { statsService } from '@/services/statsService'
import type { Post, PublicPost } from '@/types'
import { formatDateShort } from '@/lib/date'
import { renderGitHubContent, renderMermaidDiagrams } from '@/lib/githubMarkdown'
import { prefetchOnIntent, scheduleIdlePrefetch } from '@/lib/prefetch'

const XIcon = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18.901 3H21L14.415 10.531L22.158 21H16.857L12.706 15.578L7.957 21H5.857L12.923 12.922L5.525 3H10.957L14.618 7.95L18.901 3ZM18.163 19.742H19.325L9.288 5.161H8.042L18.163 19.742Z" />
    </svg>
)

const HuggingFaceIcon = ({ size = 20 }: { size?: number }) => (
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
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
        <path d="M9 13h.01M15 13h.01M10 16s1 1 2 1 2-1 2-1" />
    </svg>
)

const LeetCodeIcon = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.843 5.843 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-.8-.647-1.766-1.045-2.774-1.202l2.015-2.158A1.384 1.384 0 0 0 13.483 0zm-2.866 12.815a1.38 1.38 0 0 0-1.38 1.382 1.38 1.38 0 0 0 1.38 1.382H20.79a1.38 1.38 0 0 0 1.38-1.382 1.38 1.38 0 0 0-1.38-1.382z" />
    </svg>
)

const ITEMS_PER_PAGE = 5

export default function Blog() {
    const { slug } = useParams<{ slug?: string }>()
    const [searchParams, setSearchParams] = useSearchParams()
    const [posts, setPosts] = useState<PublicPost[] | null>(null)
    const [activePost, setActivePost] = useState<Post | null>(null)
    const [activePostLoading, setActivePostLoading] = useState(false)
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
                    settingsService.getSettings({ preferFresh: true }),
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
        if (!slug) {
            setActivePost(null)
            return
        }
        let cancelled = false
        const loadPost = async () => {
            setActivePostLoading(true)
            const found = await postService.getPublicPostBySlug(slug)
            if (cancelled) return
            setActivePost(found)
            if (found) {
                statsService.trackEvent(found.id, 'view').catch(() => {})
            }
            setActivePostLoading(false)
        }
        loadPost()
        return () => {
            cancelled = true
        }
    }, [slug])

    const visiblePosts = useMemo(() => {
        if (!posts) return []
        return posts.filter((p) => p.title.toLowerCase().includes(searchTerm.toLowerCase()))
    }, [posts, searchTerm])

    const totalPages = Math.max(1, Math.ceil(visiblePosts.length / ITEMS_PER_PAGE))
    const pageStart = (currentPage - 1) * ITEMS_PER_PAGE
    const pagePosts = useMemo(() => visiblePosts.slice(pageStart, pageStart + ITEMS_PER_PAGE), [pageStart, visiblePosts])
    const nextPagePosts = useMemo(
        () => visiblePosts.slice(pageStart + ITEMS_PER_PAGE, pageStart + ITEMS_PER_PAGE + 2),
        [pageStart, visiblePosts],
    )

    useEffect(() => {
        if (slug || pagePosts.length === 0) return
        return scheduleIdlePrefetch(() => {
            pagePosts.slice(0, 3).forEach((post) => postService.prefetchPublicPost(post.slug))
            nextPagePosts.forEach((post) => postService.prefetchPublicPost(post.slug))
        })
    }, [nextPagePosts, pagePosts, slug])

    const handlePageChange = (page: number) => {
        setSearchParams({ page: page.toString() })
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleShare = async (post: Pick<Post, 'id' | 'slug' | 'title'>) => {
        const permalink = `${window.location.origin}/blog/${post.slug}`
        try {
            if (navigator.share) {
                await navigator.share({ title: post.title, url: permalink })
            } else {
                await navigator.clipboard.writeText(permalink)
                addToast({ type: 'success', message: 'Link copied to clipboard', duration: 2000 })
            }
            statsService.trackEvent(post.id, 'share').catch(() => {})
        } catch {
            // User cancelled native sharing.
        }
    }

    const detailPosts = activePost ? [activePost] : []
    const isEmpty = !loading && !slug && visiblePosts.length === 0
    const isDetailMissing = !!slug && !activePostLoading && !loading && !activePost

    return (
        <div style={{ minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 0,
                    background: 'radial-gradient(circle at 10% 10%, var(--bg-secondary), var(--bg-primary))',
                }}
            />

            <div
                className="blog-theme-toggle-wrapper"
                style={{
                    position: 'fixed',
                    top: '1.5rem',
                    right: '1.5rem',
                    zIndex: 100,
                    border: '1px solid var(--border-color)',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'var(--bg-secondary)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
            >
                <ThemeToggle />
            </div>

            <div
                className="blog-layout-grid"
                style={{
                    position: 'relative',
                    zIndex: 10,
                    maxWidth: '1000px',
                    margin: '0 auto',
                    padding: '4rem 2rem',
                    display: 'grid',
                    gridTemplateColumns: 'minmax(200px, 250px) 1fr',
                    gap: '4rem',
                }}
            >
                <BlogSidebar
                    settings={settings}
                    loading={loading}
                    slug={slug}
                    searchTerm={searchTerm}
                    onSearchChange={(value) => {
                        setSearchTerm(value)
                        if (!slug) setSearchParams({ page: '1' })
                    }}
                    onSubscribe={() => setIsSubscribeOpen(true)}
                />

                <main ref={contentRef} style={{ paddingTop: '0.4rem' }}>
                    {loading || activePostLoading ? (
                        <div style={{ padding: '2rem 0', color: 'var(--text-muted)' }}>Loading...</div>
                    ) : isEmpty ? (
                        <div style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', fontWeight: 500 }}>
                            {searchTerm ? 'No posts match that search.' : 'No posts published yet.'}
                        </div>
                    ) : isDetailMissing ? (
                        <div style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', fontWeight: 500 }}>
                            Post not found.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: slug ? 0 : '2.5rem' }}>
                            {(slug ? detailPosts : pagePosts).map((post, index) => (
                                <BlogArticle
                                    key={post.id}
                                    post={post}
                                    isDetail={!!slug}
                                    isLast={index === (slug ? detailPosts : pagePosts).length - 1}
                                    searchTerm={searchTerm}
                                    onShare={() => handleShare(post)}
                                />
                            ))}

                            {!slug && totalPages > 1 && (
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        alignItems: 'center',
                                        marginTop: '2rem',
                                    }}
                                >
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                                        <button
                                            key={number}
                                            type="button"
                                            onClick={() => handlePageChange(number)}
                                            style={{
                                                width: '32px',
                                                height: '32px',
                                                borderRadius: '4px',
                                                border: '1px solid var(--border-color)',
                                                background: currentPage === number ? 'var(--text-primary)' : 'transparent',
                                                color: currentPage === number ? 'var(--bg-primary)' : 'var(--text-primary)',
                                                cursor: 'pointer',
                                                fontSize: '0.9rem',
                                                fontWeight: 600,
                                            }}
                                        >
                                            {number}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>

            <SubscribeModal isOpen={isSubscribeOpen} onClose={() => setIsSubscribeOpen(false)} />
            <BlogStyle />
        </div>
    )
}

function BlogSidebar({
    settings,
    loading,
    slug,
    searchTerm,
    onSearchChange,
    onSubscribe,
}: {
    settings: SiteSettings | null
    loading: boolean
    slug?: string
    searchTerm: string
    onSearchChange: (value: string) => void
    onSubscribe: () => void
}) {
    const blogTitle = settings?.siteName || 'DyeInk'
    const prefetchPostList = () => prefetchOnIntent(() => postService.prefetchPublicPosts())
    const visibleSocials = [
        { href: settings?.twitterLink, label: 'Follow on X / Twitter', icon: <XIcon /> },
        { href: settings?.linkedinLink, label: 'Connect on LinkedIn', icon: <Linkedin size={20} /> },
        { href: settings?.githubLink, label: 'View on GitHub', icon: <Github size={20} /> },
        { href: settings?.dribbbleLink, label: 'View on Dribbble', icon: <Dribbble size={20} /> },
        { href: settings?.leetcodeLink, label: 'View on LeetCode', icon: <LeetCodeIcon /> },
        { href: settings?.huggingfaceLink, label: 'View on Hugging Face', icon: <HuggingFaceIcon /> },
        { href: settings?.websiteLink, label: 'Visit Website', icon: <Globe size={20} /> },
    ].filter((social): social is { href: string; label: string; icon: JSX.Element } => !!social.href)

    return (
        <aside style={{ position: 'sticky', top: '4rem', height: 'fit-content' }}>
            <div style={{ marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 }}>
                    <h1
                        style={{
                            fontFamily: "'Jost', sans-serif",
                            fontSize: '1.8rem',
                            fontWeight: 400,
                            color: 'var(--text-primary)',
                            display: '-webkit-box',
                            letterSpacing: '-0.03em',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            wordBreak: 'break-word',
                            lineHeight: 1.15,
                            margin: 0,
                        }}
                    >
                        {loading ? 'DyeInk' : blogTitle}
                    </h1>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {slug ? (
                    <Link
                        to="/blog"
                        className="sidebar-link"
                        aria-label="Back to all posts"
                        title="Back to all posts"
                        onMouseEnter={prefetchPostList}
                        onFocus={prefetchPostList}
                        onTouchStart={prefetchPostList}
                        style={{ fontSize: '0.95rem', lineHeight: 1.35, display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                        <ArrowLeft size={18} />
                    </Link>
                ) : null}

                {settings?.newsletterEnabled && (
                    <button
                        type="button"
                        onClick={onSubscribe}
                        className="sidebar-link"
                        style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontFamily: "'Jost', sans-serif",
                            fontWeight: 400,
                            fontSize: '0.95rem',
                            lineHeight: 1.35,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                        }}
                    >
                        Subscribe by email
                    </button>
                )}

                <div className="sidebar-search-wrapper" style={{ margin: '0.35rem 0' }}>
                    <input
                        className="blog-search-input"
                        type="text"
                        placeholder="Search here..."
                        value={searchTerm}
                        onChange={(event) => onSearchChange(event.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.5rem',
                            fontSize: '0.9rem',
                            border: '1px solid var(--border-color)',
                            background: 'transparent',
                            borderRadius: '4px',
                            color: 'var(--text-primary)',
                        }}
                    />
                </div>

                <div className="blog-social-links" style={{ display: 'flex', gap: '0.75rem', marginTop: '0.1rem' }}>
                    {visibleSocials.map((social) => (
                        <a
                            key={social.label}
                            href={formatHref(social.href)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                color: 'var(--text-secondary)',
                                transition: 'color 0.2s',
                                display: 'inline-flex',
                            }}
                            onMouseEnter={(event) => {
                                event.currentTarget.style.color = 'var(--text-primary)'
                            }}
                            onMouseLeave={(event) => {
                                event.currentTarget.style.color = 'var(--text-secondary)'
                            }}
                            title={social.label}
                            aria-label={social.label}
                        >
                            {social.icon}
                        </a>
                    ))}
                </div>
            </div>
        </aside>
    )
}

function BlogArticle({
    post,
    isDetail,
    isLast,
    searchTerm,
    onShare,
}: {
    post: PublicPost | Post
    isDetail: boolean
    isLast: boolean
    searchTerm: string
    onShare: () => void
}) {
    const content = isDetail && 'content' in post ? post.content : ''
    const publicPreview = 'preview' in post ? post.preview : undefined
    const preview = !isDetail ? publicPreview || htmlToPlainText(post.excerpt) : ''
    const articleRef = useRef<HTMLElement>(null)
    const prefetchPost = () => prefetchOnIntent(() => postService.prefetchPublicPost(post.slug))
    const articleHtml = useMemo(() => {
        return content ? renderGitHubContent(content, searchTerm) : ''
    }, [content, searchTerm])

    useEffect(() => {
        if (!articleRef.current || !isDetail) return
        renderMermaidDiagrams(articleRef.current)
    }, [articleHtml, isDetail])

    return (
        <article
            ref={articleRef}
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                paddingBottom: isDetail ? '2rem' : '1.75rem',
                borderBottom: !isLast ? '1px dashed var(--border-color)' : 'none',
            }}
        >
            <header>
                <h2
                    style={{
                        fontFamily: "'Jost', sans-serif",
                        fontSize: '1.5rem',
                        fontWeight: 400,
                        lineHeight: 1.1,
                        marginBottom: '0.75rem',
                        letterSpacing: '-0.02em',
                        color: 'var(--text-primary)',
                        textWrap: 'balance',
                        overflowWrap: 'anywhere',
                        wordBreak: 'break-word',
                    }}
                >
                    {isDetail ? (
                        post.title
                    ) : (
                        <Link
                            to={`/blog/${post.slug}`}
                            onMouseEnter={prefetchPost}
                            onFocus={prefetchPost}
                            onTouchStart={prefetchPost}
                            style={{ textDecoration: 'none', color: 'inherit' }}
                        >
                            {post.title}
                        </Link>
                    )}
                </h2>
            </header>

            {isDetail ? (
                <div className="post-content">
                    {content ? (
                        <div
                            style={{
                                color: 'var(--text-secondary)',
                                lineHeight: 1.6,
                                fontSize: '0.95rem',
                                maxWidth: '700px',
                                fontFamily: "'Jost', sans-serif",
                                fontWeight: 400,
                            }}
                            dangerouslySetInnerHTML={{
                                __html: articleHtml,
                            }}
                        />
                    ) : null}
                </div>
            ) : (
                preview && (
                    <p
                        className="blog-post-preview"
                        title={preview}
                        style={{
                            color: 'var(--text-secondary)',
                            lineHeight: 1.6,
                            fontSize: '0.95rem',
                            maxWidth: '700px',
                            fontFamily: "'Jost', sans-serif",
                            fontWeight: 400,
                            margin: 0,
                        }}
                    >
                        {preview}
                    </p>
                )
            )}

            <div
                style={{
                    marginTop: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: 0,
                }}
            >
                <button
                    type="button"
                    onClick={onShare}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.85rem',
                        padding: 0,
                        transition: 'color 0.2s',
                    }}
                    onMouseEnter={(event) => {
                        event.currentTarget.style.color = 'var(--text-primary)'
                    }}
                    onMouseLeave={(event) => {
                        event.currentTarget.style.color = 'var(--text-secondary)'
                    }}
                >
                    <Share2 size={16} /> Share
                </button>

                <div
                    style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                    }}
                >
                    {post.publishedAt ? formatDateShort(post.publishedAt) : null}
                </div>
            </div>
        </article>
    )
}

function formatHref(href: string) {
    return href.startsWith('http') ? href : `https://${href}`
}

function htmlToPlainText(value: string) {
    return value
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim()
}

function BlogStyle() {
    return (
        <style>{`
            .sidebar-link {
                color: var(--text-secondary);
                text-decoration: none;
                font-size: 0.95rem;
                line-height: 1.35;
                transition: color 0.2s;
            }
            .sidebar-link:hover {
                color: var(--text-primary);
                text-decoration: underline;
            }
            .post-content a {
                color: var(--text-primary);
                text-decoration: underline;
            }
            .post-content [align="left"],
            .post-content [style*="text-align: left"] {
                text-align: left !important;
            }
            .post-content [align="center"],
            .post-content [style*="text-align: center"] {
                text-align: center !important;
            }
            .post-content [align="right"],
            .post-content [style*="text-align: right"] {
                text-align: right !important;
            }
            .post-content [align="justify"],
            .post-content [style*="text-align: justify"] {
                text-align: justify !important;
                text-align-last: auto;
            }
            .post-content img {
                max-width: 100%;
                height: auto;
                border-radius: 8px;
                margin: 1.5rem 0;
                display: block;
            }
            .post-content pre {
                max-width: 100%;
                overflow-x: auto;
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 1rem;
                background: var(--bg-secondary);
            }
            .post-content code {
                font-family: var(--font-mono);
                font-size: 0.9em;
            }
            .github-youtube-embed {
                position: relative;
                width: 100%;
                max-width: 700px;
                aspect-ratio: 16 / 9;
                overflow: hidden;
                border: 1px solid var(--border-color);
                border-radius: 12px;
                background: #000;
            }
            .github-youtube-embed iframe {
                position: absolute;
                inset: 0;
                width: 100%;
                height: 100%;
            }
            .github-markdown-table {
                width: 100%;
                max-width: 700px;
                border-collapse: collapse;
                overflow: hidden;
                border: 1px solid var(--border-color);
                border-radius: 8px;
                display: block;
            }
            .github-markdown-table th,
            .github-markdown-table td {
                border: 1px solid var(--border-color);
                padding: 0.65rem 0.8rem;
                text-align: left;
                vertical-align: top;
            }
            .github-markdown-table th {
                color: var(--text-primary);
                background: var(--bg-secondary);
            }
            .github-task-list {
                list-style: none;
                padding-left: 0 !important;
            }
            .github-task-list-item {
                display: flex;
                align-items: flex-start;
                gap: 0.5rem;
            }
            .github-task-list-item input {
                margin-top: 0.3em;
            }
            .github-alert {
                max-width: 700px;
                border-left: 4px solid #0969da;
                border-radius: 8px;
                padding: 0.85rem 1rem;
                background: rgba(9, 105, 218, 0.08);
            }
            .github-alert-title {
                margin-bottom: 0.35rem;
                font-family: var(--font-mono);
                font-size: 0.78rem;
                font-weight: 700;
                letter-spacing: 0.08em;
                color: #0969da;
            }
            .github-alert-tip { border-left-color: #1a7f37; background: rgba(26, 127, 55, 0.08); }
            .github-alert-tip .github-alert-title { color: #1a7f37; }
            .github-alert-important { border-left-color: #8250df; background: rgba(130, 80, 223, 0.08); }
            .github-alert-important .github-alert-title { color: #8250df; }
            .github-alert-warning { border-left-color: #9a6700; background: rgba(154, 103, 0, 0.1); }
            .github-alert-warning .github-alert-title { color: #9a6700; }
            .github-alert-caution { border-left-color: #cf222e; background: rgba(207, 34, 46, 0.08); }
            .github-alert-caution .github-alert-title { color: #cf222e; }
            .github-mermaid,
            .github-diagram {
                max-width: 700px;
                overflow-x: auto;
                border: 1px solid var(--border-color);
                border-radius: 12px;
                padding: 1rem;
                background: var(--bg-secondary);
            }
            .github-mermaid svg {
                display: block;
                max-width: 100%;
                height: auto;
                margin: 0 auto;
            }
            .github-mermaid-fallback::before {
                content: 'Mermaid source';
                display: block;
                margin-bottom: 0.5rem;
                font-family: var(--font-mono);
                font-size: 0.75rem;
                color: var(--text-muted);
                text-transform: uppercase;
                letter-spacing: 0.08em;
            }
            .github-diagram figcaption {
                margin-bottom: 0.75rem;
                font-family: var(--font-mono);
                font-size: 0.75rem;
                color: var(--text-muted);
                text-transform: uppercase;
                letter-spacing: 0.08em;
            }
            .github-footnotes {
                max-width: 700px;
                margin-top: 2rem;
                padding-top: 1rem;
                border-top: 1px solid var(--border-color);
                font-size: 0.85rem;
                color: var(--text-muted);
            }
            .github-math-inline {
                color: var(--text-primary);
                font-family: var(--font-mono);
            }
            .github-math-block {
                max-width: 700px;
                overflow-x: auto;
                border: 1px solid var(--border-color);
                border-radius: 12px;
                padding: 1rem;
                background: var(--bg-secondary);
                color: var(--text-primary);
                font-family: var(--font-mono);
            }
            .github-math-fallback {
                white-space: pre-wrap;
            }
            .blog-post-preview {
                display: -webkit-box;
                -webkit-line-clamp: 3;
                -webkit-box-orient: vertical;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .post-content > div {
                font-size: inherit !important;
            }
            .blog-search-highlight {
                background: rgba(0, 132, 255, 0.18);
                border-radius: 0.16em;
                color: #0084ff !important;
                padding: 0 0.08em;
            }
            @media (max-width: 768px) {
                .blog-layout-grid {
                    grid-template-columns: 1fr !important;
                    gap: 0.85rem !important;
                    padding: 4rem 1rem 1.75rem !important;
                }
                aside {
                    position: relative !important;
                    top: 0 !important;
                    padding-bottom: 0.35rem !important;
                    margin-bottom: 0.15rem;
                }
                aside > div:first-child {
                    margin-bottom: 0.4rem !important;
                }
                aside > div:first-child h1 {
                    font-size: clamp(1.4rem, 7.5vw, 1.95rem) !important;
                    font-weight: 500 !important;
                    line-height: 1.08 !important;
                }
                aside > div:last-child {
                    gap: 0.2rem !important;
                }
                .blog-search-input {
                    margin: 0 !important;
                    width: 100% !important;
                    min-height: 38px !important;
                    font-size: 0.95rem !important;
                    padding: 0.42rem 0.5rem !important;
                }
                aside > div:last-child > .sidebar-search-wrapper {
                    margin: 0 !important;
                    margin-top: 0.25rem !important;
                }
                .blog-social-links {
                    flex-direction: row !important;
                    flex-wrap: wrap !important;
                    gap: 0.25rem !important;
                    margin: 0 !important;
                    margin-top: 0.1rem !important;
                    padding: 0 !important;
                    display: flex !important;
                    align-items: center !important;
                    height: auto !important;
                }
                aside > div:last-child > div {
                    margin: 0 !important;
                    padding: 0 !important;
                }
                .blog-social-links a,
                .sidebar-link {
                    min-height: 32px !important;
                    min-width: 0 !important;
                    display: inline-flex !important;
                    align-items: center !important;
                    font-size: 0.9rem !important;
                    line-height: 1.2 !important;
                }
                .blog-social-links a {
                    min-width: 32px !important;
                    justify-content: center;
                }
                main {
                    padding-top: 0 !important;
                    min-width: 0 !important;
                }
                main > div {
                    gap: 0.9rem !important;
                }
                article {
                    gap: 0.55rem !important;
                    padding-bottom: 0.85rem !important;
                }
                article h2 {
                    font-size: clamp(1.12rem, 5.4vw, 1.52rem) !important;
                    line-height: 1.14 !important;
                    margin-bottom: 0.25rem !important;
                }
                .blog-post-preview {
                    font-size: 0.9rem !important;
                    line-height: 1.48 !important;
                }
                .blog-theme-toggle-wrapper {
                    top: 0.85rem !important;
                    right: 0.85rem !important;
                    width: 34px !important;
                    height: 34px !important;
                }
                .blog-theme-toggle-wrapper button {
                    width: 34px !important;
                    height: 34px !important;
                }
                .post-content img {
                    max-width: 100% !important;
                    height: auto !important;
                    margin: 1rem 0 !important;
                    border-radius: 6px !important;
                }
                .post-content,
                .post-content > div {
                    max-width: 100% !important;
                    font-size: 0.92rem !important;
                    line-height: 1.62 !important;
                    overflow-wrap: anywhere !important;
                }
                .github-markdown-table,
                .github-math-block,
                .github-mermaid,
                .github-diagram,
                .github-youtube-embed {
                    max-width: 100% !important;
                }
            }
        `}</style>
    )
}
