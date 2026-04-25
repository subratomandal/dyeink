import Skeleton from '../../common/ui/Skeleton'

export default function AuthShellSkeleton() {
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-primary)',
            padding: '1rem'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '420px',
                padding: '2rem',
            }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                    <Skeleton style={{ width: '48px', height: '48px', borderRadius: '14px' }} />
                </div>

                <Skeleton style={{ height: '24px', width: '56%', margin: '0 auto 1.8rem auto', borderRadius: '999px' }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                    <Skeleton style={{ height: '44px', width: '100%', borderRadius: '14px' }} />
                    <Skeleton style={{ height: '44px', width: '100%', borderRadius: '14px' }} />
                    <Skeleton style={{ height: '44px', width: '72%', borderRadius: '14px' }} />
                </div>
            </div>
        </div>
    )
}
