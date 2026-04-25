import { useState, FormEvent, useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { Lock, Loader2 } from 'lucide-react'
import LightRays from '@/components/common/animations/LightRays'
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

            <Card className="relative z-10 w-full max-w-sm animate-fade-in">
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
                </CardContent>
            </Card>
        </div>
    )
}
