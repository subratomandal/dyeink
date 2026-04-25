import Skeleton from '../../common/ui/Skeleton'

export default function StatsSkeleton() {
    return (
        <div className="animate-fade-in" style={{ maxWidth: '1200px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <Skeleton style={{ height: '32px', width: '130px', borderRadius: '999px' }} />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                {[1, 2, 3, 4].map(i => (
                    <div key={i} style={{ padding: '0.5rem 0' }}>
                        <Skeleton style={{ height: '12px', width: '72px', marginBottom: '0.75rem', borderRadius: '999px' }} />
                        <Skeleton style={{ height: '24px', width: '104px', borderRadius: '999px' }} />
                    </div>
                ))}
            </div>

            <div style={{ height: '430px', borderRadius: '12px', padding: '0.5rem 0' }}>
                <Skeleton style={{ height: '18px', width: '170px', marginBottom: '2rem', borderRadius: '999px' }} />
                <div style={{ display: 'flex', height: '340px', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <Skeleton style={{ height: '1px', width: '100%', borderRadius: 0 }} />
                    <Skeleton style={{ height: '1px', width: '100%', borderRadius: 0 }} />
                    <Skeleton style={{ height: '1px', width: '100%', borderRadius: 0 }} />
                    <Skeleton style={{ height: '96px', width: '100%', borderRadius: '18px' }} />
                </div>
            </div>
        </div>
    )
}
