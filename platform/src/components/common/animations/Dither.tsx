import { type CSSProperties, useEffect, useRef } from 'react'

const vertexShaderSource = `
attribute vec2 position;

void main() {
    gl_Position = vec4(position, 0.0, 1.0);
}
`

const fragmentShaderSource = `
precision highp float;

uniform vec2 resolution;
uniform float time;
uniform float waveSpeed;
uniform float waveFrequency;
uniform float waveAmplitude;
uniform vec3 waveColor;
uniform vec2 mousePos;
uniform int enableMouseInteraction;
uniform float mouseRadius;
uniform float colorNum;
uniform float pixelSize;

vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec2 fade(vec2 t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }

float cnoise(vec2 p) {
    vec4 pi = floor(p.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
    vec4 pf = fract(p.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
    pi = mod289(pi);

    vec4 ix = pi.xzxz;
    vec4 iy = pi.yyww;
    vec4 fx = pf.xzxz;
    vec4 fy = pf.yyww;
    vec4 i = permute(permute(ix) + iy);

    vec4 gx = fract(i * (1.0 / 41.0)) * 2.0 - 1.0;
    vec4 gy = abs(gx) - 0.5;
    vec4 tx = floor(gx + 0.5);
    gx = gx - tx;

    vec2 g00 = vec2(gx.x, gy.x);
    vec2 g10 = vec2(gx.y, gy.y);
    vec2 g01 = vec2(gx.z, gy.z);
    vec2 g11 = vec2(gx.w, gy.w);

    vec4 norm = taylorInvSqrt(vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11)));
    g00 *= norm.x;
    g01 *= norm.y;
    g10 *= norm.z;
    g11 *= norm.w;

    float n00 = dot(g00, vec2(fx.x, fy.x));
    float n10 = dot(g10, vec2(fx.y, fy.y));
    float n01 = dot(g01, vec2(fx.z, fy.z));
    float n11 = dot(g11, vec2(fx.w, fy.w));
    vec2 fadeXY = fade(pf.xy);
    vec2 nx = mix(vec2(n00, n01), vec2(n10, n11), fadeXY.x);
    return 2.3 * mix(nx.x, nx.y, fadeXY.y);
}

float fbm(vec2 p) {
    float value = 0.0;
    float amp = 1.0;
    float freq = waveFrequency;

    for (int i = 0; i < 4; i++) {
        value += amp * abs(cnoise(p));
        p *= freq;
        amp *= waveAmplitude;
    }

    return value;
}

float pattern(vec2 p) {
    vec2 p2 = p - time * waveSpeed;
    return fbm(p + fbm(p2));
}

float bayer2(vec2 p) {
    p = mod(floor(p), 2.0);
    if (p.x < 0.5 && p.y < 0.5) return 0.0;
    if (p.x > 0.5 && p.y < 0.5) return 3.0;
    if (p.x < 0.5 && p.y > 0.5) return 2.0;
    return 1.0;
}

float bayer4(vec2 p) {
    return 4.0 * bayer2(p) + bayer2(floor(p / 2.0));
}

float bayer8(vec2 p) {
    return 4.0 * bayer4(p) + bayer2(floor(p / 4.0));
}

vec3 dither(vec2 fragCoord, vec3 color) {
    vec2 scaledCoord = floor(fragCoord / pixelSize);
    float threshold = bayer8(scaledCoord) / 64.0 - 0.25;
    float stepSize = 1.0 / max(colorNum - 1.0, 1.0);
    color += threshold * stepSize;
    color = clamp(color - 0.2, 0.0, 1.0);
    return floor(color * (colorNum - 1.0) + 0.5) / max(colorNum - 1.0, 1.0);
}

vec3 renderWave(vec2 fragCoord) {
    vec2 uv = fragCoord / resolution.xy;
    uv -= 0.5;
    uv.x *= resolution.x / resolution.y;

    float f = pattern(uv);

    if (enableMouseInteraction == 1) {
        vec2 mouseNDC = (mousePos / resolution - 0.5) * vec2(1.0, -1.0);
        mouseNDC.x *= resolution.x / resolution.y;
        float dist = length(uv - mouseNDC);
        float effect = 1.0 - smoothstep(0.0, mouseRadius, dist);
        f -= 0.5 * effect;
    }

    return mix(vec3(0.0), waveColor, f);
}

void main() {
    vec2 snappedCoord = floor(gl_FragCoord.xy / pixelSize) * pixelSize + pixelSize * 0.5;
    vec3 color = renderWave(snappedCoord);
    gl_FragColor = vec4(dither(gl_FragCoord.xy, color), 1.0);
}
`

interface DitherProps {
    waveSpeed?: number
    waveFrequency?: number
    waveAmplitude?: number
    waveColor?: [number, number, number]
    colorNum?: number
    pixelSize?: number
    disableAnimation?: boolean
    enableMouseInteraction?: boolean
    mouseRadius?: number
    className?: string
    style?: CSSProperties
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
    const shader = gl.createShader(type)
    if (!shader) return null

    gl.shaderSource(shader, source)
    gl.compileShader(shader)

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn(gl.getShaderInfoLog(shader))
        gl.deleteShader(shader)
        return null
    }

    return shader
}

