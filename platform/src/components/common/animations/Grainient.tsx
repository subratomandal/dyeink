import { useEffect, useRef } from 'react'

interface GrainientProps {
    timeSpeed?: number
    colorBalance?: number
    warpStrength?: number
    warpFrequency?: number
    warpSpeed?: number
    warpAmplitude?: number
    blendAngle?: number
    blendSoftness?: number
    rotationAmount?: number
    noiseScale?: number
    grainAmount?: number
    grainScale?: number
    grainAnimated?: boolean
    contrast?: number
    gamma?: number
    saturation?: number
    centerX?: number
    centerY?: number
    zoom?: number
    color1?: string
    color2?: string
    color3?: string
    className?: string
}

const vertexShaderSource = `#version 300 es
in vec2 position;

void main() {
    gl_Position = vec4(position, 0.0, 1.0);
}
`

const fragmentShaderSource = `#version 300 es
precision highp float;

uniform vec2 iResolution;
uniform float iTime;
uniform float uTimeSpeed;
uniform float uColorBalance;
uniform float uWarpStrength;
uniform float uWarpFrequency;
uniform float uWarpSpeed;
uniform float uWarpAmplitude;
uniform float uBlendAngle;
uniform float uBlendSoftness;
uniform float uRotationAmount;
uniform float uNoiseScale;
uniform float uGrainAmount;
uniform float uGrainScale;
uniform float uGrainAnimated;
uniform float uContrast;
uniform float uGamma;
uniform float uSaturation;
uniform vec2 uCenterOffset;
uniform float uZoom;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;

out vec4 fragColor;

#define S(a,b,t) smoothstep(a,b,t)

mat2 Rot(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
}

vec2 hash(vec2 p) {
    p = vec2(dot(p, vec2(2127.1, 81.17)), dot(p, vec2(1269.5, 283.37)));
    return fract(sin(p) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);

    float a = dot(-1.0 + 2.0 * hash(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0));
    float b = dot(-1.0 + 2.0 * hash(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
    float c = dot(-1.0 + 2.0 * hash(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
    float d = dot(-1.0 + 2.0 * hash(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));

    return 0.5 + 0.5 * mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

void mainImage(out vec4 o, vec2 C) {
    float t = iTime * uTimeSpeed;
    vec2 uv = C / iResolution.xy;
    float ratio = iResolution.x / iResolution.y;
    vec2 tuv = uv - 0.5 + uCenterOffset;
    tuv /= max(uZoom, 0.001);

    float degree = noise(vec2(t * 0.1, tuv.x * tuv.y) * uNoiseScale);
    tuv.y *= 1.0 / ratio;
    tuv *= Rot(radians((degree - 0.5) * uRotationAmount + 180.0));
    tuv.y *= ratio;

    float frequency = uWarpFrequency;
    float ws = max(uWarpStrength, 0.001);
    float amplitude = uWarpAmplitude / ws;
    float warpTime = t * uWarpSpeed;
    tuv.x += sin(tuv.y * frequency + warpTime) / amplitude;
    tuv.y += sin(tuv.x * (frequency * 1.5) + warpTime) / (amplitude * 0.5);

    float b = uColorBalance;
    float s = max(uBlendSoftness, 0.0);
    mat2 blendRot = Rot(radians(uBlendAngle));
    float blendX = (tuv * blendRot).x;
    float edge0 = -0.3 - b - s;
    float edge1 = 0.2 - b + s;
    float v0 = 0.5 - b + s;
    float v1 = -0.3 - b - s;

    vec3 layer1 = mix(uColor3, uColor2, S(edge0, edge1, blendX));
    vec3 layer2 = mix(uColor2, uColor1, S(edge0, edge1, blendX));
    vec3 col = mix(layer1, layer2, S(v0, v1, tuv.y));

    vec2 grainUv = uv * max(uGrainScale, 0.001);
    if (uGrainAnimated > 0.5) grainUv += vec2(iTime * 0.05);
    float grain = fract(sin(dot(grainUv, vec2(12.9898, 78.233))) * 43758.5453);
    col += (grain - 0.5) * uGrainAmount;

    col = (col - 0.5) * uContrast + 0.5;
    float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = mix(vec3(luma), col, uSaturation);
    col = pow(max(col, 0.0), vec3(1.0 / max(uGamma, 0.001)));
    col = clamp(col, 0.0, 1.0);

    o = vec4(col, 1.0);
}

void main() {
    vec4 color = vec4(0.0);
    mainImage(color, gl_FragCoord.xy);
    fragColor = color;
}
`

function hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) return [1, 1, 1]

    return [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255,
    ]
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string) {
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

function createProgram(gl: WebGL2RenderingContext) {
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

export default function Grainient({
    timeSpeed = 0.25,
    colorBalance = 0,
    warpStrength = 1,
    warpFrequency = 5,
    warpSpeed = 2,
    warpAmplitude = 50,
    blendAngle = 0,
    blendSoftness = 0.05,
    rotationAmount = 500,
    noiseScale = 2,
    grainAmount = 0.1,
    grainScale = 2,
    grainAnimated = false,
    contrast = 1.5,
    gamma = 1,
    saturation = 1,
    centerX = 0,
    centerY = 0,
    zoom = 0.9,
    color1 = '#ffffff',
    color2 = '#050505',
    color3 = '#777777',
    className = '',
}: GrainientProps) {
    const containerRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const canvas = document.createElement('canvas')
        const gl = canvas.getContext('webgl2', {
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

        const buffer = gl.createBuffer()
        const positionLocation = gl.getAttribLocation(program, 'position')
        const uniforms = {
            iResolution: gl.getUniformLocation(program, 'iResolution'),
            iTime: gl.getUniformLocation(program, 'iTime'),
            uTimeSpeed: gl.getUniformLocation(program, 'uTimeSpeed'),
            uColorBalance: gl.getUniformLocation(program, 'uColorBalance'),
            uWarpStrength: gl.getUniformLocation(program, 'uWarpStrength'),
            uWarpFrequency: gl.getUniformLocation(program, 'uWarpFrequency'),
            uWarpSpeed: gl.getUniformLocation(program, 'uWarpSpeed'),
            uWarpAmplitude: gl.getUniformLocation(program, 'uWarpAmplitude'),
            uBlendAngle: gl.getUniformLocation(program, 'uBlendAngle'),
            uBlendSoftness: gl.getUniformLocation(program, 'uBlendSoftness'),
            uRotationAmount: gl.getUniformLocation(program, 'uRotationAmount'),
            uNoiseScale: gl.getUniformLocation(program, 'uNoiseScale'),
            uGrainAmount: gl.getUniformLocation(program, 'uGrainAmount'),
            uGrainScale: gl.getUniformLocation(program, 'uGrainScale'),
            uGrainAnimated: gl.getUniformLocation(program, 'uGrainAnimated'),
            uContrast: gl.getUniformLocation(program, 'uContrast'),
            uGamma: gl.getUniformLocation(program, 'uGamma'),
            uSaturation: gl.getUniformLocation(program, 'uSaturation'),
            uCenterOffset: gl.getUniformLocation(program, 'uCenterOffset'),
            uZoom: gl.getUniformLocation(program, 'uZoom'),
            uColor1: gl.getUniformLocation(program, 'uColor1'),
            uColor2: gl.getUniformLocation(program, 'uColor2'),
            uColor3: gl.getUniformLocation(program, 'uColor3'),
        }
        const colorA = hexToRgb(color1)
        const colorB = hexToRgb(color2)
        const colorC = hexToRgb(color3)

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
        gl.useProgram(program)
        gl.enableVertexAttribArray(positionLocation)
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)
        gl.uniform1f(uniforms.uTimeSpeed, timeSpeed)
        gl.uniform1f(uniforms.uColorBalance, colorBalance)
        gl.uniform1f(uniforms.uWarpStrength, warpStrength)
        gl.uniform1f(uniforms.uWarpFrequency, warpFrequency)
        gl.uniform1f(uniforms.uWarpSpeed, warpSpeed)
        gl.uniform1f(uniforms.uWarpAmplitude, warpAmplitude)
        gl.uniform1f(uniforms.uBlendAngle, blendAngle)
        gl.uniform1f(uniforms.uBlendSoftness, blendSoftness)
        gl.uniform1f(uniforms.uRotationAmount, rotationAmount)
        gl.uniform1f(uniforms.uNoiseScale, noiseScale)
        gl.uniform1f(uniforms.uGrainAmount, grainAmount)
        gl.uniform1f(uniforms.uGrainScale, grainScale)
        gl.uniform1f(uniforms.uGrainAnimated, grainAnimated ? 1 : 0)
        gl.uniform1f(uniforms.uContrast, contrast)
        gl.uniform1f(uniforms.uGamma, gamma)
        gl.uniform1f(uniforms.uSaturation, saturation)
        gl.uniform2f(uniforms.uCenterOffset, centerX, centerY)
        gl.uniform1f(uniforms.uZoom, zoom)
        gl.uniform3f(uniforms.uColor1, colorA[0], colorA[1], colorA[2])
        gl.uniform3f(uniforms.uColor2, colorB[0], colorB[1], colorB[2])
        gl.uniform3f(uniforms.uColor3, colorC[0], colorC[1], colorC[2])

        const resize = () => {
            const rect = container.getBoundingClientRect()
            const dpr = Math.min(window.devicePixelRatio || 1, 2)
            const width = Math.max(1, Math.floor(rect.width * dpr))
            const height = Math.max(1, Math.floor(rect.height * dpr))

            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width
                canvas.height = height
                gl.viewport(0, 0, width, height)
                gl.uniform2f(uniforms.iResolution, width, height)
            }
        }

        const render = (time = 0) => {
            resize()
            gl.uniform1f(uniforms.iTime, time * 0.001)
            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }

        const observer = new ResizeObserver(() => render())
        observer.observe(container)
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
            gl.deleteBuffer(buffer)
            gl.deleteProgram(program)
            canvas.remove()
        }
    }, [
        blendAngle,
        blendSoftness,
        centerX,
        centerY,
        color1,
        color2,
        color3,
        colorBalance,
        contrast,
        gamma,
        grainAmount,
        grainAnimated,
        grainScale,
        noiseScale,
        rotationAmount,
        saturation,
        timeSpeed,
        warpAmplitude,
        warpFrequency,
        warpSpeed,
        warpStrength,
        zoom,
    ])

    return <div ref={containerRef} className={`relative h-full w-full overflow-hidden ${className}`.trim()} aria-hidden="true" />
}
