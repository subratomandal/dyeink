import { useState, useEffect } from 'react'
import { AlertTriangle, Cloud, ExternalLink, Image, KeyRound } from 'lucide-react'
import { useAdminStore } from '@/stores/adminStore'
import { settingsService } from '@/services/settingsService'
import { postService } from '@/services/postService'
import { useToast } from '@/components/common/feedback/Toast'
import SettingsSkeleton from '@/components/admin/skeletons/SettingsSkeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
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
    const [siteDescription, setSiteDescription] = useState('')
    const [newsletterEnabled, setNewsletterEnabled] = useState(false)
    const [twitterLink, setTwitterLink] = useState('')
    const [linkedinLink, setLinkedinLink] = useState('')
    const [githubLink, setGithubLink] = useState('')
    const [websiteLink, setWebsiteLink] = useState('')
    const [dribbbleLink, setDribbbleLink] = useState('')
    const [huggingfaceLink, setHuggingfaceLink] = useState('')
    const [leetcodeLink, setLeetcodeLink] = useState('')

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
        if (tabParam) setActiveTab(tabParam.toLowerCase())
        fetchSettings()
    }, [fetchSettings])

    useEffect(() => {
        if (!settings) return
        setSiteName(settings.siteName || '')
        setSiteDescription(settings.siteDescription || '')
        setNewsletterEnabled(!!settings.newsletterEnabled)
        setTwitterLink(settings.twitterLink || '')
        setLinkedinLink(settings.linkedinLink || '')
        setGithubLink(settings.githubLink || '')
        setWebsiteLink(settings.websiteLink || '')
        setDribbbleLink(settings.dribbbleLink || '')
        setHuggingfaceLink(settings.huggingfaceLink || '')
        setLeetcodeLink(settings.leetcodeLink || '')
    }, [settings])

    const handleSave = async () => {
        setSaving(true)
        try {
            const updated = await settingsService.saveSettings({
                siteName,
                siteDescription,
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
        <div className="pb-16 text-foreground">
            <div className="mb-8 flex items-center justify-between">
                <h1 className="m-0 font-heading text-4xl font-semibold">Settings</h1>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-3xl">
                <TabsList className="mb-6">
                    <TabsTrigger value="basics">Basics</TabsTrigger>
                    <TabsTrigger value="deployment">Deployment</TabsTrigger>
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

                        <div className="space-y-2">
                            <Label htmlFor="site-description" className="text-base font-semibold">
                                Tagline
                            </Label>
                            <Textarea
                                id="site-description"
                                value={siteDescription}
                                onChange={(e) => setSiteDescription(e.target.value)}
                                rows={2}
                                placeholder="A one-line description of your blog"
                            />
                        </div>

                    </div>

                    <div className="space-y-3">
                        <div className="flex items-start justify-between gap-4">
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

                    <Button onClick={handleSave} disabled={saving}>
                        {saving && <Spinner size={16} />}
                        {saving ? 'Saving…' : 'Save'}
                    </Button>
                </TabsContent>

                <TabsContent value="deployment" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Cloud className="h-4 w-4" />
                                Live custom domain
                            </CardTitle>
                            <CardDescription>
                                Host the live site on Cloudflare Workers, then attach your domain to the Worker.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="rounded-lg border bg-card/60 p-4 text-sm text-muted-foreground">
                                Cloudflare supports Worker custom domains from the dashboard, Wrangler, and API for
                                domains in your Cloudflare account. The old in-app Vercel flow in Git used Vercel's
                                project-domain API; the Cloudflare equivalent for customer-owned domains is Cloudflare
                                for SaaS custom hostnames, which needs a separate SaaS-zone setup.
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <Button asChild>
                                    <a
                                        href="https://dash.cloudflare.com/?to=/:account/workers/services/view/dyeink/production/settings/domains"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Open domain setup
                                        <ExternalLink className="h-4 w-4" />
                                    </a>
                                </Button>
                                <Button variant="outline" asChild>
                                    <a
                                        href="https://developers.cloudflare.com/workers/configuration/routing/custom-domains/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Custom domain guide
                                    </a>
                                </Button>
                                <Button variant="outline" asChild>
                                    <a
                                        href="https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/domain-support/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        SaaS domain API
                                    </a>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Image className="h-4 w-4" />
                                Image and public-content domain
                            </CardTitle>
                            <CardDescription>
                                Use an R2 custom domain for uploads and generated public JSON artifacts.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="rounded-lg border bg-card/60 p-4 text-sm text-muted-foreground">
                                Attach a custom domain to the `dyeink-images` R2 bucket, then set `R2_PUBLIC_URL` for
                                uploaded images. If you serve generated public JSON directly from that domain, also set
                                `VITE_PUBLIC_CONTENT_URL` at build time.
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <Button variant="outline" asChild>
                                    <a
                                        href="https://dash.cloudflare.com/?to=/:account/r2/default/buckets/dyeink-images/settings"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Open R2 bucket
                                        <ExternalLink className="h-4 w-4" />
                                    </a>
                                </Button>
                                <Button variant="outline" asChild>
                                    <a
                                        href="https://developers.cloudflare.com/r2/buckets/public-buckets/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        R2 custom domain guide
                                    </a>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="security" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <KeyRound className="h-4 w-4" />
                                Change password
                            </CardTitle>
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
                                className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
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
        </div>
    )
}
