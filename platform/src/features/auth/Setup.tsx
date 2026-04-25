import { FormEvent, useState, useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { Sparkles, Loader2 } from 'lucide-react'
import LightRays from '@/components/common/animations/LightRays'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/common/feedback/Toast'
import { useAuthStore } from '@/stores/authStore'

const RULES: { test: (s: string) => boolean; label: string }[] = [
    { test: (s) => s.length >= 12, label: 'At least 12 characters' },
    { test: (s) => /[a-z]/.test(s), label: 'A lowercase letter' },
    { test: (s) => /[A-Z]/.test(s), label: 'An uppercase letter' },
    { test: (s) => /[0-9]/.test(s), label: 'A number' },
    { test: (s) => /[^A-Za-z0-9]/.test(s), label: 'A symbol (!@#$%…)' },
]

export default function Setup() {
    const navigate = useNavigate()
    const { addToast } = useToast()
    const { needsSetup, isAuthenticated, isLoading, hasChecked, initialize, setup } = useAuthStore()
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (!hasChecked && !isLoading) {
            initialize()
        }
    }, [hasChecked, initialize, isLoading])

    useEffect(() => {
        if (isAuthenticated && !isLoading) navigate('/admin')
    }, [isAuthenticated, isLoading, navigate])

    if (hasChecked && !isLoading && !needsSetup && !isAuthenticated) return <Navigate to="/login" replace />
    if (!hasChecked || isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    const passes = RULES.every((r) => r.test(password)) && password === confirm

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!passes) return
        setSubmitting(true)
        try {
            await setup(password)
            navigate('/admin')
        } catch (err: any) {
            addToast({
                type: 'error',
                message: err?.response?.data?.error || 'Setup failed',
            })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-8">
            <div className="pointer-events-none absolute inset-0 z-0">
                <LightRays
                    raysOrigin="top-center"
                    raysColor="#00ffff"
                    raysSpeed={2.0}
                    lightSpread={5.0}
                    rayLength={10.0}
                    followMouse
                    mouseInfluence={0.2}
                    noiseAmount={0.1}
                    distortion={0.1}
                />
            </div>

            <Card className="relative z-10 w-full max-w-md animate-fade-in">
                <CardContent className="p-8 sm:p-10">
                    <div className="mb-6 text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Sparkles className="h-6 w-6" />
                        </div>
                        <h2 className="text-2xl font-bold">Welcome to DyeInk</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Pick an admin password to get started. You can change it later in Settings.
                        </p>
                    </div>

                    <Alert className="mb-6">
                        <AlertDescription className="text-xs">
                            This is the only credential for your blog. Store it in a password manager — there is no
                            recovery link.
                        </AlertDescription>
                    </Alert>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                required
                                autoFocus
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="h-11"
                                placeholder="At least 12 characters"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="confirm">Confirm password</Label>
                            <Input
                                id="confirm"
                                type="password"
                                required
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                className="h-11"
                            />
                        </div>

                        <ul className="space-y-1 text-xs">
                            {RULES.map((r) => (
                                <li
                                    key={r.label}
                                    className={
                                        r.test(password)
                                            ? 'text-emerald-500'
                                            : 'text-muted-foreground'
                                    }
                                >
                                    {r.test(password) ? '✓' : '·'} {r.label}
                                </li>
                            ))}
                            <li
                                className={
                                    confirm && password === confirm
                                        ? 'text-emerald-500'
                                        : 'text-muted-foreground'
                                }
                            >
                                {confirm && password === confirm ? '✓' : '·'} Passwords match
                            </li>
                        </ul>

                        <Button
                            type="submit"
                            disabled={!passes || submitting}
                            className="h-11 w-full text-sm font-semibold"
                        >
                            {submitting && <Spinner size={18} />}
                            {submitting ? 'Setting up…' : 'Create my blog'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
