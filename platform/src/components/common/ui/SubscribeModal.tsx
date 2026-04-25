import { useState } from 'react'
import { CheckCircle } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
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

    const handleSubscribe = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_BASE_URL || '/api'}/subscribe`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, blogId }),
                },
            )

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
            addToast({ type: 'error', message: error.message || 'Something went wrong.' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                {success ? (
                    <div className="flex flex-col items-center gap-3 py-6 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500 shadow-[0_0_25px_rgba(34,197,94,0.2)]">
                            <CheckCircle className="h-8 w-8" />
                        </div>
                        <h3 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
                            You're in.
                        </h3>
                        <p className="text-sm text-muted-foreground">Welcome to the inner circle.</p>
                    </div>
                ) : (
                    <>
                        <DialogHeader className="text-center sm:text-center">
                            <DialogTitle className="font-display text-2xl font-extrabold tracking-tight">
                                Stay in the loop
                            </DialogTitle>
                            <DialogDescription className="text-sm">
                                Receive clarity and silence directly to your inbox.{' '}
                                <span className="font-medium text-foreground">No spam, ever.</span>
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSubscribe} className="relative mt-2">
                            <Input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your@email.com"
                                className="h-12 rounded-full pr-32 text-sm"
                            />
                            <Button
                                type="submit"
                                disabled={loading}
                                className="absolute right-1 top-1 h-10 rounded-full px-5 text-sm font-bold"
                            >
                                {loading ? <Spinner size={16} /> : 'Subscribe'}
                            </Button>
                        </form>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
