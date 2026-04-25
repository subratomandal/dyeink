import {
    type HTMLAttributes,
    type ReactNode,
    useCallback,
    useEffect,
    useId,
    useLayoutEffect,
    useRef,
} from 'react'

const distortionIntensity = 0.15
const roundness = 0.6
const shapeWidth = 0.3
const shapeHeight = 0.2
const canvasDpi = 0.75

type VasoProps = HTMLAttributes<HTMLElement> & {
    component?: keyof JSX.IntrinsicElements
    children?: ReactNode
    width?: number
    height?: number
    px?: number
    py?: number
    radius?: number
    depth?: number
    blur?: number
    dispersion?: number | false
}

function createBackdropFilter(uid: string, blur: number) {
    return `url(#${uid}_filter) blur(${blur}px) contrast(1.1) brightness(1.05) saturate(1.1)`
}

function smoothStep(a: number, b: number, value: number) {
    const t = Math.max(0, Math.min(1, (value - a) / (b - a)))
    return t * t * (3 - 2 * t)
}

function length(x: number, y: number) {
    return Math.sqrt(x * x + y * y)
}

function roundedRectSdf(x: number, y: number, width: number, height: number, radius: number) {
    const absWidth = Math.abs(width)
    const absHeight = Math.abs(height)
    const absRadius = Math.abs(radius)
    const qx = Math.abs(x) - absWidth + absRadius
    const qy = Math.abs(y) - absHeight + absRadius
    const distance = Math.min(Math.max(qx, qy), 0) + length(Math.max(qx, 0), Math.max(qy, 0)) - absRadius
    return width < 0 || height < 0 ? -distance : distance
}

function createDisplacementFragment(uv: { x: number; y: number }, intensity = distortionIntensity, depth = 0) {
    const ix = uv.x - 0.5
    const iy = uv.y - 0.5
    const distanceToEdge = roundedRectSdf(ix, iy, Math.abs(shapeWidth), Math.abs(shapeHeight), Math.abs(roundness))
    const displacement = smoothStep(0.8, 0, distanceToEdge - Math.abs(intensity))
    const scaled = smoothStep(0, 1, displacement)
    const depthReverse = depth < 0
    const intensityReverse = intensity < 0
    const effectMultiplier = depthReverse || intensityReverse ? 1 - scaled * 0.7 : scaled

    return {
        x: ix * effectMultiplier + 0.5,
        y: iy * effectMultiplier + 0.5,
    }
}

const generateDisplacementData = (() => {
    const cache = new Map<string, { data: Uint8ClampedArray; maxScale: number }>()

    return (width: number, height: number, intensity = distortionIntensity, depth = 1) => {
        const key = `${width}-${height}-${intensity}-${depth}`

        const cached = cache.get(key)
        if (cached) return cached

        if (width <= 0 || height <= 0 || !Number.isFinite(width) || !Number.isFinite(height)) {
            return { data: new Uint8ClampedArray(4), maxScale: 0 }
        }

        const w = Math.floor(width)
        const h = Math.floor(height)
        const data = new Uint8ClampedArray(w * h * 4)
        const rawValues: number[] = []
        let maxScale = 0

        for (let i = 0; i < data.length; i += 4) {
            const x = (i / 4) % w
            const y = Math.floor(i / 4 / w)
            const pos = createDisplacementFragment({ x: x / w, y: y / h }, intensity, depth)
            const dx = pos.x * w - x
            const dy = pos.y * h - y
            maxScale = Math.max(maxScale, Math.abs(dx), Math.abs(dy))
            rawValues.push(dx, dy)
        }

        const scale = Math.max(maxScale * 0.5, 0.0001)
        let index = 0

        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.max(0, Math.min(255, (rawValues[index++] / scale + 0.5) * 255))
            data[i + 1] = Math.max(0, Math.min(255, (rawValues[index++] / scale + 0.5) * 255))
            data[i + 2] = 0
            data[i + 3] = 255
        }

        const result = { data, maxScale: scale }

        if (cache.size > 10) {
            const firstKey = cache.keys().next().value
            if (firstKey) cache.delete(firstKey)
        }

        cache.set(key, result)
        return result
    }
})()

