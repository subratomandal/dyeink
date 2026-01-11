import { useEffect, useState, useRef } from 'react'
import { Link, useSearchParams, useParams, useNavigate } from 'react-router-dom'
import { postService } from '../../services/postService'
import { settingsService } from '../../services/settingsService'
import DOMPurify from 'dompurify'
import type { Post } from '../../types'
import { format } from 'date-fns'
import ThemeToggle from '../../components/common/ui/ThemeToggle'
import { Share2, Linkedin, Github, Globe, ArrowLeft, Dribbble } from 'lucide-react'


const XIcon = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M18.901 3H21L14.415 10.531L22.158 21H16.857L12.706 15.578L7.957 21H5.857L12.923 12.922L5.525 3H10.957L14.618 7.95L18.901 3ZM18.163 19.742H19.325L9.288 5.161H8.042L18.163 19.742Z" />
    </svg>
)

const HuggingFaceIcon = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
        <path d="M9 13h.01M15 13h.01M10 16s1 1 2 1 2-1 2-1" />
    </svg>
)



const LeetCodeIcon = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.843 5.843 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-.8-.647-1.766-1.045-2.774-1.202l2.015-2.158A1.384 1.384 0 0 0 13.483 0zm-2.866 12.815a1.38 1.38 0 0 0-1.38 1.382 1.38 1.38 0 0 0 1.38 1.382H20.79a1.38 1.38 0 0 0 1.38-1.382 1.38 1.38 0 0 0-1.38-1.382z" />
    </svg>
)


