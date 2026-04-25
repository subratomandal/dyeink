import { useEffect, useRef } from 'react'
import './LightRays.css'

interface LightRaysProps {
    raysOrigin?: string
    raysColor?: string
    raysSpeed?: number
    lightSpread?: number
    rayLength?: number
    pulsating?: boolean
    fadeDistance?: number
    saturation?: number
    followMouse?: boolean
    mouseInfluence?: number
    noiseAmount?: number
    distortion?: number
    className?: string
}

type LightRayStyle = React.CSSProperties & Record<`--${string}`, string | number>

function originToPosition(origin: string) {
    switch (origin) {
        case 'top-left':
            return { x: '0%', y: '0%' }
        case 'top-right':
            return { x: '100%', y: '0%' }
        case 'left':
            return { x: '0%', y: '50%' }
        case 'right':
            return { x: '100%', y: '50%' }
        case 'bottom-left':
            return { x: '0%', y: '100%' }
        case 'bottom-center':
            return { x: '50%', y: '100%' }
        case 'bottom-right':
            return { x: '100%', y: '100%' }
        default:
            return { x: '50%', y: '0%' }
    }
}

export default function LightRays({
    raysOrigin = 'top-center',
    raysColor = '#ffffff',
    raysSpeed = 1,
    lightSpread = 1,
    rayLength = 2,
    pulsating = false,
    fadeDistance = 1,
    saturation = 1,
    followMouse = true,
    mouseInfluence = 0.1,
    noiseAmount = 0,
    distortion = 0,
    className = '',
}: LightRaysProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const origin = originToPosition(raysOrigin)

    useEffect(() => {
        if (!followMouse || mouseInfluence <= 0) return

        const handlePointerMove = (event: PointerEvent) => {
            const node = containerRef.current
            if (!node) return
            const rect = node.getBoundingClientRect()
            const x = ((event.clientX - rect.left) / rect.width) * 100
            const y = ((event.clientY - rect.top) / rect.height) * 100
            node.style.setProperty('--ray-mouse-x', `${Math.max(0, Math.min(100, x))}%`)
            node.style.setProperty('--ray-mouse-y', `${Math.max(0, Math.min(100, y))}%`)
        }

        window.addEventListener('pointermove', handlePointerMove, { passive: true })
        return () => window.removeEventListener('pointermove', handlePointerMove)
    }, [followMouse, mouseInfluence])

    const spread = Math.max(24, lightSpread * 58)
    const style: LightRayStyle = {
        '--ray-origin-x': origin.x,
        '--ray-origin-y': origin.y,
        '--ray-mouse-x': origin.x,
        '--ray-mouse-y': origin.y,
        '--ray-color': raysColor,
        '--ray-speed': `${Math.max(0.1, 8 / Math.max(0.1, raysSpeed))}s`,
        '--ray-spread': `${spread}deg`,
        '--ray-spread-inner': `${spread * 0.35}deg`,
        '--ray-length': `${Math.max(40, rayLength * 45)}%`,
        '--ray-fade': Math.max(0.15, Math.min(1, fadeDistance)),
        '--ray-saturation': Math.max(0, saturation),
        '--ray-noise': Math.max(0, Math.min(0.2, noiseAmount)),
        '--ray-distortion': `${Math.max(0, distortion) * 6}deg`,
    }

    return (
        <div
            ref={containerRef}
            className={`light-rays-container ${pulsating ? 'light-rays-pulse' : ''} ${className}`}
            style={style}
            aria-hidden="true"
        />
    )
}
