import { useEffect } from 'react'
import { PenTool, Layout, Lock, Github } from 'lucide-react'
import ThemeToggle from '../../components/common/ui/ThemeToggle'
import ShinyText from '../../components/common/ui/ShinyText'
import Dither from '../../components/common/animations/Dither'
import NeumorphismButton from '../../components/common/ui/NeumorphismButton'
import PixelCard from '../../components/common/ui/PixelCard'
import { postService } from '@/services/postService'
import { settingsService } from '@/services/settingsService'
export default function Landing() {
    useEffect(() => {
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (reduceMotion) return

        const resetGlass = (target: HTMLElement) => {
            target.style.setProperty('--lg-tilt-x', '0deg')
            target.style.setProperty('--lg-tilt-y', '0deg')
            target.style.setProperty('--lg-pointer-x', '50%')
            target.style.setProperty('--lg-pointer-y', '50%')
        }

        const handlePointerMove = (event: PointerEvent) => {
            const source = event.target
            if (!(source instanceof Element)) return

            const target = source.closest('.liquid-glass')
            if (!(target instanceof HTMLElement)) return

            const rect = target.getBoundingClientRect()
            if (rect.width === 0 || rect.height === 0) return

            const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
            const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
            const tiltLimit = target.classList.contains('liquid-glass-hero') ? 2.4 : 5

            target.style.setProperty('--lg-pointer-x', `${x * 100}%`)
            target.style.setProperty('--lg-pointer-y', `${y * 100}%`)
            target.style.setProperty('--lg-tilt-x', `${(0.5 - y) * tiltLimit}deg`)
            target.style.setProperty('--lg-tilt-y', `${(x - 0.5) * tiltLimit}deg`)
        }

        const handlePointerOut = (event: PointerEvent) => {
            const source = event.target
            if (!(source instanceof Element)) return

            const target = source.closest('.liquid-glass')
            if (!(target instanceof HTMLElement)) return

            const next = event.relatedTarget
            if (next instanceof Node && target.contains(next)) return

            resetGlass(target)
        }

        document.addEventListener('pointermove', handlePointerMove, { passive: true })
        document.addEventListener('pointerout', handlePointerOut, true)

        return () => {
            document.removeEventListener('pointermove', handlePointerMove)
            document.removeEventListener('pointerout', handlePointerOut, true)
        }
    }, [])

    const prefetchBlog = () => {
        postService.prefetchPublicPosts()
        settingsService.prefetchSettings({ preferFresh: true })
    }

    return (
        <div className="landing-page" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', position: 'relative', overflow: 'hidden' }}>
            <svg className="liquid-glass-filter" width="0" height="0" aria-hidden="true" focusable="false">
                <filter id="liquid-glass-ripple">
                    <feTurbulence type="fractalNoise" baseFrequency="0.012 0.026" numOctaves="2" seed="7" result="noise" />
                    <feDisplacementMap in="SourceGraphic" in2="noise" scale="7" xChannelSelector="R" yChannelSelector="G" />
                </filter>
            </svg>

            <div className="landing-dither-bg" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.62 }}>
                <Dither
                    waveColor={[0.5, 0.5, 0.5]}
                    disableAnimation={false}
                    enableMouseInteraction
                    mouseRadius={0.3}
                    colorNum={4}
                    waveAmplitude={0.3}
                    waveFrequency={3}
                    waveSpeed={0.05}
                />
            </div>
            <div style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none', background: 'radial-gradient(circle at 50% 42%, transparent 0%, color-mix(in srgb, var(--bg-primary) 52%, transparent) 62%, var(--bg-primary) 100%)' }} />

            <div className="landing-theme-toggle" style={{
                position: 'fixed',
                top: '2rem',
                right: '2rem',
                zIndex: 100,
            }}>
                <ThemeToggle />
            </div>

            <nav style={{ position: 'relative', zIndex: 10, padding: '2rem 7rem 2rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="landing-logo-pill liquid-glass" style={{ width: '46px', height: '46px' }}>
                    <img src="/Di.png" alt="DyeInk" className="logo-adaptive" style={{ height: '100%', width: '100%', objectFit: 'contain' }} />
                </div>
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', marginTop: '-8px' }}>
                    <NeumorphismButton to="/login" text="Sign In" icon={null} className="liquid-glass liquid-glass-action" />
                </div>
            </nav>

            <main style={{
                position: 'relative',
                zIndex: 10,
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '0 2rem',
                textAlign: 'center',
                minHeight: 'calc(100vh - 140px)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
            }}>
                <div className="landing-hero-pane liquid-glass liquid-glass-hero">
                    <h1 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 'clamp(4.5rem, 12vw, 8rem)',
                        fontWeight: 800,
                        lineHeight: 1.05,
                        marginBottom: '2rem',
                        letterSpacing: '-0.04em',
                        color: 'var(--text-primary)'
                    }}>
                        <ShinyText text="Purify your" speed={3} />
                        <br />
                        <ShinyText text="digital thoughts." speed={3} />
                    </h1>
                    <p style={{
                        fontSize: '1.25rem',
                        color: 'var(--text-secondary)',
                        maxWidth: '500px',
                        margin: '0 auto 2rem auto',
                        lineHeight: 1.6,
                        fontFamily: 'var(--font-display)',
                        fontWeight: 500
                    }}>
                        A minimal, distraction-free publishing platform for writers who value clarity and silence.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <NeumorphismButton to="/blog" text="Read the blog" icon={null} onPrefetch={prefetchBlog} className="liquid-glass liquid-glass-action" />
                    </div>
                </div>
            </main>

            <section style={{ position: 'relative', zIndex: 10, maxWidth: '1000px', margin: '0 auto', padding: '4rem 2rem 8rem 2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', justifyItems: 'center' }}>
                <PixelCard variant="pink" className="feature-card-override liquid-glass landing-liquid-card">
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', zIndex: 20 }}>
                        <div style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}><PenTool size={32} /></div>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Rich Editor</h3>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>A powerful, distraction-free editor that supports what matters, your words.</p>
                    </div>
                </PixelCard>
                <PixelCard variant="pink" className="feature-card-override liquid-glass landing-liquid-card">
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', zIndex: 20 }}>
                        <div style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}><Layout size={32} /></div>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Clean Aesthetic</h3>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>Your blog looks consistently beautiful on every device, automatically.</p>
                    </div>
                </PixelCard>
                <PixelCard variant="pink" className="feature-card-override liquid-glass landing-liquid-card">
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', zIndex: 20 }}>
                        <div style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}><Lock size={32} /></div>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Secure Platform</h3>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>Built on modern infrastructure to keep your content safe and always online.</p>
                    </div>
                </PixelCard>
            </section>
            <footer style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '2rem', display: 'flex', justifyContent: 'center' }}>
                <a
                    href="https://github.com/subratomandalme/dyeink"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        color: 'var(--text-secondary)',
                        transition: 'color 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                >
                    <Github size={24} />
                </a>
            </footer>

            <style>{`
                .liquid-glass-filter {
                    position: absolute;
                    pointer-events: none;
                }
                .liquid-glass {
                    --lg-pointer-x: 50%;
                    --lg-pointer-y: 50%;
                    --lg-tilt-x: 0deg;
                    --lg-tilt-y: 0deg;
                    --lg-radius: 30px;
                    position: relative;
                    isolation: isolate;
                    overflow: hidden;
                    border: 1px solid color-mix(in srgb, var(--text-primary) 17%, transparent);
                    border-radius: var(--lg-radius);
                    background:
                        radial-gradient(circle at var(--lg-pointer-x) var(--lg-pointer-y), color-mix(in srgb, var(--text-primary) 20%, transparent), transparent 34%),
                        linear-gradient(135deg, color-mix(in srgb, var(--bg-secondary) 68%, transparent), color-mix(in srgb, var(--bg-primary) 34%, transparent));
                    box-shadow:
                        0 22px 70px rgba(0, 0, 0, 0.18),
                        inset 0 1px 0 color-mix(in srgb, var(--text-primary) 28%, transparent),
                        inset 0 -1px 0 color-mix(in srgb, var(--bg-primary) 70%, transparent);
                    backdrop-filter: blur(18px) saturate(1.45);
                    -webkit-backdrop-filter: blur(18px) saturate(1.45);
                    transform: perspective(1000px) rotateX(var(--lg-tilt-x)) rotateY(var(--lg-tilt-y)) translateZ(0);
                    transform-style: preserve-3d;
                    transition:
                        transform 420ms cubic-bezier(0.22, 1, 0.36, 1),
                        border-color 260ms ease,
                        box-shadow 260ms ease;
                }
                .liquid-glass::before,
                .liquid-glass::after {
                    content: "";
                    position: absolute;
                    inset: 0;
                    border-radius: inherit;
                    pointer-events: none;
                }
                .liquid-glass::before {
                    z-index: 1;
                    padding: 1px;
                    background:
                        linear-gradient(135deg, color-mix(in srgb, var(--text-primary) 42%, transparent), transparent 28%, transparent 64%, color-mix(in srgb, var(--text-primary) 20%, transparent)),
                        radial-gradient(circle at var(--lg-pointer-x) var(--lg-pointer-y), color-mix(in srgb, var(--text-primary) 42%, transparent), transparent 28%);
                    mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
                    mask-composite: exclude;
                    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
                    -webkit-mask-composite: xor;
                    opacity: 0.85;
                }
                .liquid-glass::after {
                    z-index: 2;
                    background:
                        linear-gradient(112deg, transparent 15%, color-mix(in srgb, var(--text-primary) 16%, transparent) 32%, transparent 48%),
                        radial-gradient(ellipse at var(--lg-pointer-x) var(--lg-pointer-y), color-mix(in srgb, var(--text-primary) 16%, transparent), transparent 38%);
                    filter: url(#liquid-glass-ripple);
                    mix-blend-mode: screen;
                    opacity: 0.48;
                    animation: liquid-specular 7s ease-in-out infinite alternate;
                }
                .liquid-glass > * {
                    position: relative;
                    z-index: 3;
                }
                .landing-logo-pill {
                    --lg-radius: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0.38rem;
                }
                .landing-hero-pane {
                    --lg-radius: 42px;
                    max-width: min(100%, 980px);
                    padding: clamp(2rem, 5vw, 4rem);
                }
                .liquid-glass-action {
                    --lg-radius: 999px;
                    border: 1px solid color-mix(in srgb, var(--text-primary) 18%, transparent) !important;
                    background:
                        radial-gradient(circle at var(--lg-pointer-x) var(--lg-pointer-y), color-mix(in srgb, var(--text-primary) 24%, transparent), transparent 38%),
                        color-mix(in srgb, var(--bg-secondary) 62%, transparent) !important;
                    box-shadow:
                        0 18px 44px rgba(0, 0, 0, 0.14),
                        inset 0 1px 0 color-mix(in srgb, var(--text-primary) 26%, transparent) !important;
                    color: var(--text-primary) !important;
                }
                .liquid-glass-action:hover {
                    transform: perspective(1000px) rotateX(var(--lg-tilt-x)) rotateY(var(--lg-tilt-y)) translateY(-1px) !important;
                    box-shadow:
                        0 24px 54px rgba(0, 0, 0, 0.2),
                        inset 0 1px 0 color-mix(in srgb, var(--text-primary) 34%, transparent) !important;
                }
                .landing-liquid-card {
                    --lg-radius: 28px;
                    border-color: color-mix(in srgb, var(--text-primary) 16%, transparent) !important;
                    box-shadow:
                        0 26px 80px rgba(0, 0, 0, 0.2),
                        inset 0 1px 0 color-mix(in srgb, var(--text-primary) 22%, transparent) !important;
                }
                .landing-liquid-card .pixel-canvas {
                    position: absolute;
                    inset: 0;
                    z-index: 0;
                    opacity: 0.18;
                    mix-blend-mode: screen;
                }
                .landing-liquid-card::before {
                    display: block !important;
                }
                @keyframes liquid-specular {
                    0% {
                        opacity: 0.28;
                        transform: translate3d(-8%, -5%, 0) rotate(-2deg);
                    }
                    100% {
                        opacity: 0.62;
                        transform: translate3d(8%, 5%, 0) rotate(2deg);
                    }
                }
                @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
                    .liquid-glass {
                        background: color-mix(in srgb, var(--bg-secondary) 92%, transparent);
                    }
                }
                @media (prefers-reduced-motion: reduce) {
                    .liquid-glass,
                    .liquid-glass::after {
                        animation: none !important;
                        transform: none !important;
                        transition: none !important;
                    }
                }
                @media (max-width: 768px) {
                    .liquid-glass {
                        backdrop-filter: blur(12px) saturate(1.25);
                        -webkit-backdrop-filter: blur(12px) saturate(1.25);
                    }
                    .liquid-glass::after {
                        opacity: 0.32;
                    }
                    .landing-theme-toggle {
                        top: 1rem !important;
                        right: 1rem !important;
                    }
                    .landing-page > nav {
                        padding: 1rem 4.75rem 0.75rem 1rem !important;
                    }
                    .landing-page > nav > div:first-child {
                        width: 38px !important;
                        height: 38px !important;
                    }
                    .landing-page > nav > div:last-child {
                        margin-top: 0 !important;
                    }
                    .landing-hero-pane {
                        --lg-radius: 28px;
                        padding: 1.45rem 1rem 1.35rem !important;
                        width: 100%;
                    }
                    .landing-page main h1 {
                        font-size: clamp(2.65rem, 13.25vw, 5.35rem) !important;
                        margin-bottom: 1.1rem !important;
                        line-height: 1.02 !important;
                    }
                    .landing-page main p {
                        font-size: clamp(1rem, 4vw, 1.12rem) !important;
                        max-width: 100% !important;
                        padding: 0 !important;
                        margin-bottom: 1.5rem !important;
                    }
                    .landing-page main {
                        padding: 1.5rem 1.125rem 0 !important;
                        min-height: clamp(430px, 72svh, 620px) !important;
                    }
                    .landing-page section {
                        grid-template-columns: minmax(0, 1fr) !important;
                        padding: 1.75rem 1rem 2.75rem !important;
                        gap: 1.1rem !important;
                    }
                    .landing-page .neu-btn {
                        min-height: 44px !important;
                        padding-left: 1.1rem !important;
                        padding-right: 1.1rem !important;
                        font-size: 0.95rem !important;
                    }
                    .landing-page footer {
                        padding: 1rem !important;
                    }
                }
            `}</style>
        </div>
    )
}