function createProgram(gl: WebGLRenderingContext) {
    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource)
    if (!vertexShader || !fragmentShader) return null

    const program = gl.createProgram()
    if (!program) return null

    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)
    gl.deleteShader(vertexShader)
    gl.deleteShader(fragmentShader)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.warn(gl.getProgramInfoLog(program))
        gl.deleteProgram(program)
        return null
    }

    return program
}

function clamp01(value: number) {
    return Math.max(0, Math.min(1, value))
}

export default function Dither({
    waveSpeed = 0.05,
    waveFrequency = 3,
    waveAmplitude = 0.3,
    waveColor = [0.5, 0.5, 0.5],
    colorNum = 4,
    pixelSize = 2,
    disableAnimation = false,
    enableMouseInteraction = true,
    mouseRadius = 1,
    className,
    style,
}: DitherProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const frameRef = useRef<number>()
    const mouseRef = useRef({ x: 0, y: 0 })

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const gl = canvas.getContext('webgl', {
            alpha: false,
            antialias: false,
            depth: false,
            stencil: false,
            preserveDrawingBuffer: false,
        })

        if (!gl) return

        const program = createProgram(gl)
        if (!program) return

        const positionLocation = gl.getAttribLocation(program, 'position')
        const uniforms = {
            resolution: gl.getUniformLocation(program, 'resolution'),
            time: gl.getUniformLocation(program, 'time'),
            waveSpeed: gl.getUniformLocation(program, 'waveSpeed'),
            waveFrequency: gl.getUniformLocation(program, 'waveFrequency'),
            waveAmplitude: gl.getUniformLocation(program, 'waveAmplitude'),
            waveColor: gl.getUniformLocation(program, 'waveColor'),
            mousePos: gl.getUniformLocation(program, 'mousePos'),
            enableMouseInteraction: gl.getUniformLocation(program, 'enableMouseInteraction'),
            mouseRadius: gl.getUniformLocation(program, 'mouseRadius'),
            colorNum: gl.getUniformLocation(program, 'colorNum'),
            pixelSize: gl.getUniformLocation(program, 'pixelSize'),
        }

        const buffer = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
            gl.STATIC_DRAW,
        )

        const resize = () => {
            const rect = canvas.getBoundingClientRect()
            const width = Math.max(1, Math.floor(rect.width))
            const height = Math.max(1, Math.floor(rect.height))

            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width
                canvas.height = height
                gl.viewport(0, 0, width, height)
            }
        }

        const render = (now = 0) => {
            resize()
            gl.useProgram(program)
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
            gl.enableVertexAttribArray(positionLocation)
            gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

            gl.uniform2f(uniforms.resolution, canvas.width, canvas.height)
            gl.uniform1f(uniforms.time, disableAnimation ? 0 : now * 0.001)
            gl.uniform1f(uniforms.waveSpeed, waveSpeed)
            gl.uniform1f(uniforms.waveFrequency, waveFrequency)
            gl.uniform1f(uniforms.waveAmplitude, waveAmplitude)
            gl.uniform3f(uniforms.waveColor, clamp01(waveColor[0]), clamp01(waveColor[1]), clamp01(waveColor[2]))
            gl.uniform2f(uniforms.mousePos, mouseRef.current.x, mouseRef.current.y)
            gl.uniform1i(uniforms.enableMouseInteraction, enableMouseInteraction ? 1 : 0)
            gl.uniform1f(uniforms.mouseRadius, mouseRadius)
            gl.uniform1f(uniforms.colorNum, Math.max(2, colorNum))
            gl.uniform1f(uniforms.pixelSize, Math.max(1, pixelSize))
            gl.drawArrays(gl.TRIANGLES, 0, 6)

            if (!disableAnimation) {
                frameRef.current = requestAnimationFrame(render)
            }
        }

        const handlePointerMove = (event: PointerEvent) => {
            if (!enableMouseInteraction) return
            const rect = canvas.getBoundingClientRect()
            mouseRef.current.x = Math.max(0, Math.min(rect.width, event.clientX - rect.left))
            mouseRef.current.y = Math.max(0, Math.min(rect.height, event.clientY - rect.top))
            if (disableAnimation) render()
        }

        const resizeObserver = new ResizeObserver(() => {
            resize()
            if (disableAnimation) render()
        })

        resizeObserver.observe(canvas)
        window.addEventListener('pointermove', handlePointerMove, { passive: true })
        render()

        return () => {
            if (frameRef.current) cancelAnimationFrame(frameRef.current)
            window.removeEventListener('pointermove', handlePointerMove)
            resizeObserver.disconnect()
            if (buffer) gl.deleteBuffer(buffer)
            gl.deleteProgram(program)
        }
    }, [
        colorNum,
        disableAnimation,
        enableMouseInteraction,
        mouseRadius,
        pixelSize,
        waveAmplitude,
        waveColor,
        waveFrequency,
        waveSpeed,
    ])

    return (
        <canvas
            ref={canvasRef}
            aria-hidden="true"
            className={className}
            style={{
                display: 'block',
                height: '100%',
                pointerEvents: 'none',
                width: '100%',
                ...style,
            }}
        />
    )
}
