import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import LightRays from '../../components/common/animations/LightRays'
import NeumorphismButton from '../../components/common/ui/NeumorphismButton'
import GlareHover from '../../components/common/ui/GlareHover'
import { Github, Mail } from 'lucide-react'
import WaveLoader from '../../components/common/feedback/WaveLoader'
import { useToast } from '../../components/common/feedback/Toast'
import { useAuthStore } from '../../stores/authStore'

export default function Register() {
    const navigate = useNavigate()
    const { addToast } = useToast()
    const { isAuthenticated, isLoading: authLoading, signup, login } = useAuthStore()
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (isAuthenticated && !authLoading) {
            navigate('/admin')
        }
    }, [isAuthenticated, authLoading, navigate])

    const handleGithubLogin = async () => {
        try {
            setLoading(true)
            await login({ connection: 'github' })
        } catch (error: any) {
            console.error('GitHub login error:', error)
            addToast({
                type: 'error',
                message: error.message || 'Failed to login with GitHub'
            })
            setLoading(false)
        }
    }

    const handleSignup = async () => {
        setLoading(true)
        try {
            await signup()
        } catch (error: any) {
            console.error('Registration failed:', error)
            addToast({
                type: 'error',
                message: 'Registration failed. Please try again.'
            })
            setLoading(false)
        }
    }

    if (authLoading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <WaveLoader size={48} />
            </div>
        )
    }

    return (
        <div className="register-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', position: 'relative', overflow: 'hidden' }}>
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
            <GlareHover
                width="100%"
                height="auto"
                background="var(--bg-secondary)"
                borderColor="var(--border-color)"
                borderRadius="12px"
                glareColor="#ffffff"
                glareOpacity={0.15}
                style={{
                    maxWidth: '360px',
                    zIndex: 10,
                    display: 'block',
                    padding: '2.5rem'
                }}
                className="animate-fade-in"
            >
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', marginTop: '1.5rem' }}>
                        <Link to="/" className="logo-link">
                            <img src="/Di.png" alt="Logo" className="logo-adaptive" width="60" height="60" style={{ height: '60px', width: 'auto' }} />
                        </Link>
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Create Account</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Sign up to start your blogging journey</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <NeumorphismButton
                        text={loading ? 'Creating account...' : 'Sign Up with Email'}
                        type="button"
                        onClick={handleSignup}
                        style={{ width: '100%', height: '48px', justifyContent: 'center', fontSize: '1rem', fontWeight: 600 }}
                        icon={loading ? <WaveLoader size={24} /> : <Mail size={20} />}
                    />

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '0.5rem 0' }}>
                        <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>or</span>
                        <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
                    </div>

                    <button
                        onClick={handleGithubLogin}
                        type="button"
                        className="github-btn"
                        disabled={loading}
                    >
                        <Github size={20} />
                        Continue with GitHub
                    </button>
                </div>

                <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Already have an account? <Link to="/login" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Sign in</Link>
                </p>
            </GlareHover>

            <style>{`
                @media (max-width: 499px) {
                    .register-container {
                        height: 100vh !important;
                        overflow: hidden !important;
                        padding: 1rem !important;
                        align-items: center !important;
                        justify-content: center !important;
                    }
                    .logo-adaptive {
                         width: 50px !important;
                         height: 50px !important;
                    }
                    .animate-fade-in {
                        transform: scale(0.9);
                        width: 100% !important;
                        max-width: 320px !important;
                        padding: 1.25rem !important;
                    }
                    .form-label {
                        font-size: 0.8rem !important;
                        margin-bottom: 0.2rem !important;
                    }
                    input {
                        height: 40px !important;
                        font-size: 0.9rem !important;
                    }
                    form > div {
                        gap: 1rem !important;
                    }
                     .github-btn {
                        padding: 0.6rem !important;
                        font-size: 0.9rem !important;
                    }
                }
            `}</style>
        </div>
    )
}
