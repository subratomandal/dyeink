import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Dribbble, Github, Globe, Linkedin, Share2 } from 'lucide-react'
import DOMPurify from 'dompurify'
import ThemeToggle from '@/components/common/ui/ThemeToggle'
import SubscribeModal from '@/components/common/ui/SubscribeModal'
import { useToast } from '@/components/common/feedback/Toast'
import { useCodeCopy } from '@/hooks/useCodeCopy'
import { postService } from '@/services/postService'
import { settingsService, type SiteSettings } from '@/services/settingsService'
import { statsService } from '@/services/statsService'
import type { Post, PublicPost } from '@/types'
import { formatDateShort } from '@/lib/date'

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
    const pagePosts = visiblePosts.slice(pageStart, pageStart + ITEMS_PER_PAGE)

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
                        setSearchParams({ page: '1' })
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6rem' }}>
                            {(slug ? detailPosts : pagePosts).map((post, index) => (
                                <BlogArticle
                                    key={post.id}
                                    post={post}
                                    isDetail={!!slug}
                                    isLast={index === (slug ? detailPosts : pagePosts).length - 1}
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
            <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
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
                            lineHeight: 1.2,
                            margin: 0,
                        }}
                    >
                        {loading ? 'DyeInk' : blogTitle}
                    </h1>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {slug ? (
                    <Link
                        to="/blog"
                        className="sidebar-link"
                        style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <ArrowLeft size={16} /> All Posts
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
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                        }}
                    >
                        Subscribe by email
                    </button>
                )}

                {!slug && (
                    <div className="sidebar-search-wrapper" style={{ margin: '0.5rem 0' }}>
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
                )}

                <div style={{ display: 'flex', gap: '1rem' }}>
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
    onShare,
}: {
    post: PublicPost | Post
    isDetail: boolean
    isLast: boolean
    onShare: () => void
}) {
    const content = isDetail && 'content' in post ? post.content : ''
    const publicPreview = 'preview' in post ? post.preview : undefined
    const preview = !isDetail ? publicPreview || htmlToPlainText(post.excerpt) : ''

    return (
        <article
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
                paddingBottom: '3rem',
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
                            onMouseEnter={() => postService.prefetchPublicPost(post.slug)}
                            onFocus={() => postService.prefetchPublicPost(post.slug)}
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
                                __html: DOMPurify.sanitize(content, {
                                    ADD_TAGS: ['img'],
                                    ADD_ATTR: ['src', 'alt', 'width', 'height', 'style', 'target', 'rel'],
                                }),
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
                    marginTop: '1.5rem',
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
                font-size: 1rem;
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
            .post-content img {
                max-width: 100%;
                height: auto;
                border-radius: 8px;
                margin: 1.5rem 0;
                display: block;
            }
            .blog-post-preview {
                display: -webkit-box;
                -webkit-line-clamp: 3;
                -webkit-box-orient: vertical;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            @media (max-width: 499px) {
                div[style*="grid-template-columns"] {
                    grid-template-columns: 1fr !important;
                    gap: 1.5rem !important;
                    padding: 1.5rem 1rem !important;
                }
                aside {
                    position: relative !important;
                    top: 0 !important;
                    padding-bottom: 1rem !important;
                    margin-bottom: 0.5rem;
                }
                aside > div:first-child {
                    margin-bottom: 0.75rem !important;
                }
                aside > div:first-child h1 {
                    font-size: 2.2rem !important;
                    font-weight: 500 !important;
                    line-height: 1.1 !important;
                }
                aside > div:last-child {
                    gap: 0.2rem !important;
                }
                .blog-search-input {
                    margin: 0 !important;
                }
                aside > div:last-child > .sidebar-search-wrapper {
                    margin: 0 !important;
                    margin-top: 0.6rem !important;
                }
                aside > div:last-child > div:last-child {
                    flex-direction: row !important;
                    gap: 1.25rem !important;
                    margin: 0 !important;
                    margin-top: 0.65rem !important;
                    padding: 0 !important;
                    display: flex !important;
                    align-items: center !important;
                    height: auto !important;
                }
                aside > div:last-child > div {
                    margin: 0 !important;
                    padding: 0 !important;
                }
                main {
                    padding-top: 0 !important;
                }
                main > div {
                    gap: 3rem !important;
                }
                article {
                    gap: 1rem !important;
                    padding-bottom: 2rem !important;
                }
                article h2 {
                    font-size: 1.3rem !important;
                }
                .blog-theme-toggle-wrapper {
                    top: 1rem !important;
                    right: 1rem !important;
                    width: 36px !important;
                    height: 36px !important;
                }
                .blog-theme-toggle-wrapper button {
                    width: 36px !important;
                    height: 36px !important;
                }
                .blog-search-input {
                    width: 140px !important;
                }
                .post-content img {
                    max-width: 100% !important;
                    height: auto !important;
                    margin: 1rem 0 !important;
                    border-radius: 6px !important;
                }
            }
        `}</style>
    )
}
