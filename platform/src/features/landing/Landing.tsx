import { PenTool, Layout, Lock, Github } from 'lucide-react'
import ThemeToggle from '../../components/common/ui/ThemeToggle'
import ShinyText from '../../components/common/ui/ShinyText'
import LightRays from '../../components/common/animations/LightRays'
import NeumorphismButton from '../../components/common/ui/NeumorphismButton'
import PixelCard from '../../components/common/ui/PixelCard'
import { postService } from '@/services/postService'
import { settingsService } from '@/services/settingsService'
export default function Landing() {
    const prefetchBlog = () => {
        postService.prefetchPublicPosts()
        settingsService.prefetchSettings({ preferFresh: true })
    }

    return (
        <div className="landing-page" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', position: 'relative', overflow: 'hidden' }}>

            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}>
                <LightRays
                    raysOrigin="top-center"
                    raysColor="#00ffff"
                    raysSpeed={2.0}
                    lightSpread={5.0}
                    rayLength={10.0}
                    followMouse={true}
                    mouseInfluence={0.2}
                    noiseAmount={0.1}
                    distortion={0.1}
                />
            </div>

            <div className="landing-theme-toggle" style={{
                position: 'fixed',
                top: '2rem',
                right: '2rem',
                zIndex: 100,
            }}>
                <ThemeToggle />
            </div>

            <nav style={{ position: 'relative', zIndex: 10, padding: '2rem 7rem 2rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ width: '40px', height: '40px' }}>
                    <img src="/Di.png" alt="DyeInk" className="logo-adaptive" style={{ height: '100%', width: '100%', objectFit: 'contain' }} />
                </div>
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', marginTop: '-8px' }}>
                    <NeumorphismButton to="/login" text="Sign In" icon={null} />
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
                    <NeumorphismButton to="/blog" text="Read the blog" icon={null} onPrefetch={prefetchBlog} />
                </div>
            </main>

            <section style={{ position: 'relative', zIndex: 10, maxWidth: '1000px', margin: '0 auto', padding: '4rem 2rem 8rem 2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', justifyItems: 'center' }}>
                <PixelCard variant="pink" className="feature-card-override">
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', zIndex: 20 }}>
                        <div style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}><PenTool size={32} /></div>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Rich Editor</h3>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>A powerful, distraction-free editor that supports what matters, your words.</p>
                    </div>
                </PixelCard>
                <PixelCard variant="pink" className="feature-card-override">
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', zIndex: 20 }}>
                        <div style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}><Layout size={32} /></div>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Clean Aesthetic</h3>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>Your blog looks consistently beautiful on every device, automatically.</p>
                    </div>
                </PixelCard>
                <PixelCard variant="pink" className="feature-card-override">
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
                @media (max-width: 768px) {
                    .landing-theme-toggle {
                        top: 1rem !important;
                        right: 1rem !important;
                    }
                    .landing-page > nav {
                        padding: 1rem 4.75rem 0.75rem 1rem !important;
                    }
                    .landing-page > nav > div:first-child {
                        width: 32px !important;
                        height: 32px !important;
                    }
                    .landing-page > nav > div:last-child {
                        margin-top: 0 !important;
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
