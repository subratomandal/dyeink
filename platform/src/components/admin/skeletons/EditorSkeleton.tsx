import Skeleton from '../../common/ui/Skeleton'

export default function EditorSkeleton() {
    return (
        <div className="animate-fade-in" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>

            <nav style={{
                padding: '0.75rem 1.5rem',
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                alignItems: 'center',
                height: '65px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Skeleton style={{ width: '36px', height: '36px', borderRadius: '999px' }} />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <Skeleton style={{ width: '22px', height: '22px', borderRadius: '999px' }} />
                    <Skeleton style={{ width: '22px', height: '22px', borderRadius: '999px' }} />
                    <Skeleton style={{ width: '22px', height: '22px', borderRadius: '999px' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Skeleton style={{ width: '82px', height: '34px', borderRadius: '999px' }} />
                </div>
            </nav>


            <div style={{ maxWidth: '720px', width: '100%', margin: '0 auto', padding: '5rem 1.5rem 3rem 1.5rem' }}>
                <Skeleton style={{ height: '44px', width: '68%', marginBottom: '2rem', borderRadius: '16px' }} />
                <Skeleton style={{ height: '14px', width: '100%', marginBottom: '0.85rem', borderRadius: '999px' }} />
                <Skeleton style={{ height: '14px', width: '92%', marginBottom: '0.85rem', borderRadius: '999px' }} />
                <Skeleton style={{ height: '14px', width: '96%', marginBottom: '0.85rem', borderRadius: '999px' }} />
                <Skeleton style={{ height: '14px', width: '78%', borderRadius: '999px' }} />
            </div>
        </div>
    )
}
