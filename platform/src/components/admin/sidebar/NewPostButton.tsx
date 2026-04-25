import { Link } from 'react-router-dom'
import { prefetchOnIntent } from '@/lib/prefetch'

export default function NewPostButton({ onPrefetch }: { onPrefetch?: () => void }) {
    const handlePrefetch = () => {
        if (onPrefetch) prefetchOnIntent(onPrefetch)
    }

    return (
        <div className="new-post-btn px-5 pb-6">
            <Link
                to="/admin/posts/new"
                aria-label="New post"
                title="New post"
                onMouseEnter={handlePrefetch}
                onFocus={handlePrefetch}
                onTouchStart={handlePrefetch}
                className="magic-button relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-full px-6 py-3 text-sm font-semibold text-white shadow-[0_0_10px_rgba(168,85,247,0.25)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
                <span className="magic-text magic-text-full">New Post</span>
                <span className="magic-text magic-text-short" aria-hidden="true">New</span>
            </Link>

            <style>{`
                .magic-button {
                    background: transparent;
                    isolation: isolate;
                }
                .magic-button::before {
                    content: "";
                    position: absolute;
                    top: -150%;
                    left: -150%;
                    width: 400%;
                    height: 400%;
                    background: conic-gradient(
                        from 0deg,
                        transparent 0deg,
                        #a855f7 40deg,
                        #ec4899 100deg,
                        transparent 160deg,
                        transparent 360deg
                    );
                    animation: magic-rotate 4s linear infinite;
                    z-index: -2;
                    filter: blur(20px);
                }
                .magic-button::after {
                    content: "";
                    position: absolute;
                    inset: 3px;
                    background: hsl(var(--card));
                    border-radius: 9999px;
                    z-index: -1;
                    transition: opacity 0.4s ease;
                }
                .magic-button:hover::after { opacity: 0; }
                .magic-text {
                    background: linear-gradient(to right, hsl(var(--foreground)), hsl(var(--muted-foreground)));
                    -webkit-background-clip: text;
                    background-clip: text;
                    color: transparent;
                    z-index: 10;
                    position: relative;
                    letter-spacing: 0.02em;
                    transition: color 0.3s ease;
                }
                .magic-text-short {
                    display: none;
                }
                .magic-button:hover .magic-text {
                    color: #ffffff;
                    background: none;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.3);
                }
                @media (max-width: 640px) {
                    .new-post-btn {
                        flex: 0 0 42px !important;
                        padding: 0 !important;
                    }
                    .new-post-btn .magic-button {
                        width: 42px !important;
                        height: 42px !important;
                        padding: 0 !important;
                    }
                    .new-post-btn .magic-text-full {
                        display: none !important;
                    }
                    .new-post-btn .magic-text-short {
                        display: inline !important;
                        font-size: 0.62rem;
                        letter-spacing: 0;
                    }
                }
                @keyframes magic-rotate {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    )
}
