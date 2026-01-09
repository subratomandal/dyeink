import { useState, FormEvent, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import LightRays from '../../components/common/animations/LightRays'
import NeumorphismButton from '../../components/common/ui/NeumorphismButton'
import GlareHover from '../../components/common/ui/GlareHover'
import { Mail, CheckCircle2, Github } from 'lucide-react'
import WaveLoader from '../../components/common/feedback/WaveLoader'
import { useToast } from '../../components/common/feedback/Toast'
import { useAuthStore } from '../../stores/authStore'
import auth0Client, { resetPassword } from '../../lib/auth0'

export default function Login() {
    const navigate = useNavigate()
    const { addToast } = useToast()
    const { isAuthenticated, isLoading: authLoading, login } = useAuthStore()
    const [loading, setLoading] = useState(false)
    const [showForgotModal, setShowForgotModal] = useState(false)
    const [forgotEmail, setForgotEmail] = useState('')
    const [forgotLoading, setForgotLoading] = useState(false)
    const [forgotSuccess, setForgotSuccess] = useState(false)

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

    const handleEmailLogin = async (e: FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            await login()
        } catch (error: any) {
            console.error('Login failed:', error)
            addToast({
                type: 'error',
                message: 'Login failed. Please try again.'
            })
            setLoading(false)
        }
    }

    const handleForgotPassword = async (e: FormEvent) => {
        e.preventDefault()
        setForgotLoading(true)
        try {
            await resetPassword(forgotEmail)
            setForgotSuccess(true)
        } catch (error: any) {
            console.error('Forgot password error:', error)
            addToast({
                type: 'error',
                message: error.message || 'Failed to send password reset email'
            })
        } finally {
            setForgotLoading(false)
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
        <div className="login-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', position: 'relative', overflow: 'hidden' }}>
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
                borderRadius="16px"
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
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Welcome Back</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Sign in to continue to your dashboard</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <NeumorphismButton
                        text={loading ? 'Signing in...' : 'Sign In with Email'}
                        type="button"
                        onClick={handleEmailLogin}
                        style={{ width: '100%', justifyContent: 'center', fontSize: '1rem', fontWeight: 600 }}
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

                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                    <button
                        type="button"
                        onClick={() => setShowForgotModal(true)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            textDecoration: 'underline'
                        }}
                    >
                        Forgot password?
                    </button>
                </div>

                <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Don't have an account? <Link to="/register" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Create one</Link>
                </p>
            </GlareHover>

            {showForgotModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '1rem'
                }}>
                    <div style={{
                        width: '100%',
                        maxWidth: '400px',
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '16px',
                        padding: '2rem',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        animation: 'fadeIn 0.2s ease-out'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Reset Password</h2>
                            <button
                                onClick={() => {
                                    setShowForgotModal(false)
                                    setForgotSuccess(false)
                                    setForgotEmail('')
                                }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '1.25rem' }}
                            >
                                ✕
                            </button>
                        </div>
                        {forgotSuccess ? (
                            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                                <div style={{ color: '#22c55e', marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                                    <CheckCircle2 size={48} />
                                </div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Check your email</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                                    We've sent a password reset link to <strong>{forgotEmail}</strong>.<br />
                                    Click it to reset your password.
                                </p>
                                <button
                                    onClick={() => {
                                        setShowForgotModal(false)
                                        setForgotSuccess(false)
                                        setForgotEmail('')
                                    }}
                                    className="btn btn-secondary"
                                    style={{ marginTop: '1.5rem', width: '100%' }}
                                >
                                    Close
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
                                    Enter your email address to receive a password reset link.
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label className="form-label">Email Address</label>
                                    <input
                                        type="email"
                                        required
                                        value={forgotEmail}
                                        onChange={(e) => setForgotEmail(e.target.value)}
                                        placeholder="name@example.com"
                                        autoFocus
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={forgotLoading}
                                    className="btn btn-primary"
                                    style={{ width: '100%' }}
                                >
                                    {forgotLoading ? <WaveLoader size={24} /> : 'Send Reset Link'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
            <style>{`
                @media (max-width: 499px) {
                    .login-container {
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
                        transform: scale(0.95);
                        width: 100% !important;
                        max-width: 320px !important;
                        padding: 1.5rem !important;
                    }
                    .form-label {
                        font-size: 0.85rem !important;
                        margin-bottom: 0.25rem !important;
                    }
                    input {
                        height: 42px !important;
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
