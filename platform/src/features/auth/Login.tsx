import { useState, FormEvent, useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { Lock, Loader2 } from 'lucide-react'
import Dither from '@/components/common/animations/Dither'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/common/feedback/Toast'
import { useAuthStore } from '@/stores/authStore'

export default function Login() {
    const navigate = useNavigate()
    const { addToast } = useToast()
    const { isAuthenticated, isLoading, hasChecked, needsSetup, initialize, login } = useAuthStore()
    const [password, setPassword] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [showRecovery, setShowRecovery] = useState(false)

    useEffect(() => {
        if (!hasChecked && !isLoading) {
            initialize()
        }
    }, [hasChecked, initialize, isLoading])

    useEffect(() => {
        if (isAuthenticated && !isLoading) navigate('/admin')
    }, [isAuthenticated, isLoading, navigate])

    if (needsSetup) return <Navigate to="/setup" replace />

    if (!hasChecked || isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!password) return
        setSubmitting(true)
        try {
            await login(password)
            navigate('/admin')
        } catch (err: any) {
            const status = err?.response?.status
            const msg =
                status === 429
                    ? 'Too many attempts. Try again in 15 minutes.'
                    : status === 401
                      ? 'Incorrect password'
                      : err?.response?.data?.error || 'Login failed'
            addToast({ type: 'error', message: msg })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="relative flex min-h-svh items-center justify-center overflow-hidden px-4 py-8 sm:p-8">
            <div className="pointer-events-none fixed inset-0 z-0 opacity-70">
                <Dither
                    waveColor={[0.5, 0.5, 0.5]}
                    disableAnimation={false}
                    enableMouseInteraction
                    mouseRadius={0.3}
                    colorNum={4}
                    pixelSize={2}
                    waveAmplitude={0.3}
                    waveFrequency={3}
                    waveSpeed={0.05}
                />
            </div>
            <div className="pointer-events-none fixed inset-0 z-[1] bg-[radial-gradient(circle_at_50%_44%,transparent_0%,color-mix(in_srgb,var(--background)_48%,transparent)_58%,var(--background)_100%)]" />
            <div className="pointer-events-none fixed inset-0 z-[2] bg-background/20 backdrop-blur-[1px]" />

            <Card className="relative z-10 w-full max-w-sm animate-fade-in border-border/70 bg-card/88 shadow-2xl shadow-black/10 backdrop-blur-xl">
                <CardContent className="p-6 sm:p-10">
                    <div className="mb-8 text-center">
                        <img
                            src="/Di.png"
                            alt="Logo"
                            className="logo-adaptive mx-auto h-14 w-auto"
                            width="60"
                            height="60"
                        />
                        <h2 className="mt-4 text-2xl font-bold">Welcome Back</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Enter your password to continue.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                autoFocus
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••••••"
                                className="h-11"
                            />
                        </div>
                        <Button type="submit" disabled={submitting} className="h-11 w-full text-sm font-semibold">
                            {submitting ? <Spinner size={18} /> : <Lock className="h-4 w-4" />}
                            {submitting ? 'Signing in…' : 'Sign In'}
                        </Button>
                    </form>

                    <div className="mt-6 border-t border-border/60 pt-4">
                        <button
                            type="button"
                            onClick={() => setShowRecovery((open) => !open)}
                            className="mx-auto block text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                        >
                            Forgot your password?
                        </button>
                        {showRecovery && (
                            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                                Only a one-way hash of your password is stored, so there is no reset
                                email. From your DyeInk checkout, sign in with{' '}
                                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                                    npx wrangler login
                                </code>{' '}
                                and run{' '}
                                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                                    npm run admin:reset-password
                                </code>
                                .
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
