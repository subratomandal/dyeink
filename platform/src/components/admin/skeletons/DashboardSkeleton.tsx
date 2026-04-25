import Skeleton from '../../common/ui/Skeleton'

export default function DashboardSkeleton() {
    return (
        <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Skeleton style={{ height: '40px', width: '200px' }} />
                <Skeleton style={{ height: '40px', width: '120px' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <Skeleton style={{ height: '20px', width: '100px', marginBottom: '1rem' }} />
                        <Skeleton style={{ height: '36px', width: '80px' }} />
                    </div>
                ))}
            </div>

            <div style={{ height: '400px', background: 'var(--bg-secondary)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--border-color)' }}>
                <Skeleton style={{ height: '100%', width: '100%' }} />
            </div>
        </div>
    )
}
