import { useEffect, useRef } from 'react'

interface IridescenceProps {
    color?: [number, number, number]
    speed?: number
    amplitude?: number
    mouseReact?: boolean
    className?: string
}

const vertexShaderSource = `
attribute vec2 position;
attribute vec2 uv;

varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
}
`

const fragmentShaderSource = `
precision highp float;

uniform float uTime;
uniform vec3 uColor;
uniform vec3 uResolution;
uniform vec2 uMouse;
uniform float uAmplitude;
uniform float uSpeed;

varying vec2 vUv;

void main() {
    float mr = min(uResolution.x, uResolution.y);
    vec2 uv = (vUv.xy * 2.0 - 1.0) * uResolution.xy / mr;

    uv += (uMouse - vec2(0.5)) * uAmplitude;

    float d = -uTime * 0.5 * uSpeed;
    float a = 0.0;
    for (float i = 0.0; i < 8.0; ++i) {
        a += cos(i - d - a * uv.x);
        d += sin(uv.y * i + a);
    }
    d += uTime * 0.5 * uSpeed;

    vec3 col = vec3(cos(uv * vec2(d, a)) * 0.6 + 0.4, cos(a + d) * 0.5 + 0.5);
    col = cos(col * cos(vec3(d, a, 2.5)) * 0.5 + 0.5) * uColor;

    float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
    gl_FragColor = vec4(vec3(luma), 1.0);
}
`

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
    const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
    const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource)
    if (!vertex || !fragment) return null

    const program = gl.createProgram()
    if (!program) return null

    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.linkProgram(program)
    gl.deleteShader(vertex)
    gl.deleteShader(fragment)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.warn(gl.getProgramInfoLog(program))
        gl.deleteProgram(program)
        return null
    }

    return program
}

export default function Iridescence({
    color = [0.23921568627450981, 0.24705882352941178, 0.25098039215686274],
    speed = 0.08,
    amplitude = 0.06,
    mouseReact = true,
    className = '',
}: IridescenceProps) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const mouseRef = useRef({ x: 0.5, y: 0.5 })

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const canvas = document.createElement('canvas')
        const gl = canvas.getContext('webgl', {
            alpha: true,
            antialias: false,
            depth: false,
            stencil: false,
            powerPreference: 'low-power',
        })

        if (!gl) return

        canvas.style.display = 'block'
        canvas.style.height = '100%'
        canvas.style.width = '100%'
        container.appendChild(canvas)

        const program = createProgram(gl)
        if (!program) {
            canvas.remove()
            return
        }

        const data = new Float32Array([
            -1, -1, 0, 0,
            1, -1, 1, 0,
            -1, 1, 0, 1,
            -1, 1, 0, 1,
            1, -1, 1, 0,
            1, 1, 1, 1,
        ])
        const buffer = gl.createBuffer()
        const positionLocation = gl.getAttribLocation(program, 'position')
        const uvLocation = gl.getAttribLocation(program, 'uv')
        if (!buffer || positionLocation < 0 || uvLocation < 0) {
            gl.deleteProgram(program)
            canvas.remove()
            return
        }

        const uniforms = {
            uTime: gl.getUniformLocation(program, 'uTime'),
            uColor: gl.getUniformLocation(program, 'uColor'),
            uResolution: gl.getUniformLocation(program, 'uResolution'),
            uMouse: gl.getUniformLocation(program, 'uMouse'),
            uAmplitude: gl.getUniformLocation(program, 'uAmplitude'),
            uSpeed: gl.getUniformLocation(program, 'uSpeed'),
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
        gl.useProgram(program)
        gl.enableVertexAttribArray(positionLocation)
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 16, 0)
        gl.enableVertexAttribArray(uvLocation)
        gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 16, 8)
        gl.uniform3f(uniforms.uColor, color[0], color[1], color[2])
        gl.uniform1f(uniforms.uAmplitude, amplitude)
        gl.uniform1f(uniforms.uSpeed, speed)

        const resize = () => {
            const rect = container.getBoundingClientRect()
            const dpr = Math.min(window.devicePixelRatio || 1, 2)
            const width = Math.max(1, Math.floor(rect.width * dpr))
            const height = Math.max(1, Math.floor(rect.height * dpr))

            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width
                canvas.height = height
                gl.viewport(0, 0, width, height)
                gl.uniform3f(uniforms.uResolution, width, height, width / height)
            }
        }

        const handlePointerMove = (event: PointerEvent) => {
            if (!mouseReact) return

            const rect = container.getBoundingClientRect()
            const x = rect.width ? (event.clientX - rect.left) / rect.width : 0.5
            const y = rect.height ? 1 - (event.clientY - rect.top) / rect.height : 0.5
            mouseRef.current = {
                x: Math.min(1, Math.max(0, x)),
                y: Math.min(1, Math.max(0, y)),
            }
        }

        const render = (time = 0) => {
            resize()
            gl.uniform1f(uniforms.uTime, time * 0.001)
            gl.uniform2f(uniforms.uMouse, mouseRef.current.x, mouseRef.current.y)
            gl.drawArrays(gl.TRIANGLES, 0, 6)
        }

        const observer = new ResizeObserver(() => render())
        observer.observe(container)
        if (mouseReact) window.addEventListener('pointermove', handlePointerMove, { passive: true })

        let raf = 0
        const start = performance.now()
        const loop = (time: number) => {
            render(time - start)
            raf = requestAnimationFrame(loop)
        }

        raf = requestAnimationFrame(loop)

        return () => {
            cancelAnimationFrame(raf)
            observer.disconnect()
            window.removeEventListener('pointermove', handlePointerMove)
            gl.deleteBuffer(buffer)
            gl.deleteProgram(program)
            canvas.remove()
        }
    }, [amplitude, color[0], color[1], color[2], mouseReact, speed])

    return <div ref={containerRef} className={`h-full w-full ${className}`.trim()} aria-hidden="true" />
}
