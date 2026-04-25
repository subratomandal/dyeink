import { memo, useEffect, useState } from 'react'
import DecryptedText from '@/components/common/animations/DecryptedText'

interface AdminGreetingProps {
    name: string
}

const animatedNames = new Set<string>()

const AdminGreeting = memo(
    ({ name }: AdminGreetingProps) => {
        const displayName = name.split(' ')[0].slice(0, 12)
        const [hasAnimated, setHasAnimated] = useState(() => animatedNames.has(name))

        useEffect(() => {
            if (!hasAnimated) {
                const timer = setTimeout(() => {
                    animatedNames.add(name)
                    setHasAnimated(true)
                }, 1000)
                return () => clearTimeout(timer)
            }
        }, [name, hasAnimated])

        useEffect(() => {
            if (!animatedNames.has(name)) setHasAnimated(false)
        }, [name])

        return (
            <div data-greeting className="flex flex-col gap-0.5 pl-1.5 font-heading">
                <span className="text-2xl font-medium text-muted-foreground opacity-80 [text-shadow:0_0_25px_rgba(255,255,255,0.4)]">
                    Hi,
                </span>
                <span className="block h-[2.2rem] w-full truncate text-[1.75rem] font-medium leading-tight text-foreground">
                    {hasAnimated ? (
                        displayName
                    ) : (
                        <DecryptedText
                            text={displayName}
                            speed={60}
                            maxIterations={15}
                            animateOn="view"
                            revealDirection="start"
                        />
                    )}
                </span>
            </div>
        )
    },
    (prevProps, nextProps) => prevProps.name === nextProps.name,
)

export default AdminGreeting
