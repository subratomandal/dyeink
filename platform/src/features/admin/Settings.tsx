import { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useAdminStore } from '@/stores/adminStore'
import { settingsService } from '@/services/settingsService'
import { postService } from '@/services/postService'
import { useToast } from '@/components/common/feedback/Toast'
import SettingsSkeleton from '@/components/admin/skeletons/SettingsSkeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export default function Settings() {
    const { settings, fetchSettings, settingsLoading, updateSettingsInCache } = useAdminStore()
    const { addToast } = useToast()

    const [saving, setSaving] = useState(false)
    const [activeTab, setActiveTab] = useState('basics')

    const [siteName, setSiteName] = useState('')
    const [newsletterEnabled, setNewsletterEnabled] = useState(false)
    const [twitterLink, setTwitterLink] = useState('')
    const [linkedinLink, setLinkedinLink] = useState('')
    const [githubLink, setGithubLink] = useState('')
    const [websiteLink, setWebsiteLink] = useState('')
    const [dribbbleLink, setDribbbleLink] = useState('')
    const [huggingfaceLink, setHuggingfaceLink] = useState('')
    const [leetcodeLink, setLeetcodeLink] = useState('')
    const [customDomain, setCustomDomain] = useState('')
    const [domainStatus, setDomainStatus] = useState<
        'pending' | 'verified' | 'active' | 'failed' | null
    >(null)
    const [domainMessage, setDomainMessage] = useState('')
    const [domainInstructions, setDomainInstructions] = useState<string[]>([])
    const [domainConnecting, setDomainConnecting] = useState(false)
    const [domainDisconnecting, setDomainDisconnecting] = useState(false)

    // Change-password state
    const [currentPw, setCurrentPw] = useState('')
    const [nextPw, setNextPw] = useState('')
    const [confirmPw, setConfirmPw] = useState('')
    const [pwSaving, setPwSaving] = useState(false)

    // Danger-zone state
    const [showDeletePosts, setShowDeletePosts] = useState(false)
    const [deleteConfirmation, setDeleteConfirmation] = useState('')
    const [isDeleting, setIsDeleting] = useState(false)

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const tabParam = params.get('tab')
        if (tabParam && ['basics', 'security', 'danger'].includes(tabParam.toLowerCase())) {
            setActiveTab(tabParam.toLowerCase())
        }
        fetchSettings()
    }, [fetchSettings])

    useEffect(() => {
        if (!settings) return
        setSiteName(settings.siteName || '')
        setNewsletterEnabled(!!settings.newsletterEnabled)
        setTwitterLink(settings.twitterLink || '')
        setLinkedinLink(settings.linkedinLink || '')
        setGithubLink(settings.githubLink || '')
        setWebsiteLink(settings.websiteLink || '')
        setDribbbleLink(settings.dribbbleLink || '')
        setHuggingfaceLink(settings.huggingfaceLink || '')
        setLeetcodeLink(settings.leetcodeLink || '')
        setCustomDomain(settings.customDomain || '')
        setDomainStatus(settings.domainStatus || null)
    }, [settings])

    const handleSave = async () => {
        setSaving(true)
        try {
            const updated = await settingsService.saveSettings({
                siteName,
                siteDescription: '',
                newsletterEnabled,
                twitterLink: twitterLink || null,
                linkedinLink: linkedinLink || null,
                githubLink: githubLink || null,
                websiteLink: websiteLink || null,
                dribbbleLink: dribbbleLink || null,
                huggingfaceLink: huggingfaceLink || null,
                leetcodeLink: leetcodeLink || null,
            })
            if (updated) {
                updateSettingsInCache(updated)
                await fetchSettings(true)
                addToast({ type: 'success', message: 'Settings saved successfully' })
            }
        } catch (err: any) {
            addToast({
                type: 'error',
                message: err?.response?.data?.error || `Failed to save: ${err.message || 'Unknown error'}`,
            })
        } finally {
            setSaving(false)
        }
    }

    const handleVerifyDomain = async () => {
        if (!customDomain.trim()) {
            addToast({ type: 'error', message: 'Enter a domain first.' })
            return
        }

        setDomainConnecting(true)
        setDomainMessage('')
        setDomainInstructions([])
        try {
            const result = await settingsService.verifyDomain(customDomain)
            if (!result.success) {
                setDomainMessage(result.error || 'Failed to connect domain')
                setDomainInstructions(result.instructions?.steps || [])
                setDomainStatus(result.status || 'failed')
                addToast({ type: 'error', message: result.error || 'Failed to connect domain' })
                return
            }

            const nextStatus = result.status || (result.verified ? 'verified' : 'pending')
            setDomainStatus(nextStatus)
            setCustomDomain(result.hostname || customDomain)
            setDomainMessage(result.message || 'Domain connected.')
            if (result.settings) {
                updateSettingsInCache(result.settings)
            }
            await fetchSettings(true)
            addToast({
                type: 'success',
                message: result.message || 'Domain connected! SSL is being issued. This can take 5–20 minutes.',
            })
        } catch (err: any) {
            setDomainStatus('failed')
            setDomainMessage(err?.response?.data?.error || err.message || 'Failed to connect domain')
            addToast({
                type: 'error',
                message: err?.response?.data?.error || err.message || 'Failed to connect domain',
            })
        } finally {
            setDomainConnecting(false)
        }
    }

    const handleDisconnectDomain = async () => {
        setDomainDisconnecting(true)
        setDomainMessage('')
        setDomainInstructions([])
        try {
            const result = await settingsService.disconnectDomain()
            setCustomDomain('')
            setDomainStatus(null)
            if (result.settings) {
                updateSettingsInCache(result.settings)
            }
            await fetchSettings(true)
            addToast({ type: 'success', message: 'Custom domain disconnected.' })
        } catch (err: any) {
            addToast({
                type: 'error',
                message: err?.response?.data?.error || err.message || 'Failed to disconnect domain',
            })
        } finally {
            setDomainDisconnecting(false)
        }
    }

    const domainStatusLabel =
        domainStatus === 'verified'
            ? 'Connected'
            : domainStatus === 'active'
              ? 'Active'
              : domainStatus === 'pending'
                ? 'Pending'
                : domainStatus === 'failed'
                  ? 'Failed'
                  : 'Not connected'

    const handleChangePassword = async () => {
        if (nextPw !== confirmPw) {
            addToast({ type: 'error', message: 'New passwords do not match.' })
            return
        }
        setPwSaving(true)
        try {
            await settingsService.changePassword(currentPw, nextPw)
            setCurrentPw('')
            setNextPw('')
            setConfirmPw('')
            addToast({
                type: 'success',
                message: 'Password updated. Other devices have been logged out.',
            })
        } catch (err: any) {
            addToast({
                type: 'error',
                message: err?.response?.data?.error || 'Failed to change password',
            })
        } finally {
            setPwSaving(false)
        }
    }

    const handleDeleteAllPosts = async () => {
        setIsDeleting(true)
        try {
            await postService.deleteAllPosts()
            await useAdminStore.getState().fetchPosts(true)
            addToast({ type: 'success', message: 'All posts deleted.' })
            setShowDeletePosts(false)
            setDeleteConfirmation('')
        } catch (err: any) {
            addToast({ type: 'error', message: err.message || 'Failed to delete posts.' })
        } finally {
            setIsDeleting(false)
        }
    }

    if (settingsLoading && !settings) return <SettingsSkeleton />

    return (
        <div className="settings-page pb-16 text-foreground">
            <div className="mb-8 flex items-center justify-between">
                <h1 className="m-0 font-heading text-[2rem] font-semibold leading-tight sm:text-4xl">Settings</h1>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-3xl">
                <TabsList className="settings-tabs mb-6 w-full sm:w-auto">
                    <TabsTrigger value="basics">Basics</TabsTrigger>
                    <TabsTrigger value="security">Security</TabsTrigger>
                    <TabsTrigger value="danger" className="data-[state=active]:text-red-500">
                        Danger Zone
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="basics" className="space-y-10">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="site-name" className="text-base font-semibold">
                                Site name
                            </Label>
                            <Input
                                id="site-name"
                                value={siteName}
                                onChange={(e) => setSiteName(e.target.value)}
                                className="h-11"
                            />
                        </div>

                    </div>

                    <div className="space-y-3">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h3 className="text-base font-semibold">Newsletter</h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Allow visitors to subscribe to email updates.
                                </p>
                            </div>
                            <Switch
                                checked={newsletterEnabled}
                                onCheckedChange={setNewsletterEnabled}
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <h3 className="text-base font-semibold">Custom domain</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Connect a Cloudflare-managed domain to this blog.
                            </p>
                        </div>
                        <div className="rounded-xl border border-border bg-card/60 p-4">
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <Input
                                    id="custom-domain"
                                    placeholder="blog.example.com"
                                    value={customDomain}
                                    onChange={(e) => {
                                        const nextDomain = e.target.value
                                        setCustomDomain(nextDomain)
                                        setDomainStatus(
                                            nextDomain.trim() === (settings?.customDomain || '')
                                                ? settings?.domainStatus || null
                                                : null,
                                        )
                                        setDomainMessage('')
                                        setDomainInstructions([])
                                    }}
                                    className="h-11 sm:flex-1"
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                    spellCheck={false}
                                />
                                <Button
                                    type="button"
                                    onClick={handleVerifyDomain}
                                    disabled={domainConnecting || !customDomain.trim()}
                                    className="w-full sm:w-auto"
                                >
                                    {domainConnecting && <Spinner size={16} />}
                                    {domainConnecting ? 'Connecting…' : 'Connect domain'}
                                </Button>
                            </div>

                            <div className="mt-3 flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <span className="font-medium text-foreground">{domainStatusLabel}</span>
                                    {customDomain && (
                                        <span className="ml-2 font-mono text-xs text-muted-foreground">
                                            {customDomain}
                                        </span>
                                    )}
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Cloudflare creates the DNS record and SSL certificate when the zone is in your
                                        account.
                                    </p>
                                </div>
                                {settings?.customDomain && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleDisconnectDomain}
                                        disabled={domainDisconnecting}
                                        className="w-full sm:w-auto"
                                    >
                                        {domainDisconnecting && <Spinner size={16} />}
                                        {domainDisconnecting ? 'Disconnecting…' : 'Disconnect'}
                                    </Button>
                                )}
                            </div>

                            {domainMessage && (
                                <p
                                    className={`mt-3 rounded-lg px-3 py-2 text-sm ${
                                        domainStatus === 'failed'
                                            ? 'bg-red-500/10 text-red-500'
                                            : 'bg-muted text-muted-foreground'
                                    }`}
                                >
                                    {domainMessage}
                                </p>
                            )}

                            {domainInstructions.length > 0 && (
                                <div className="mt-3 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                                    {domainInstructions.map((step, index) => (
                                        <p key={step} className={index === 0 ? 'm-0' : 'mb-0 mt-2'}>
                                            {index + 1}. {step}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <h3 className="text-base font-semibold">Social Links</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Display links on your blog sidebar.
                            </p>
                        </div>
                        <div className="grid gap-3">
                            <Input
                                placeholder="Twitter / X Link"
                                value={twitterLink}
                                onChange={(e) => setTwitterLink(e.target.value)}
                            />
                            <Input
                                placeholder="LinkedIn Profile"
                                value={linkedinLink}
                                onChange={(e) => setLinkedinLink(e.target.value)}
                            />
                            <Input
                                placeholder="GitHub Profile"
                                value={githubLink}
                                onChange={(e) => setGithubLink(e.target.value)}
                            />
                            <Input
                                placeholder="Website / Portfolio"
                                value={websiteLink}
                                onChange={(e) => setWebsiteLink(e.target.value)}
                            />
                            <Input
                                placeholder="Dribbble Profile"
                                value={dribbbleLink}
                                onChange={(e) => setDribbbleLink(e.target.value)}
                            />
                            <Input
                                placeholder="Hugging Face Profile"
                                value={huggingfaceLink}
                                onChange={(e) => setHuggingfaceLink(e.target.value)}
                            />
                            <Input
                                placeholder="LeetCode Profile"
                                value={leetcodeLink}
                                onChange={(e) => setLeetcodeLink(e.target.value)}
                            />
                        </div>
                    </div>

                    <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
                        {saving && <Spinner size={16} />}
                        {saving ? 'Saving…' : 'Save'}
                    </Button>
                </TabsContent>

                <TabsContent value="security" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Change password</CardTitle>
                            <CardDescription>
                                Updating your password signs out every other session immediately.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="current-pw">Current password</Label>
                                <Input
                                    id="current-pw"
                                    type="password"
                                    autoComplete="current-password"
                                    value={currentPw}
                                    onChange={(e) => setCurrentPw(e.target.value)}
                                    className="h-11"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="next-pw">New password</Label>
                                <Input
                                    id="next-pw"
                                    type="password"
                                    autoComplete="new-password"
                                    value={nextPw}
                                    onChange={(e) => setNextPw(e.target.value)}
                                    className="h-11"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Min 12 chars including upper, lower, number, and a special character.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirm-pw">Confirm new password</Label>
                                <Input
                                    id="confirm-pw"
                                    type="password"
                                    autoComplete="new-password"
                                    value={confirmPw}
                                    onChange={(e) => setConfirmPw(e.target.value)}
                                    className="h-11"
                                />
                            </div>
                            <Button
                                onClick={handleChangePassword}
                                disabled={pwSaving || !currentPw || !nextPw || nextPw !== confirmPw}
                                className="w-full sm:w-auto"
                            >
                                {pwSaving && <Spinner size={16} />}
                                {pwSaving ? 'Updating…' : 'Update password'}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="danger" className="space-y-6">
                    <Card className="border-red-500/20">
                        <CardHeader>
                            <CardTitle className="text-base">Delete all posts</CardTitle>
                            <CardDescription>
                                Permanently delete every post on this blog. This cannot be undone.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button
                                variant="outline"
                                className="w-full border-red-500 text-red-500 hover:bg-red-500 hover:text-white sm:w-auto"
                                onClick={() => {
                                    setShowDeletePosts(true)
                                    setDeleteConfirmation('')
                                }}
                            >
                                Delete all posts
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <AlertDialog
                open={showDeletePosts}
                onOpenChange={(open) => {
                    if (!open) {
                        setShowDeletePosts(false)
                        setDeleteConfirmation('')
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <div className="flex items-center gap-3 text-red-500">
                            <AlertTriangle className="h-8 w-8" />
                            <AlertDialogTitle>Delete every post?</AlertDialogTitle>
                        </div>
                        <AlertDialogDescription>
                            This sends every post and its stats to the void. There is no undo.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-2">
                        <Label htmlFor="delete-confirm">
                            Type{' '}
                            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                                I consent of delete
                            </span>{' '}
                            to confirm:
                        </Label>
                        <Input
                            id="delete-confirm"
                            value={deleteConfirmation}
                            onChange={(e) => setDeleteConfirmation(e.target.value)}
                            placeholder="I consent of delete"
                            className="h-11"
                        />
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={deleteConfirmation !== 'I consent of delete' || isDeleting}
                            onClick={(e) => {
                                e.preventDefault()
                                handleDeleteAllPosts()
                            }}
                            className="bg-red-500 text-white hover:bg-red-600 disabled:bg-muted disabled:text-muted-foreground"
                        >
                            {isDeleting && <Spinner size={16} />}
                            {isDeleting ? 'Deleting…' : 'Delete posts'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <style>{`
                @media (max-width: 640px) {
                    .settings-page {
                        padding-bottom: 2rem !important;
                    }
                    .settings-tabs {
                        height: auto !important;
                        gap: 0.25rem;
                        padding: 0.25rem !important;
                    }
                    .settings-tabs button {
                        min-height: 40px;
                        flex: 1 1 0;
                        padding-left: 0.65rem !important;
                        padding-right: 0.65rem !important;
                        font-size: 0.82rem !important;
                    }
                    .settings-page [data-slot="card"],
                    .settings-page .rounded-xl.border {
                        border-radius: 1rem !important;
                    }
                }
            `}</style>
        </div>
    )
}
