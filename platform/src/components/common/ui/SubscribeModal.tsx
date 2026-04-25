import { useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle, X } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import apiClient from '@/lib/apiClient'
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

    useEffect(() => {
        if (!isOpen) return

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose()
        }

        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [isOpen, onClose])

    if (!isOpen) return null

    const handleSubscribe = async (e: FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            await apiClient.post('/subscribe', { email: email.trim(), blogId })
            setSuccess(true)
            addToast({ type: 'success', message: 'Successfully subscribed!', duration: 3000 })
            setTimeout(() => {
                onClose()
                setSuccess(false)
                setEmail('')
            }, 2000)
        } catch (error: any) {
            addToast({ type: 'error', message: error.message || 'Something went wrong.' })
        } finally {
            setLoading(false)
        }
    }

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-xl subscribe-modal-backdrop"
            onMouseDown={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="subscribe-modal-title"
                className="relative w-full max-w-[420px] rounded-[28px] border border-border bg-card px-8 py-10 shadow-[0_0_50px_rgba(0,0,0,0.4),inset_0_0_0_1px_rgba(255,255,255,0.05)] subscribe-modal-panel"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close subscribe modal"
                    className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-foreground/5 text-muted-foreground transition hover:bg-foreground/10 hover:text-foreground"
                >
                    <X className="h-4 w-4" />
                </button>

                {success ? (
                    <div className="flex flex-col items-center gap-3 py-6 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500 shadow-[0_0_25px_rgba(34,197,94,0.2)]">
                            <CheckCircle className="h-8 w-8" />
                        </div>
                        <h3
                            id="subscribe-modal-title"
                            className="font-display text-2xl font-extrabold tracking-tight text-foreground"
                        >
                            You're in.
                        </h3>
                        <p className="text-sm text-muted-foreground">Welcome to the inner circle.</p>
                    </div>
                ) : (
                    <>
                        <div className="mb-10 text-center">
                            <h3
                                id="subscribe-modal-title"
                                className="font-display text-[1.65rem] font-semibold leading-tight tracking-[-0.025em] text-foreground"
                            >
                                Stay in the loop
                            </h3>
                            <p className="mx-auto mt-3 max-w-[90%] text-[0.92rem] leading-relaxed text-muted-foreground">
                                Get new posts by email.{' '}
                                <span className="font-medium text-foreground">No spam.</span>
                            </p>
                        </div>

                        <form onSubmit={handleSubscribe}>
                            <div className="relative">
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    className="h-12 w-full rounded-full border border-border bg-muted px-5 pr-32 text-[0.95rem] text-foreground outline-none transition focus:border-foreground focus:bg-background focus:shadow-[0_0_0_4px_rgba(255,255,255,0.05)]"
                                />
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="absolute bottom-1 right-1 top-1 flex items-center justify-center rounded-full bg-foreground px-6 text-sm font-bold text-background shadow-sm transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-80"
                                >
                                    {loading ? <Spinner size={16} /> : 'Subscribe'}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
            <style>{`
                .subscribe-modal-backdrop {
                    animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .subscribe-modal-panel {
                    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @media (max-width: 420px) {
                    .subscribe-modal-panel {
                        padding-left: 1.25rem !important;
                        padding-right: 1.25rem !important;
                    }
                    .subscribe-modal-panel form .relative {
                        display: flex !important;
                        flex-direction: column !important;
                        gap: 0.75rem !important;
                    }
                    .subscribe-modal-panel form input {
                        padding-right: 1.25rem !important;
                    }
                    .subscribe-modal-panel form button {
                        position: static !important;
                        width: 100% !important;
                        min-height: 44px !important;
                    }
                }
            `}</style>
        </div>,
        document.body,
    )
}
