import Skeleton from '../../common/ui/Skeleton'

export default function SettingsSkeleton() {
    return (
        <div className="animate-fade-in" style={{ maxWidth: '768px' }}>
            <Skeleton style={{ height: '32px', width: '150px', marginBottom: '1.5rem', borderRadius: '999px' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.6rem' }}>
                <div>
                    <Skeleton style={{ height: '16px', width: '110px', marginBottom: '1rem', borderRadius: '999px' }} />
                    <Skeleton style={{ height: '38px', width: '100%', marginBottom: '0.85rem', borderRadius: '12px' }} />
                    <Skeleton style={{ height: '38px', width: '92%', marginBottom: '0.85rem', borderRadius: '12px' }} />
                    <Skeleton style={{ height: '38px', width: '76%', borderRadius: '12px' }} />
                </div>

                <div>
                    <Skeleton style={{ height: '16px', width: '130px', marginBottom: '1rem', borderRadius: '999px' }} />
                    <Skeleton style={{ height: '38px', width: '100%', marginBottom: '0.85rem', borderRadius: '12px' }} />
                    <Skeleton style={{ height: '38px', width: '62%', borderRadius: '12px' }} />
                </div>
            </div>
        </div>
    )
}