export default function Vaso({
    component = 'div',
    children,
    width,
    height,
    px = 0,
    py = 0,
    radius = 0,
    depth = 0.4,
    blur = 0.1,
    dispersion = 0.5,
    style,
    ...htmlProps
}: VasoProps) {
    const reactId = useId()
    const uid = `vaso-${reactId.replace(/:/g, '')}`
    const wrapperRef = useRef<HTMLElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLElement>(null)
    const feImageRef = useRef<SVGFEImageElement>(null)
    const feDisplacementMapRef = useRef<SVGFEDisplacementMapElement>(null)
    const frameRef = useRef<number | null>(null)
    const Component = component as 'div'

    const scheduleUpdate = useCallback(() => {
        if (frameRef.current) cancelAnimationFrame(frameRef.current)

        frameRef.current = requestAnimationFrame(() => {
            const targetEl = wrapperRef.current
            const canvas = canvasRef.current
            const feImage = feImageRef.current
            const feDisplacementMap = feDisplacementMapRef.current
            const container = containerRef.current

            if (!targetEl || !canvas || !feImage || !feDisplacementMap || !container) return

            const rect = targetEl.getBoundingClientRect()
            const finalWidth = Math.max(1, (width ?? rect.width) + 2 * px)
            const finalHeight = Math.max(1, (height ?? rect.height) + 2 * py)

            container.style.width = `${finalWidth}px`
            container.style.height = `${finalHeight}px`
            container.style.backdropFilter = createBackdropFilter(uid, blur)
            container.style.setProperty('-webkit-backdrop-filter', createBackdropFilter(uid, blur))

            const shadowScale = Math.min(Math.max(finalWidth + finalHeight, 100), 800) / 400
            const blurRadius = Math.round(4 * shadowScale)
            const spreadRadius = Math.round(8 * shadowScale)
            const insetBlur = Math.round(20 * shadowScale)
            const insetOffset = Math.round(-10 * shadowScale)
            container.style.boxShadow = `0 ${blurRadius}px ${spreadRadius}px rgba(0, 0, 0, 0.2), 0 ${insetOffset}px ${insetBlur}px inset rgba(0, 0, 0, 0.15)`

            const canvasWidth = Math.max(1, Math.floor(finalWidth * canvasDpi))
            const canvasHeight = Math.max(1, Math.floor(finalHeight * canvasDpi))

            canvas.width = canvasWidth
            canvas.height = canvasHeight

            const context = canvas.getContext('2d')
            if (!context) return

            const { data, maxScale } = generateDisplacementData(canvasWidth, canvasHeight, distortionIntensity, depth)
            const imageData = context.createImageData(canvasWidth, canvasHeight)
            imageData.data.set(data)
            context.putImageData(imageData, 0, 0)

            feImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', canvas.toDataURL())
            feImage.setAttribute('width', `${finalWidth}`)
            feImage.setAttribute('height', `${finalHeight}`)

            const finalScale = Math.max(0, (maxScale * Math.abs(depth)) / canvasDpi)
            feDisplacementMap.setAttribute('scale', finalScale.toString())
            feDisplacementMap.parentElement?.setAttribute('width', `${finalWidth}`)
            feDisplacementMap.parentElement?.setAttribute('height', `${finalHeight}`)
        })
    }, [blur, depth, height, px, py, uid, width])

    useLayoutEffect(() => {
        scheduleUpdate()
    }, [scheduleUpdate])

    useEffect(() => {
        const target = wrapperRef.current
        if (!target) return

        const observer = new ResizeObserver(scheduleUpdate)
        observer.observe(target)
        window.addEventListener('resize', scheduleUpdate, { passive: true })

        return () => {
            observer.disconnect()
            window.removeEventListener('resize', scheduleUpdate)
            if (frameRef.current) cancelAnimationFrame(frameRef.current)
        }
    }, [scheduleUpdate])

    return (
        <Component {...htmlProps} style={style} ref={wrapperRef as never}>
            <div
                data-vaso={uid}
                ref={containerRef as never}
                style={{
                    position: 'absolute',
                    top: -py,
                    left: -px,
                    width: `calc(100% + ${px * 2}px)`,
                    height: `calc(100% + ${py * 2}px)`,
                    overflow: 'hidden',
                    pointerEvents: 'none',
                    userSelect: 'none',
                    ...(radius ? { borderRadius: radius } : null),
                }}
            />

            <svg width="0" height="0" style={{ position: 'fixed', top: 0, left: 0, zIndex: -1 }} aria-hidden="true">
                <defs>
                    <filter
                        id={`${uid}_filter`}
                        filterUnits="userSpaceOnUse"
                        colorInterpolationFilters="sRGB"
                        x="-5%"
                        y="-5%"
                        width="110%"
                        height="110%"
                    >
                        <feImage ref={feImageRef} id={`${uid}_map`} />
                        <feDisplacementMap
                            ref={feDisplacementMapRef}
                            in="SourceGraphic"
                            in2={`${uid}_map`}
                            xChannelSelector="R"
                            yChannelSelector="G"
                            result="displaced"
                        />
                        {dispersion ? (
                            <>
                                <feOffset dx={dispersion} dy={dispersion} in="displaced" result="redShift" />
                                <feOffset dx="0" dy="0" in="displaced" result="greenCenter" />
                                <feOffset dx={-dispersion} dy={-dispersion} in="displaced" result="blueShift" />
                                <feColorMatrix
                                    in="redShift"
                                    type="matrix"
                                    values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
                                    result="redOnly"
                                />
                                <feColorMatrix
                                    in="greenCenter"
                                    type="matrix"
                                    values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
                                    result="greenOnly"
                                />
                                <feColorMatrix
                                    in="blueShift"
                                    type="matrix"
                                    values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
                                    result="blueOnly"
                                />
                                <feComposite in="redOnly" in2="greenOnly" operator="lighter" result="redGreen" />
                                <feComposite in="redGreen" in2="blueOnly" operator="lighter" />
                            </>
                        ) : null}
                    </filter>
                </defs>
            </svg>
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {children}
        </Component>
    )
}
