import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, CheckCircle } from 'lucide-react'
import WaveLoader from '../feedback/WaveLoader'
import { useToast } from '../feedback/Toast'
interface SubscribeModalProps {
    isOpen: boolean
    onClose: () => void
    blogId?: string | number | null
}
export default function SubscribeModal({ isOpen, onClose, blogId }: SubscribeModalProps) {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const { addToast } = useToast()
    if (!isOpen) return null
    const handleSubscribe = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || '/api'}/subscribers/subscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, blogId })
            })

            const data = await response.json()

            if (!response.ok && data.error !== 'Already subscribed') {
                throw new Error(data.error || 'Subscription failed')
            }

            setSuccess(true)
            addToast({ type: 'success', message: 'Successfully subscribed!', duration: 3000 })
            setTimeout(() => {
                onClose()
                setSuccess(false)
                setEmail('')
            }, 2000)
        } catch (error: any) {
            console.error('Subscription error:', error)
            addToast({ type: 'error', message: error.message || 'Something went wrong.', duration: 3000 })
        } finally {
            setLoading(false)
        }
    }
    return createPortal(
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(12px)',
            animation: 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '420px',
                padding: '2.5rem 2rem',
                backgroundColor: 'var(--bg-elevated)',
                borderRadius: '28px',
                border: '1px solid var(--border-color)',
                boxShadow: '0 0 50px rgba(0, 0, 0, 0.4), inset 0 0 0 1px rgba(255,255,255,0.05)',
                position: 'relative',
                margin: '1rem',
                transform: 'translateY(0)',
                animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        background: 'rgba(255,255,255,0.05)',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                        e.currentTarget.style.color = 'var(--text-primary)'
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                        e.currentTarget.style.color = 'var(--text-secondary)'
                    }}
                >
                    <X size={16} />
                </button>
                {success ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                        <div style={{
                            display: 'inline-flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            width: '70px',
                            height: '70px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.05))',
                            color: '#22c55e',
                            marginBottom: '1.25rem',
                            boxShadow: '0 0 25px rgba(34, 197, 94, 0.2)'
                        }}>
                            <CheckCircle size={36} />
                        </div>
                        <h3 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem 0', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                            You're in.
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Welcome to the inner circle.</p>
                    </div>
                ) : (
                    <>
                        <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
                            <h3 style={{
                                fontSize: '1.8rem',
                                fontWeight: 800,
                                margin: '0 0 0.75rem 0',
                                fontFamily: 'var(--font-display)',
                                letterSpacing: '-0.03em',
                                background: 'linear-gradient(to bottom right, var(--text-primary) 0%, var(--text-secondary) 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                lineHeight: 1.1
                            }}>
                                Stay in the loop
                            </h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, maxWidth: '95%', margin: '0 auto' }}>
                                Receive clarity and silence directly to your inbox. <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>No spam, ever.</span>
                            </p>
                        </div>
                        <form onSubmit={handleSubscribe}>
                            <div style={{ position: 'relative', width: '100%' }}>
                                <input
                                    type="email"
                                    placeholder="your@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    style={{
                                        width: '100%',
                                        height: '48px',
                                        padding: '0 130px 0 1.25rem',
                                        borderRadius: '9999px',
                                        border: '1px solid var(--border-color)',
                                        background: 'var(--bg-tertiary)',
                                        color: 'var(--text-primary)',
                                        fontSize: '0.95rem',
                                        outline: 'none',
                                        transition: 'all 0.3s ease',
                                        boxSizing: 'border-box'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = 'var(--text-primary)'
                                        e.target.style.background = 'var(--bg-primary)'
                                        e.target.style.boxShadow = '0 0 0 4px rgba(255,255,255,0.05)'
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = 'var(--border-color)'
                                        e.target.style.background = 'var(--bg-tertiary)'
                                        e.target.style.boxShadow = 'none'
                                    }}
                                />
                                <button
                                    type="submit"
                                    disabled={loading}
                                    style={{
                                        position: 'absolute',
                                        right: '4px',
                                        top: '4px',
                                        bottom: '4px',
                                        padding: '0 1.5rem',
                                        borderRadius: '9999px',
                                        background: 'var(--text-primary)',
                                        color: 'var(--bg-primary)',
                                        border: 'none',
                                        fontSize: '0.9rem',
                                        fontWeight: 700,
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        opacity: loading ? 0.8 : 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'transform 0.2s, background 0.2s',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                    }}
                                    onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'scale(1.02)')}
                                    onMouseLeave={(e) => !loading && (e.currentTarget.style.transform = 'scale(1)')}
                                >
                                    {loading ? <WaveLoader size={18} color="var(--bg-primary)" /> : 'Subscribe'}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>,
        document.body
    )
}
