import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'

export default function ResetPassword() {
    const navigate = useNavigate()

    useEffect(() => {
        // Auth0 handles password reset through its own flow
        // This page just shows success and redirects to login
        const timer = setTimeout(() => {
            navigate('/login')
        }, 3000)
        return () => clearTimeout(timer)
    }, [navigate])

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
                boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)'
            }}>
                <div style={{
                    textAlign: 'center',
                    padding: '2rem 0',
                    animation: 'fadeIn 0.5s ease-out'
                }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        background: 'rgba(34, 197, 94, 0.1)',
                        color: '#22c55e',
                        marginBottom: '1rem'
                    }}>
                        <CheckCircle2 size={32} />
                    </div>
                    <h1 style={{
                        fontSize: '1.75rem',
                        fontWeight: 800,
                        margin: 0,
                        letterSpacing: '-0.02em',
                        background: 'linear-gradient(to right, var(--text-primary), var(--text-secondary))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        Password Reset
                    </h1>
                    <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Redirecting you to login...
                    </p>
                </div>
            </div>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    )
}