import { useToast } from '../../components/common/feedback/Toast'
import { useCodeCopy } from '../../hooks/useCodeCopy'
import SubscribeModal from '../../components/common/ui/SubscribeModal'
interface BlogProps {
    isCustomDomain?: boolean
}
export default function Blog({ isCustomDomain = false }: BlogProps) {
    const { slug, subdomain } = useParams()
    const [posts, setPosts] = useState<Post[]>([])
    const [loading, setLoading] = useState(true)
    const [searchParams, setSearchParams] = useSearchParams()
    const [searchTerm, setSearchTerm] = useState('')
    const [blogTitle, setBlogTitle] = useState('DyeInk')
    const [twitterLink, setTwitterLink] = useState<string | null>(null)
    const [linkedinLink, setLinkedinLink] = useState<string | null>(null)
    const [githubLink, setGithubLink] = useState<string | null>(null)
    const [websiteLink, setWebsiteLink] = useState<string | null>(null)
    const [dribbbleLink, setDribbbleLink] = useState<string | null>(null)
    const [huggingfaceLink, setHuggingfaceLink] = useState<string | null>(null)

    const [leetcodeLink, setLeetcodeLink] = useState<string | null>(null)

    const [newsletterEmail, setNewsletterEmail] = useState<string | null>(null)
    const [blogId, setBlogId] = useState<string | number | null>(null)
    const { addToast } = useToast()
    const [isSubscribeOpen, setIsSubscribeOpen] = useState(false)
    const contentRef = useRef<HTMLDivElement>(null)
    useCodeCopy(contentRef)
    const [userId, setUserId] = useState<string | null>(null)
    const itemsPerPage = 5
    const currentPage = parseInt(searchParams.get('page') || '1')
    const navigate = useNavigate()

    const isEffectiveCustomDomain = isCustomDomain || (
        !window.location.hostname.includes('localhost') &&
        !window.location.hostname.includes('vercel.app') &&
        window.location.hostname !== 'dyeink.subratomandal.com'
    )

    useEffect(() => {
        const loadSettings = async () => {
            try {
                let userConfig = null
                if (isEffectiveCustomDomain) {
                    const hostname = window.location.hostname
                    userConfig = await settingsService.getSettingsByCustomDomain(hostname)
                } else if (subdomain) {
                    userConfig = await settingsService.getSettingsBySubdomain(subdomain)
                }

                if (userConfig) {
                    const { settings, userId } = userConfig
                    setUserId(userId)
                    if (settings.siteName) setBlogTitle(settings.siteName)
                    setTwitterLink(settings.twitterLink || null)
                    setLinkedinLink(settings.linkedinLink || null)
                    setGithubLink(settings.githubLink || null)
                    setWebsiteLink(settings.websiteLink || null)
                    setDribbbleLink(settings.dribbbleLink || null)
                    setHuggingfaceLink(settings.huggingfaceLink || null)
                    setLeetcodeLink(settings.leetcodeLink || null)
                    setNewsletterEmail(settings.newsletterEmail || null)
                    setBlogId(settings.id || null)
                } else {
                    if (isEffectiveCustomDomain || subdomain) {
                        setBlogTitle('User Not Found')
                        setUserId(null)
                    } else {
                        navigate('/')
                    }
                }
            } catch (error) {
                console.error('Failed to load settings:', error)
            }
        }
        loadSettings()
    }, [subdomain, navigate, isEffectiveCustomDomain])

    useEffect(() => {
        if (!userId) return

        const loadPosts = async () => {
            setLoading(true)
            try {
                const fetchedPosts = await postService.getPosts({ userId, publishedOnly: true })
                setPosts(fetchedPosts)

                if (slug && fetchedPosts.length > 0) {
                    const activePost = fetchedPosts.find(p => p.slug === slug)
                    if (activePost) {
                        // Track view via API
                        fetch(`${import.meta.env.VITE_API_BASE_URL || '/api'}/hit`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ postId: activePost.id, type: 'view' })
                        }).catch(err => console.error('View tracking error:', err))
                    }
                }
            } catch (error) {
                console.error('Failed to load posts:', error)
            } finally {
                setLoading(false)
            }
        }
        loadPosts()
    }, [userId, slug])

    const filteredPosts = posts.filter(post => {
        if (!post.published) return false
        if (slug) return post.slug === slug
        return post.title.toLowerCase().includes(searchTerm.toLowerCase())
    })
    const totalPages = Math.ceil(filteredPosts.length / itemsPerPage)
    const indexOfLastPost = currentPage * itemsPerPage
    const indexOfFirstPost = indexOfLastPost - itemsPerPage
    const currentPosts = slug ? filteredPosts : filteredPosts.slice(indexOfFirstPost, indexOfLastPost)
    const handlePageChange = (page: number) => {
        setSearchParams({ page: page.toString() })
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    return (
        <div style={{ minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>

            <div style={{
                position: 'fixed',
                inset: 0,
                zIndex: 0,
                background: 'radial-gradient(circle at 10% 10%, var(--bg-secondary), var(--bg-primary))'
            }} />

            <div className="blog-theme-toggle-wrapper" style={{
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
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
                <ThemeToggle />
            </div>

            <div style={{ position: 'relative', zIndex: 10, maxWidth: '1000px', margin: '0 auto', padding: '4rem 2rem', display: 'grid', gridTemplateColumns: 'minmax(200px, 250px) 1fr', gap: '4rem' }}>

                <aside style={{ position: 'sticky', top: '4rem', height: 'fit-content' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            {isEffectiveCustomDomain ? (
                                <h1 style={{
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
                                    margin: 0
                                }}>
                                    {blogTitle}
                                </h1>
                            ) : (
                                <Link to="/" style={{
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
                                    lineHeight: 1.2
                                }}>
                                    {blogTitle}
                                </Link>
                            )}

                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {slug ? (
                            <Link to={subdomain ? `/${subdomain}` : "/blog"} className="sidebar-link" style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <ArrowLeft size={16} /> {subdomain ? '' : 'All Posts'}
                            </Link>
                        ) : !isEffectiveCustomDomain && (
                            <Link to="/" className="sidebar-link" style={{ fontSize: '0.95rem', fontFamily: "'Jost', sans-serif", fontWeight: 400 }}>
                                Home
                            </Link>
                        )}
                        {newsletterEmail && (
                            <button
                                onClick={() => setIsSubscribeOpen(true)}
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
                                    gap: '0.5rem'
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
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value)
                                        setSearchParams({ page: '1' })
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '0.5rem',
                                        fontSize: '0.9rem',
                                        border: '1px solid var(--border-color)',
                                        background: 'transparent',
                                        borderRadius: '4px',
                                        color: 'var(--text-primary)'
                                    }}
                                />
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '1rem' }}>

                            {twitterLink && (
                                <a
                                    href={twitterLink.startsWith('http') ? twitterLink : `https://${twitterLink}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        color: 'var(--text-secondary)',
                                        transition: 'color 0.2s',
                                        display: 'inline-flex'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                                    title="Follow on X / Twitter"
                                >
                                    <XIcon size={20} />
                                </a>
                            )}
                            {linkedinLink && (
                                <a
                                    href={linkedinLink.startsWith('http') ? linkedinLink : `https://${linkedinLink}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        color: 'var(--text-secondary)',
                                        transition: 'color 0.2s',
                                        display: 'inline-flex'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                                    title="Connect on LinkedIn"
                                >
                                    <Linkedin size={20} />
                                </a>
                            )}
                            {githubLink && (
                                <a
                                    href={githubLink.startsWith('http') ? githubLink : `https://${githubLink}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        color: 'var(--text-secondary)',
                                        transition: 'color 0.2s',
                                        display: 'inline-flex'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                                    title="View on GitHub"
                                >
                                    <Github size={20} />
                                </a>
                            )}
                            {dribbbleLink && (
                                <a
                                    href={dribbbleLink.startsWith('http') ? dribbbleLink : `https://${dribbbleLink}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        color: 'var(--text-secondary)',
                                        transition: 'color 0.2s',
                                        display: 'inline-flex'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                                    title="View on Dribbble"
                                >
                                    <Dribbble size={20} />
                                </a>
                            )}

                            {leetcodeLink && (
                                <a
                                    href={leetcodeLink.startsWith('http') ? leetcodeLink : `https://${leetcodeLink}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        color: 'var(--text-secondary)',
                                        transition: 'color 0.2s',
                                        display: 'inline-flex'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                                    title="View on LeetCode"
                                >
                                    <LeetCodeIcon size={20} />
                                </a>
                            )}

                            {huggingfaceLink && (
                                <a
                                    href={huggingfaceLink.startsWith('http') ? huggingfaceLink : `https://${huggingfaceLink}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        color: 'var(--text-secondary)',
                                        transition: 'color 0.2s',
                                        display: 'inline-flex'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                                    title="View on Hugging Face"
                                >
                                    <HuggingFaceIcon size={20} />
                                </a>
                            )}
                            {websiteLink && (
                                <a
                                    href={websiteLink.startsWith('http') ? websiteLink : `https://${websiteLink}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        color: 'var(--text-secondary)',
                                        transition: 'color 0.2s',
                                        display: 'inline-flex'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                                    title="Visit Website"
                                >
                                    <Globe size={20} />
                                </a>
                            )}
                        </div>

                    </div>
                </aside>

                <main ref={contentRef} style={{ paddingTop: '0.4rem' }}>
                    {loading ? (
                        <div style={{ padding: '2rem 0', color: 'var(--text-muted)' }}>Loading...</div>
                    ) : posts.length === 0 ? (
                        <div style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', fontWeight: 500 }}>
                            No posts published yet.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6rem' }}>
                            {currentPosts.map((post, index) => (
                                <article key={post.id} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem', borderBottom: index < currentPosts.length - 1 ? '1px dashed var(--border-color)' : 'none' }}>
                                    <header>

                                        <h2 style={{
                                            fontFamily: "'Jost', sans-serif",
                                            fontSize: '1.5rem',
                                            fontWeight: 400,
                                            lineHeight: 1.1,
                                            marginBottom: '0.75rem',
                                            letterSpacing: '-0.02em',
                                            color: 'var(--text-primary)',
                                            textWrap: 'balance',
                                            overflowWrap: 'anywhere',
                                            wordBreak: 'break-word'
                                        }}>
                                            {slug ? post.title : <Link to={subdomain ? `/${subdomain}/${post.slug}` : `/blog/${post.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>{post.title}</Link>}
                                        </h2>
                                    </header>

                                    <div
                                        className="post-content"
                                    >
                                        <div style={{
                                            color: 'var(--text-secondary)',
                                            lineHeight: 1.6,
                                            fontSize: '0.95rem',
                                            maxWidth: '700px',
                                            fontFamily: "'Jost', sans-serif",
                                            fontWeight: 400
                                        }} dangerouslySetInnerHTML={{
                                            __html: DOMPurify.sanitize(post.content, {
                                                ADD_TAGS: ['img'],
                                                ADD_ATTR: ['src', 'alt', 'width', 'height', 'style'],
                                            })
                                        }} />
                                    </div>

                                    <div style={{
                                        marginTop: '1.5rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        paddingTop: 0
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>

                                            <button
                                                onClick={() => {
                                                    const path = subdomain ? `/${subdomain}/${post.slug}` : `/blog/${post.slug}`
                                                    const permalink = window.location.origin + path
                                                    navigator.clipboard.writeText(permalink)
                                                    addToast({
                                                        type: 'success',
                                                        message: 'Link copied to clipboard',
                                                        duration: 2000
                                                    })
                                                    // Track share via API
                                                    fetch(`${import.meta.env.VITE_API_BASE_URL || '/api'}/hit`, {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ postId: post.id, type: 'share' })
                                                    }).catch(err => console.error('Share tracking error:', err))
                                                }}
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
                                                    transition: 'color 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                                            >
                                                <Share2 size={16} /> Share
                                            </button>
                                        </div>
                                        <div style={{
                                            fontFamily: 'var(--font-mono)',
                                            fontSize: '0.8rem',
                                            color: 'var(--text-muted)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em'
                                        }}>
                                            {post.publishedAt ? format(new Date(post.publishedAt), "MMM d, yyyy") : null}
                                        </div>
                                    </div>
                                </article>
                            ))}

                            {!slug && totalPages > 1 && (
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center', marginTop: '2rem' }}>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                                        <button
                                            key={number}
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
                                                fontWeight: 600
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
            </div >

            < SubscribeModal
                isOpen={isSubscribeOpen}
                onClose={() => setIsSubscribeOpen(false)
                }
                blogId={blogId}
            />
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
                    aside > div:first-child a {
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
        </div>
    )
}

