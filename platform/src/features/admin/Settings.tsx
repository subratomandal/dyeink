import React, { useState, useEffect } from 'react'
import { settingsService } from '../../services/settingsService'
import { useAuthStore } from '../../stores/authStore'
import apiClient from '../../lib/apiClient'
import { useAdminStore } from '../../stores/adminStore'
import { AlertTriangle, CheckCircle2, Globe } from 'lucide-react'
import SettingsSkeleton from '../../components/admin/skeletons/SettingsSkeleton'
import { useToast } from '../../components/common/feedback/Toast'
const Settings: React.FC = () => {
    const { settings, fetchSettings, settingsLoading, updateSettingsInCache } = useAdminStore()
    const [activeTab, setActiveTab] = useState('Basics')
    const [saving, setSaving] = useState(false)
    const [schemaError, setSchemaError] = useState<string | null>(null)
    const { addToast } = useToast()


    const [pubName, setPubName] = useState("")
    const [description, setDescription] = useState("")
    const [customDomain, setCustomDomain] = useState("")
    const [subdomain, setSubdomain] = useState("")
    const [twitterLink, setTwitterLink] = useState("")
    const [linkedinLink, setLinkedinLink] = useState("")
    const [githubLink, setGithubLink] = useState("")
    const [websiteLink, setWebsiteLink] = useState("")
    const [dribbbleLink, setDribbbleLink] = useState("")
    const [huggingfaceLink, setHuggingfaceLink] = useState("")

    const [leetcodeLink, setLeetcodeLink] = useState("")

    const [email, setEmail] = useState("")
    const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
    const [domainStatus, setDomainStatus] = useState<'pending' | 'verified' | 'active' | 'failed' | null>(null)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteType, setDeleteType] = useState<'posts' | 'publication' | null>(null)
    const [deleteConfirmation, setDeleteConfirmation] = useState("")
    const [isDeleting, setIsDeleting] = useState(false)
    const { logout } = useAuthStore()

    const tabs = [
        { id: 'Basics', label: 'Basics' },
        { id: 'Publication', label: 'Publication' },
        { id: 'Danger', label: 'Danger Zone', danger: true },
    ]
    const { user } = useAuthStore()
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const tabParam = params.get('tab')
        if (tabParam && tabs.some(t => t.id === tabParam)) {
            setActiveTab(tabParam)
        }
        loadSettings()
        if (user?.email) {
            setCurrentUserEmail(user.email)
        }
    }, [user])
    const loadSettings = () => {
        fetchSettings()
    }
    useEffect(() => {
        if (settings) {
            setPubName(settings.siteName || "")
            setDescription(settings.siteDescription || "")
            setCustomDomain(settings.customDomain || "")
            setSubdomain(settings.subdomain || "")
            setTwitterLink(settings.twitterLink || "")
            setLinkedinLink(settings.linkedinLink || "")
            setGithubLink(settings.githubLink || "")
            setWebsiteLink(settings.websiteLink || "")
            setDribbbleLink(settings.dribbbleLink || "")
            setHuggingfaceLink(settings.huggingfaceLink || "")

            setLeetcodeLink(settings.leetcodeLink || "")

            setEmail(settings.newsletterEmail || "")
            setDomainStatus(settings.domainStatus || null)
        }
    }, [settings])
    const handleSave = async () => {
        setSaving(true)
        setSchemaError(null)
        try {
            const updated = await settingsService.saveSettings({
                siteName: pubName,
                siteDescription: description,
                customDomain: customDomain || null,
                subdomain: subdomain || null,
                twitterLink: twitterLink || null,
                linkedinLink: linkedinLink || null,
                githubLink: githubLink || null,
                websiteLink: websiteLink || null,
                dribbbleLink: dribbbleLink || null,
                huggingfaceLink: huggingfaceLink || null,

                leetcodeLink: leetcodeLink || null,

                newsletterEmail: email || null
            })
            if (updated) {
                updateSettingsInCache(updated)
                setSubdomain(updated.subdomain || "")
                await fetchSettings(true)
                addToast({
                    type: 'success',
                    message: 'Settings saved successfully'
                })
            }
        } catch (error: any) {
            console.error('Save error:', error)
            const isSchemaError = error.message?.includes('column') || error.message?.includes('schema') || error.code === '42703'
            if (isSchemaError) {
                setSchemaError('Missing database column. Please run the generated SQL migration.')
            }
            addToast({
                type: 'error',
                message: isSchemaError
                    ? 'Database update required. See alert above.'
                    : `Failed to save: ${error.message || 'Unknown error'} `,
                duration: isSchemaError ? 10000 : 4000
            })
        } finally {
            setSaving(false)
        }
    }

    const handleVerify = async () => {
        if (!customDomain) return
        setSaving(true)
        try {
            const result = await settingsService.verifyDomain(customDomain)
            if (!result.success) {
                throw new Error(result.error || 'Failed to verify domain')
            }
            const newStatus = 'verified'
            setDomainStatus(newStatus)
            const updated = await settingsService.saveSettings({
                ...settings,
                customDomain,
                subdomain: subdomain || null,
                domainStatus: newStatus
            } as any)
            if (updated) {
                updateSettingsInCache(updated)
            }
            addToast({
                type: 'success',
                message: 'Domain connected! SSL is being issued. This can take 5–20 minutes.'
            })
        } catch (err: any) {
            console.error('Verification failed', err)
            addToast({
                type: 'error',
                message: err.message
            })
        } finally {
            setSaving(false)
        }
    }
    const handleRemoveDomain = async () => {
        setSaving(true)
        try {
            const updated = await settingsService.saveSettings({
                ...settings,
                customDomain: null,
                domainStatus: null
            } as any)
            if (updated) {
                updateSettingsInCache(updated)
                setCustomDomain("")
                setDomainStatus(null)
                addToast({ type: 'success', message: 'Domain removed successfully' })
            }
        } catch (error: any) {
            addToast({ type: 'error', message: 'Failed to remove domain' })
        } finally {
            setSaving(false)
        }
    }
    if (settingsLoading && !settings) {
        return <SettingsSkeleton />
    }
    return (
        <div className="settings-page" style={{ padding: '0', color: 'var(--text-primary)', maxWidth: '100%' }}>

            <div className="settings-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)', fontFamily: "'Jost', sans-serif" }}>Settings</h1>
            </div>

            {schemaError && (
                <div style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid #ef4444',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '2rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', color: '#ef4444' }}>
                        <AlertTriangle size={20} />
                        <h4 style={{ margin: 0, fontWeight: 700 }}>Database Update Required</h4>
                    </div>
                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        The <code>newsletter_email</code> or other new social columns (Dribbble, etc.) are missing. Please run this SQL:
                    </p>
                    <div style={{
                        backgroundColor: 'var(--bg-secondary)',
                        padding: '0.75rem',
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                        fontSize: '0.85rem',
                        marginBottom: '0.75rem',
                        overflowX: 'auto',
                        whiteSpace: 'nowrap'
                    }}>
                        ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS newsletter_email TEXT;
                        ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS dribbble_link TEXT;
                        ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS huggingface_link TEXT;

                        ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS leetcode_link TEXT;

                    </div>
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(`ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS newsletter_email TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS dribbble_link TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS huggingface_link TEXT;

ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS leetcode_link TEXT;`)
                            addToast({ type: 'success', message: 'SQL copied to clipboard!' })
                        }}
                        style={{
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            padding: '0.5rem 1rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 600
                        }}
                    >
                        Copy SQL Command
                    </button>
                </div>
            )}

            <div className="settings-tabs" style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)' }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className="tab-btn"
                        style={{
                            background: 'none',
                            border: 'none',
                            padding: '0.75rem 1rem',
                            color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                            fontWeight: activeTab === tab.id ? 600 : 400,
                            cursor: 'pointer',
                            borderBottom: activeTab === tab.id ? '2px solid var(--text-primary)' : '2px solid transparent',
                            marginBottom: '-1px',
                            fontSize: '0.95rem',
                            transition: 'all 0.2s',
                            ...(tab.danger ? { color: activeTab === tab.id ? '#ef4444' : 'var(--text-secondary)' } : {})
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="settings-content" style={{ paddingBottom: '4rem' }}>
                {activeTab === 'Basics' && (
                    <div style={{ maxWidth: '600px' }}>
                        <div className="setting-group" style={{ marginBottom: '2.5rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Publication name</h3>
                            <input
                                type="text"
                                value={pubName}
                                onChange={(e) => setPubName(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    background: 'transparent',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '6px',
                                    color: 'inherit',
                                    fontSize: '1rem'
                                }}
                            />
                        </div>
                        <div className="setting-group" style={{ marginBottom: '2.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Enable Newsletter</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                                        Automatically notify subscribers when you publish.
                                    </p>
                                    {email && (
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }}></span>
                                            Sending from: <strong style={{ fontFamily: 'monospace' }}>{email}</strong>
                                        </p>
                                    )}
                                </div>
                                <label style={{ position: 'relative', display: 'inline-block', width: '46px', height: '26px', flexShrink: 0 }}>
                                    <input
                                        type="checkbox"
                                        checked={!!email}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setEmail(currentUserEmail || "")
                                                if (!currentUserEmail) addToast({ type: 'error', message: 'Could not fetch user email. Try reloading.' })
                                            } else {
                                                setEmail("")
                                            }
                                        }}
                                        style={{ opacity: 0, width: 0, height: 0 }}
                                    />
                                    <span style={{
                                        position: 'absolute',
                                        cursor: 'pointer',
                                        top: 0, left: 0, right: 0, bottom: 0,
                                        backgroundColor: email ? 'var(--text-primary)' : 'var(--bg-tertiary)',
                                        transition: '.3s',
                                        borderRadius: '34px',
                                    }}></span>
                                    <span style={{
                                        position: 'absolute',
                                        content: '""',
                                        height: '20px',
                                        width: '20px',
                                        left: email ? '23px' : '3px',
                                        bottom: '3px',
                                        backgroundColor: 'var(--bg-primary)',
                                        transition: '.3s',
                                        borderRadius: '50%',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                    }}></span>
                                </label>
                            </div>
                        </div>
                        <div className="setting-group" style={{ marginBottom: '2.5rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Social Links</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>Display links on your blog sidebar.</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <input
                                    type="text"
                                    placeholder="Twitter / X Link"
                                    value={twitterLink}
                                    onChange={(e) => setTwitterLink(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        background: 'transparent',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '6px',
                                        color: 'inherit',
                                        fontSize: '1rem'
                                    }}
                                />
                                <input
                                    type="text"
                                    placeholder="LinkedIn Profile"
                                    value={linkedinLink}
                                    onChange={(e) => setLinkedinLink(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        background: 'transparent',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '6px',
                                        color: 'inherit',
                                        fontSize: '1rem'
                                    }}
                                />
                                <input
                                    type="text"
                                    placeholder="Dribbble Profile"
                                    value={dribbbleLink}
                                    onChange={(e) => setDribbbleLink(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        background: 'transparent',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '6px',
                                        color: 'inherit',
                                        fontSize: '1rem'
                                    }}
                                />
                                <input
                                    type="text"
                                    placeholder="Hugging Face Profile"
                                    value={huggingfaceLink}
                                    onChange={(e) => setHuggingfaceLink(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        background: 'transparent',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '6px',
                                        color: 'inherit',
                                        fontSize: '1rem'
                                    }}
                                />

                                <input
                                    type="text"
                                    placeholder="LeetCode Profile"
                                    value={leetcodeLink}
                                    onChange={(e) => setLeetcodeLink(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        background: 'transparent',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '6px',
                                        color: 'inherit',
                                        fontSize: '1rem'
                                    }}
                                />

                                <input
                                    type="text"
                                    placeholder="GitHub Profile"
                                    value={githubLink}
                                    onChange={(e) => setGithubLink(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        background: 'transparent',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '6px',
                                        color: 'inherit',
                                        fontSize: '1rem'
                                    }}
                                />
                                <input
                                    type="text"
                                    placeholder="Website / Portfolio"
                                    value={websiteLink}
                                    onChange={(e) => setWebsiteLink(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        background: 'transparent',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '6px',
                                        color: 'inherit',
                                        fontSize: '1rem'
                                    }}
                                />
                            </div>
                        </div>
                        <div style={{ marginTop: '2rem' }}>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="btn btn-primary"
                                style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)', padding: '0.75rem 1.5rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                            >
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                )}
                {activeTab === 'Publication' && (
                    <div style={{ maxWidth: '600px' }}>

                        <div className="setting-group" style={{ marginBottom: '2.5rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Custom Domain</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>Connect your own domain (e.g. blog.yourname.com).</p>
                            {!settings?.customDomain ? (
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                    <Globe size={18} style={{ color: 'var(--text-secondary)' }} />
                                    <input
                                        type="text"
                                        placeholder="blog.yourname.com"
                                        value={customDomain}
                                        onChange={(e) => setCustomDomain(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            background: 'transparent',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '6px',
                                            color: 'inherit',
                                            fontSize: '1rem'
                                        }}
                                    />
                                </div>
                            ) : (
                                <div style={{
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    padding: '1.5rem',
                                    backgroundColor: 'var(--bg-secondary)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <Globe size={20} />
                                            <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>{customDomain}</span>
                                        </div>

                                    </div>

                                    {domainStatus !== 'active' && domainStatus !== 'verified' && (
                                        <div style={{ marginBottom: '1.5rem' }}>
                                            <p style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>Add this DNS record at your domain provider:</p>
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: '80px 1fr 1fr',
                                                gap: '1px',
                                                backgroundColor: 'var(--border-color)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '6px',
                                                overflow: 'hidden',
                                                marginBottom: '1rem'
                                            }}>
                                                <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Type</div>
                                                <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Name</div>
                                                <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Value</div>
                                                <div style={{ background: 'var(--bg-primary)', padding: '0.75rem', fontWeight: 600, fontSize: '0.9rem' }}>CNAME</div>
                                                <div style={{ background: 'var(--bg-primary)', padding: '0.75rem', fontWeight: 600, fontSize: '0.9rem' }}>blog</div>
                                                <div style={{ background: 'var(--bg-primary)', padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.9rem' }}>cname.vercel-dns.com</div>
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', fontStyle: 'italic' }}>
                                                DNS changes may take a few minutes. After adding, click Verify.
                                            </div>
                                            <div style={{
                                                fontSize: '0.8rem',
                                                color: '#eab308',
                                                backgroundColor: 'rgba(234, 179, 8, 0.1)',
                                                padding: '0.75rem',
                                                borderRadius: '4px',
                                                marginBottom: '1rem',
                                                border: '1px solid rgba(234, 179, 8, 0.2)'
                                            }}>
                                                <strong>Cloudflare User?</strong> Make sure to turn <strong>OFF</strong> the proxy (Grey Cloud) for this record, or ensure SSL is set to <strong>Full (Strict)</strong>.
                                            </div>
                                            <div style={{ display: 'flex', gap: '1rem' }}>
                                                <button onClick={handleVerify} disabled={saving} style={{
                                                    padding: '0.5rem 1rem',
                                                    fontSize: '0.9rem',
                                                    fontWeight: 600,
                                                    background: 'var(--text-primary)',
                                                    color: 'var(--bg-primary)',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    opacity: saving ? 0.7 : 1
                                                }}>
                                                    {saving ? 'Verifying...' : 'Verify Connection'}
                                                </button>
                                                <button
                                                    onClick={handleRemoveDomain}
                                                    style={{
                                                        padding: '0.5rem 1rem',
                                                        fontSize: '0.9rem',
                                                        background: 'transparent',
                                                        color: '#ef4444',
                                                        border: '1px solid #ef4444',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer'
                                                    }}>
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {domainStatus === 'verified' && (
                                        <div style={{
                                            marginBottom: '1.5rem',
                                            padding: '1.5rem',
                                            backgroundColor: 'rgba(34, 197, 94, 0.05)',
                                            border: '1px solid rgba(34, 197, 94, 0.2)',
                                            borderRadius: '8px'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                                <CheckCircle2 size={24} color="#22c55e" />
                                                <h4 style={{ margin: 0, color: '#22c55e', fontSize: '1rem' }}>Domain Verified!</h4>
                                            </div>
                                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
                                                We are generating your SSL certificate and configuring global routing. This typically takes <strong>5-20 minutes</strong>. You don't need to do anything else.
                                            </p>
                                            <button
                                                onClick={handleRemoveDomain}
                                                style={{
                                                    marginTop: '1rem',
                                                    padding: '0.5rem 1rem',
                                                    fontSize: '0.85rem',
                                                    background: 'transparent',
                                                    color: '#ef4444',
                                                    border: '1px solid #ef4444',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer'
                                                }}>
                                                Disconnect
                                            </button>
                                        </div>
                                    )}
                                    {domainStatus === 'active' && (
                                        <div>
                                            <p style={{ fontSize: '0.9rem', color: '#22c55e' }}>✓ Domain is active and serving your blog.</p>
                                            <button
                                                onClick={handleRemoveDomain}
                                                style={{
                                                    marginTop: '1rem',
                                                    padding: '0.5rem 1rem',
                                                    fontSize: '0.9rem',
                                                    background: 'transparent',
                                                    color: '#ef4444',
                                                    border: '1px solid #ef4444',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer'
                                                }}>
                                                Disconnect
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        {!settings?.customDomain && (
                            <div style={{ marginTop: '2rem' }}>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="btn btn-primary"
                                    style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)', padding: '0.75rem 1.5rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                                >
                                    {saving ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
                {activeTab === 'Danger' && (
                    <div className="settings-danger-zone" style={{ maxWidth: '600px' }}>
                        <div style={{ border: '1px solid var(--border-color)', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Delete post archive</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>Permanently delete all posts on this publication.</p>
                                <button
                                    className="danger-magic-btn"
                                    onClick={() => {
                                        setDeleteType('posts')
                                        setDeleteConfirmation('')
                                        setShowDeleteModal(true)
                                    }}
                                >
                                    <span className="danger-text">Delete all posts</span>
                                </button>
                            </div>
                        </div>
                        <div style={{ border: '1px solid var(--border-color)', padding: '1.5rem', borderRadius: '8px' }}>
                            <div>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Delete Account</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>Permanently delete your account, posts, subscriber list, and all other content.</p>
                                <button
                                    className="danger-magic-btn"
                                    onClick={() => {
                                        setDeleteType('publication')
                                        setDeleteConfirmation('')
                                        setShowDeleteModal(true)
                                    }}
                                >
                                    <span className="danger-text">Delete Account</span>
                                </button>
                            </div>
                        </div>
                        <style>{`
                                .danger-magic-btn {
                                    position: relative;
                                    display: inline-flex;
                                    align-items: center;
                                    justify-content: center;
                                    padding: 0.75rem 1.5rem;
                                    border-radius: 9999px;
                                    text-decoration: none;
                                    font-size: 0.95rem;
                                    font-weight: 600;
                                    color: #ef4444;
                                    background: transparent;
                                    border: none;
                                    cursor: pointer;
                                    overflow: hidden;
                                    transition: transform 0.2s ease, color 0.2s ease;
                                    transform: translateZ(0);
                                    isolation: isolate;
                                }

                    .danger-magic-btn:hover {
                        color: #ffffff;
                            }

                    .danger-magic-btn::before {
                        content: "";
                    position: absolute;
                    top: -150%;
                    left: -150%;
                    width: 400%;
                    height: 400%;
                    background: conic-gradient(
                    from 0deg,
                    #ef4444,
                    #f97316,
                    #ef4444
                    );
                    z-index: -2;
                    transition: opacity 0.3s ease;
                    opacity: 1;
                            }

                    .danger-magic-btn::after {
                        content: "";
                    position: absolute;
                    inset: 2px;
                    background: var(--bg-primary);
                    border-radius: 9999px;
                    z-index: -1;
                    transition: opacity 0.3s ease;
                            }

                    .danger-magic-btn:hover::after {
                        opacity: 0;
                            }

                    .danger-text {
                        position: relative;
                    z-index: 10;
                            }
                        `}</style>
                    </div>
                )
                }
            </div >


            {
                showDeleteModal && (
                    <div className="delete-modal-overlay" style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: '1rem'
                    }}>
                        <div className="delete-modal-content" style={{
                            width: '100%',
                            maxWidth: '480px',
                            backgroundColor: 'var(--bg-elevated)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '12px',
                            padding: '2rem',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', color: '#ef4444' }}>
                                <AlertTriangle size={32} />
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                                    {deleteType === 'posts' ? 'Delete Archive' : 'Delete Account'}
                                </h2>
                            </div>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                                {deleteType === 'posts'
                                    ? 'This action sends all your posts to the void. There is no undo button.'
                                    : 'This action will permanently delete your account, posts, and settings. This cannot be undone.'
                                }
                            </p>
                            <div style={{ marginBottom: '2rem' }}>
                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                                    Type <span style={{ fontFamily: 'monospace', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px' }}>I consent of delete</span> to confirm:
                                </label>
                                <input
                                    type="text"
                                    value={deleteConfirmation}
                                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                                    placeholder="I consent of delete"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border-color)',
                                        background: 'var(--bg-primary)',
                                        color: 'var(--text-primary)',
                                        fontSize: '1rem',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                            <div className="delete-modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    style={{
                                        padding: '0.75rem 1.5rem',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border-color)',
                                        background: 'transparent',
                                        color: 'var(--text-primary)',
                                        cursor: 'pointer',
                                        fontWeight: 500
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={deleteConfirmation !== 'I consent of delete' || isDeleting}
                                    onClick={async () => {
                                        setIsDeleting(true)
                                        try {
                                            if (deleteType === 'posts') {
                                                const { postService } = await import('../../services/postService')
                                                await postService.deleteAllPosts()
                                                addToast({ type: 'success', message: 'All posts deleted.' })
                                            } else {
                                                const { postService } = await import('../../services/postService')
                                                await postService.deleteAllPosts()

                                                try {
                                                    await apiClient.delete('/auth/delete')
                                                } catch (e) {
                                                    console.error('Delete user API error:', e)
                                                }

                                                await logout()
                                                window.location.href = '/'
                                            }
                                            setShowDeleteModal(false)
                                        } catch (e: any) {
                                            addToast({ type: 'error', message: e.message || 'Failed to delete.' })
                                            console.error(e)
                                        } finally {
                                            setIsDeleting(false)
                                        }
                                    }}
                                    style={{
                                        padding: '0.75rem 1.5rem',
                                        borderRadius: '6px',
                                        border: 'none',
                                        background: deleteConfirmation === 'I consent of delete' ? '#ef4444' : 'var(--bg-secondary)',
                                        color: deleteConfirmation === 'I consent of delete' ? '#fff' : 'var(--text-muted)',
                                        cursor: deleteConfirmation === 'I consent of delete' ? 'pointer' : 'not-allowed',
                                        fontWeight: 600,
                                        opacity: isDeleting ? 0.7 : 1,
                                        whiteSpace: 'nowrap',
                                        minWidth: '120px'
                                    }}
                                >
                                    {isDeleting ? 'Deleting...' : (deleteType === 'posts' ? 'Delete Posts' : 'Delete Account')}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            <style>{`
                @media (max-width: 499px) {

                    .settings-header h1 {
                        font-size: 1.75rem !important;
                        margin-bottom: 1rem !important;
                    }
                    .settings-tabs {
                        overflow-x: auto !important;
                        flex-wrap: nowrap !important;
                        -webkit-overflow-scrolling: touch;
                        padding-bottom: 0.5rem !important;
                        gap: 0.25rem !important;
                        border-bottom: none !important;
                    }
                    .settings-tabs .tab-btn {
                       white-space: nowrap !important;
                       flex-shrink: 0 !important;
                       padding: 0.6rem 0.9rem !important;
                    } 
                    .settings-danger-zone .danger-btn {
                       flex-wrap: wrap !important;
                       height: auto !important;
                       white-space: normal !important;
                       text-align: left !important;
                       min-width: 0 !important;
                    }
                    .settings-content > div {
                         max-width: 100% !important;
                    }
                    .delete-modal-overlay {
                        align-items: center !important;
                        justify-content: center !important;
                        padding: 0 !important;
                    }
                    .delete-modal-content {
                        transform: scale(0.6) !important;
                        transform-origin: center center !important;
                        max-width: 90vw !important;
                        width: 90vw !important;
                        margin: 0 auto !important;
                        max-height: 80vh !important;
                    }
                    .delete-modal-content h2,
                    .delete-modal-content p,
                    .delete-modal-content label,
                    .delete-modal-content input,
                    .delete-modal-actions button {
                    }
                }
            `}</style>
        </div >
    )
}
export default Settings
