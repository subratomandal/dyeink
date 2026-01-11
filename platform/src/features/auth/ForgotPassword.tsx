import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getAuth0Client } from '../../lib/auth0'
import { ArrowLeft } from 'lucide-react'
import WaveLoader from '../../components/common/feedback/WaveLoader'

export default function ForgotPassword() {
    useEffect(() => {
        // Redirect to Auth0's password reset flow
        const redirectToAuth0PasswordReset = async () => {
            try {
                const client = await getAuth0Client()
                // Use Auth0's authorization with screen_hint to show password reset
                await client.loginWithRedirect({
                    authorizationParams: {
                        screen_hint: 'signup',
                        prompt: 'login',
                    },
                    appState: { returnTo: '/admin' }
                })
            } catch (error) {
                console.error('Failed to redirect to Auth0:', error)
            }
        }

        // Small delay to show loading state
        const timer = setTimeout(redirectToAuth0PasswordReset, 1000)
        return () => clearTimeout(timer)
    }, [])

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)'
        }}>
            <div style={{
                position: 'absolute',
                inset: 0,
                zIndex: 0,
                background: 'radial-gradient(circle at 50% 50%, var(--bg-secondary) 0%, var(--bg-primary) 100%)',
                opacity: 0.5
            }} />
            <div style={{
                position: 'relative',
                zIndex: 1,
                width: '100%',
                maxWidth: '400px',
                padding: '2.5rem',
                borderRadius: '16px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-elevated)',
                boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)',
                textAlign: 'center'
            }}>
                <div style={{ marginBottom: '2rem' }}>
                    <Link to="/login" style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.9rem',
                        color: 'var(--text-secondary)',
                        textDecoration: 'none',
                        marginBottom: '1.5rem',
                        transition: 'color 0.2s'
                    }}>
                        <ArrowLeft size={16} /> Back to Login
                    </Link>
                    <h1 style={{
                        fontSize: '1.75rem',
                        fontWeight: 800,
                        margin: 0,
                        letterSpacing: '-0.02em',
                        background: 'linear-gradient(to right, var(--text-primary), var(--text-secondary))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        Reset Password
                    </h1>
                    <p style={{ marginTop: '1rem', color: 'var(--text-secondary)', lineHeight: 1.5, fontSize: '0.95rem' }}>
                        Redirecting you to the secure password reset page...
                    </p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0' }}>
                    <WaveLoader size={32} />
                </div>
            </div>
        </div>
    )
}
