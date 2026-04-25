import DOMPurify from 'dompurify'
import { Marked, Renderer, type Tokens } from 'marked'

const BLOCK_TAGS = new Set(['div', 'p', 'section', 'article', 'li', 'blockquote', 'pre', 'table', 'tr', 'ul', 'ol'])
const TEXT_CONTAINER_TAGS = new Set(['br', 'div', 'p'])
const MERMAID_CDNS = [
    'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs',
    'https://esm.sh/mermaid@11',
]
const MATHJAX_CDN = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js'

type Footnote = {
    id: string
    body: string
}

let mermaidLoader: Promise<any> | null = null
let mathJaxLoader: Promise<void> | null = null

export function renderGitHubContent(content: string, searchTerm: string) {
    const source = shouldRenderAsMarkdown(content) ? markdownToHtml(htmlishToMarkdownText(content)) : content
    const sanitized = sanitizeContent(source)
    const mediaEnhanced = enhanceMedia(sanitized)
    return highlightHtml(mediaEnhanced, searchTerm)
}

export function isMarkdownContent(content: string) {
    return shouldRenderAsMarkdown(content)
}

export function contentToMarkdownSource(content: string) {
    return htmlishToMarkdownText(content)
}

export async function renderMermaidDiagrams(container: ParentNode) {
    await Promise.all([renderMermaidBlocks(container), renderMathExpressions(container)])
}

async function renderMermaidBlocks(container: ParentNode) {
    const nodes = Array.from(
        container.querySelectorAll<HTMLElement>('.github-mermaid:not([data-rendered])'),
    )
    if (nodes.length === 0) return

    let mermaid: any
    try {
        mermaid = await loadMermaid()
        mermaid.initialize({
            startOnLoad: false,
            securityLevel: 'strict',
            theme: 'neutral',
        })
    } catch {
        nodes.forEach((node) => markMermaidFallback(node))
        return
    }

    for (const node of nodes) {
        const code = decodeURIComponent(node.dataset.code || '')
        if (!code.trim()) continue

        try {
            const id = `dyeink-mermaid-${Math.random().toString(36).slice(2)}`
            const result = await mermaid.render(id, code)
            node.innerHTML = DOMPurify.sanitize(result.svg, {
                USE_PROFILES: { svg: true, svgFilters: true },
            })
            node.dataset.rendered = 'true'
        } catch {
            markMermaidFallback(node)
        }
    }
}

function markMermaidFallback(node: HTMLElement) {
    node.dataset.rendered = 'error'
    node.classList.add('github-mermaid-fallback')
}

async function renderMathExpressions(container: ParentNode) {
    if (typeof window === 'undefined') return
    if (!container.querySelector('.github-math')) return

    try {
        await loadMathJax()
        const mathJax = (window as any).MathJax
        await mathJax.typesetPromise([container])
    } catch {
        container.querySelectorAll<HTMLElement>('.github-math').forEach((node) => {
            node.classList.add('github-math-fallback')
        })
    }
}

function loadMermaid() {
    mermaidLoader ??= loadFirstMermaidCdn()
    return mermaidLoader
}

async function loadFirstMermaidCdn() {
    let lastError: unknown

    for (const url of MERMAID_CDNS) {
        try {
            const module = await (new Function('url', 'return import(url)') as (url: string) => Promise<any>)(url)
            return module.default || module
        } catch (error) {
            lastError = error
        }
    }

    throw lastError || new Error('Failed to load Mermaid')
}

function loadMathJax() {
    if (typeof window === 'undefined') return Promise.resolve()
    const existing = (window as any).MathJax
    if (existing?.typesetPromise) return Promise.resolve()

    mathJaxLoader ??= new Promise<void>((resolve, reject) => {
        ;(window as any).MathJax = {
            tex: {
                inlineMath: [['\\(', '\\)']],
                displayMath: [['\\[', '\\]']],
            },
            svg: { fontCache: 'global' },
        }

        const script = document.createElement('script')
        script.src = MATHJAX_CDN
        script.async = true
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('Failed to load MathJax'))
        document.head.appendChild(script)
    })

    return mathJaxLoader
}

function sanitizeContent(html: string) {
    return DOMPurify.sanitize(html, {
        ADD_TAGS: [
            'iframe',
            'picture',
            'source',
            'mark',
            'details',
            'summary',
            'sub',
            'sup',
            'ins',
            'kbd',
            'input',
            'figure',
            'figcaption',
            'del',
        ],
        ADD_ATTR: [
            'allow',
            'allowfullscreen',
            'align',
            'aria-label',
            'checked',
            'class',
            'data-code',
            'data-language',
            'data-rendered',
            'disabled',
            'frameborder',
            'height',
            'id',
            'loading',
            'name',
            'referrerpolicy',
            'rel',
            'src',
            'style',
            'target',
            'title',
            'type',
            'width',
        ],
    })
}

function shouldRenderAsMarkdown(content: string) {
    const markdownText = htmlishToMarkdownText(content)
    if (
        /\b(?:style|align)=["'][^"']*(?:text-align|justify|left|right|center)/i.test(content) &&
        !hasMarkdownSignal(markdownText)
    ) {
        return false
    }

    const tags = Array.from(content.matchAll(/<\/?([a-z][a-z0-9-]*)\b/gi)).map((match) =>
        match[1].toLowerCase(),
    )
    if (tags.length === 0) return true
    if (!tags.every((tag) => TEXT_CONTAINER_TAGS.has(tag))) return false
    return hasMarkdownSignal(markdownText)
}

function hasMarkdownSignal(text: string) {
    return /(^|\n)\s{0,3}(#{1,6}\s|```|~~~|\$\$|>\s|\|.+\||[-*+]\s+\[[ xX]\]|[-*+]\s+|\d+\.\s+|!\[[^\]]*]\(|\[.+]\(.+\)|---\s*$)|\$[^$\n]+\$/.test(
        text,
    )
}

function htmlishToMarkdownText(content: string) {
    return decodeHtmlEntities(
        content
            .replace(/<!--[\s\S]*?-->/g, '')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/([a-z][a-z0-9-]*)>/gi, (_, tag: string) =>
                BLOCK_TAGS.has(tag.toLowerCase()) ? '\n' : '',
            )
            .replace(/<[^>]+>/g, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim(),
    )
}

function markdownToHtml(markdown: string) {
    const { body, footnotes } = extractFootnotes(markdown)
    const withMath = replaceMath(body)
    const headingCounts = new Map<string, number>()
    const parser = new Marked({
        async: false,
        breaks: false,
        gfm: true,
        renderer: createRenderer(headingCounts),
    })
    let html = parser.parse(withMath, { async: false }) as string
    html = restoreMath(html)
    html = renderFootnoteRefs(html)
    if (footnotes.length > 0) html += renderFootnotes(footnotes)
    return html
}

function createRenderer(headingCounts: Map<string, number>) {
    const renderer = new Renderer()

    renderer.code = function ({ text, lang }: Tokens.Code) {
        const language = normalizeLanguage(lang)
        const escapedCode = escapeHtml(text)

        if (language === 'mermaid' || language === 'mmd') {
            return `<div class="github-mermaid" data-code="${escapeAttribute(
                encodeURIComponent(text),
            )}"><pre><code class="language-mermaid">${escapedCode}</code></pre></div>`
        }

        if (language === 'geojson' || language === 'topojson' || language === 'stl') {
            const label =
                language === 'stl'
                    ? 'ASCII STL model'
                    : language === 'geojson'
                      ? 'GeoJSON map data'
                      : 'TopoJSON map data'
            return `<figure class="github-diagram github-diagram-${language}"><figcaption>${label}</figcaption><pre><code class="language-${language}">${escapedCode}</code></pre></figure>`
        }

        const className = language ? ` class="language-${escapeAttribute(language)}"` : ''
        return `<pre><code${className}>${escapedCode}</code></pre>`
    }

    renderer.heading = function (this: Renderer, { tokens, depth }: Tokens.Heading) {
        const html = this.parser.parseInline(tokens) as string
        const id = uniqueSlug(stripHtml(html), headingCounts)
        return `<h${depth} id="${escapeAttribute(id)}">${html}</h${depth}>`
    }

    renderer.link = function (this: Renderer, { href, title, tokens }: Tokens.Link) {
        const text = this.parser.parseInline(tokens) as string
        const youtube = extractYouTubeId(href)
        if (youtube) return youtubeEmbed(youtube)

        const safeHref = escapeAttribute(href)
        const titleAttr = title ? ` title="${escapeAttribute(title)}"` : ''
        const externalAttrs = /^(https?:)?\/\//i.test(href) ? ' target="_blank" rel="noopener noreferrer"' : ''
        return `<a href="${safeHref}"${titleAttr}${externalAttrs}>${text}</a>`
    }

    renderer.image = function ({ href, title, text }: Tokens.Image) {
        const youtube = extractYouTubeId(href)
        if (youtube) return youtubeEmbed(youtube)

        const titleAttr = title ? ` title="${escapeAttribute(title)}"` : ''
        return `<img src="${escapeAttribute(href)}" alt="${escapeAttribute(text)}"${titleAttr} loading="lazy" />`
    }

    renderer.table = function (this: Renderer, token: Tokens.Table) {
        const header = token.header
            .map((cell) => renderTableCell(this, 'th', cell))
            .join('')
        const rows = token.rows
            .map((row) => `<tr>${row.map((cell) => renderTableCell(this, 'td', cell)).join('')}</tr>`)
            .join('')
        return `<table class="github-markdown-table"><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table>`
    }

    return renderer
}

function renderTableCell(renderer: Renderer, tag: 'th' | 'td', cell: Tokens.TableCell) {
    const align = cell.align ? ` style="text-align:${cell.align}"` : ''
    return `<${tag}${align}>${renderer.parser.parseInline(cell.tokens) as string}</${tag}>`
}

function normalizeLanguage(value?: string) {
    return (value || '').trim().split(/\s+/)[0]?.toLowerCase() || ''
}

const mathBlocks: string[] = []

function replaceMath(markdown: string) {
    mathBlocks.length = 0
    return markdown
        .replace(/^\$\$\s*\n([\s\S]*?)\n\$\$\s*$/gm, (_, math: string) =>
            stashMath(`<div class="github-math github-math-block">\\[${escapeHtml(math.trim())}\\]</div>`),
        )
        .replace(/\$`([^`]+)`\$/g, (_, math: string) =>
            stashMath(`<span class="github-math github-math-inline">\\(${escapeHtml(math)}\\)</span>`),
        )
        .replace(/(^|[^\\])\$([^$\n]+?)\$/g, (_, prefix: string, math: string) =>
            `${prefix}${stashMath(`<span class="github-math github-math-inline">\\(${escapeHtml(math)}\\)</span>`)}`,
        )
}

function stashMath(html: string) {
    const token = `DYEINK_MATH_${mathBlocks.length}`
    mathBlocks.push(html)
    return token
}

function restoreMath(html: string) {
    return mathBlocks.reduce(
        (result, block, index) => result.split(`DYEINK_MATH_${index}`).join(block),
        html,
    )
}

function extractFootnotes(markdown: string) {
    const footnotes: Footnote[] = []
    const lines = markdown.replace(/\r\n?/g, '\n').split('\n')
    const body: string[] = []

    for (let index = 0; index < lines.length; index += 1) {
        const match = lines[index].match(/^\[\^([^\]]+)]:\s*(.*)$/)
        if (!match) {
            body.push(lines[index])
            continue
        }

        const noteLines = [match[2]]
        while (index + 1 < lines.length && /^(?: {2,}|\t)/.test(lines[index + 1])) {
            index += 1
            noteLines.push(lines[index].replace(/^(?: {2,}|\t)/, ''))
        }
        footnotes.push({ id: match[1], body: noteLines.join('\n').trim() })
    }

    return { body: body.join('\n'), footnotes }
}

function renderFootnoteRefs(html: string) {
    return html.replace(/\[\^([^\]]+)]/g, (_, id: string) => {
        const slug = slugify(id)
        return `<sup><a href="#fn-${slug}" id="fnref-${slug}">[${escapeHtml(id)}]</a></sup>`
    })
}

function renderFootnotes(footnotes: Footnote[]) {
    const parser = new Marked({ async: false, gfm: true })
    return `<section class="github-footnotes"><ol>${footnotes
        .map((footnote) => {
            const slug = slugify(footnote.id)
            const body = parser.parseInline(footnote.body, { async: false }) as string
            return `<li id="fn-${slug}">${body} <a href="#fnref-${slug}" aria-label="Back to content">↩</a></li>`
        })
        .join('')}</ol></section>`
}

function enhanceMedia(html: string) {
    if (typeof document === 'undefined') return html

    const template = document.createElement('template')
    template.innerHTML = html

    template.content.querySelectorAll('blockquote').forEach(transformAlertBlockquote)

    template.content.querySelectorAll('iframe').forEach((iframe) => {
        const youtube = extractYouTubeId(iframe.getAttribute('src') || '')
        if (!youtube) {
            iframe.remove()
            return
        }
        const wrapper = iframe.closest('.github-youtube-embed')
        if (wrapper) {
            wrapper.replaceWith(youtubeEmbedNode(youtube))
        } else {
            iframe.replaceWith(youtubeEmbedNode(youtube))
        }
    })

    template.content.querySelectorAll('a[href]').forEach((anchor) => {
        const href = anchor.getAttribute('href') || ''
        const youtube = extractYouTubeId(href)
        if (!youtube) return
        anchor.replaceWith(youtubeEmbedNode(youtube))
    })

    template.content.querySelectorAll('p, div').forEach((node) => {
        if (node.children.length > 0) return
        const youtube = extractYouTubeId(node.textContent?.trim() || '')
        if (youtube) node.replaceWith(youtubeEmbedNode(youtube))
    })

    template.content.querySelectorAll('img').forEach((image) => {
        image.setAttribute('loading', 'lazy')
        if (!image.getAttribute('alt')) image.setAttribute('alt', '')
    })

    template.content.querySelectorAll('ul').forEach((list) => {
        if (list.querySelector('input[type="checkbox"]')) list.classList.add('github-task-list')
    })
    template.content.querySelectorAll('li').forEach((item) => {
        if (item.querySelector(':scope > input[type="checkbox"]')) item.classList.add('github-task-list-item')
    })

    return template.innerHTML
}

function transformAlertBlockquote(blockquote: HTMLQuoteElement) {
    const first = blockquote.querySelector('p')
    const text = first?.textContent?.trim() || ''
    const match = text.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)]/i)
    if (!match) return

    const type = match[1].toLowerCase()
    const alert = document.createElement('div')
    alert.className = `github-alert github-alert-${type}`

    const title = document.createElement('div')
    title.className = 'github-alert-title'
    title.textContent = match[1].toUpperCase()
    alert.append(title)

    if (first) {
        first.textContent = text.replace(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)]\s*/i, '')
        if (!first.textContent.trim()) first.remove()
    }
    while (blockquote.firstChild) alert.append(blockquote.firstChild)
    blockquote.replaceWith(alert)
}

function youtubeEmbedNode(videoId: string) {
    const wrapper = document.createElement('div')
    wrapper.className = 'github-youtube-embed'
    wrapper.innerHTML = youtubeIframe(videoId)
    return wrapper
}

function youtubeEmbed(videoId: string) {
    return `<div class="github-youtube-embed">${youtubeIframe(videoId)}</div>`
}

function youtubeIframe(videoId: string) {
    return `<iframe src="https://www.youtube-nocookie.com/embed/${escapeAttribute(
        videoId,
    )}" title="YouTube video player" loading="lazy" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`
}

function extractYouTubeId(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return null

    try {
        const url = new URL(trimmed)
        const host = url.hostname.replace(/^www\./, '')
        if (host === 'youtu.be') return cleanYouTubeId(url.pathname.slice(1))
        if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
            if (url.pathname === '/watch') return cleanYouTubeId(url.searchParams.get('v') || '')
            const match = url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?#]+)/)
            if (match) return cleanYouTubeId(match[1])
        }
    } catch {
        return null
    }

    return null
}

function cleanYouTubeId(value: string) {
    const id = value.trim()
    return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null
}

function highlightHtml(html: string, searchTerm: string) {
    const terms = searchTerm
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(escapeRegExp)

    if (terms.length === 0 || typeof document === 'undefined') return html

    const pattern = new RegExp(terms.join('|'), 'gi')
    const template = document.createElement('template')
    template.innerHTML = html

    const highlightTextNode = (node: Text) => {
        const text = node.nodeValue || ''
        const matches = Array.from(text.matchAll(pattern))
        if (matches.length === 0) return

        const fragment = document.createDocumentFragment()
        let cursor = 0

        for (const match of matches) {
            const at = match.index ?? 0
            if (at > cursor) fragment.append(document.createTextNode(text.slice(cursor, at)))

            const mark = document.createElement('mark')
            mark.className = 'blog-search-highlight'
            mark.textContent = match[0]
            fragment.append(mark)
            cursor = at + match[0].length
        }

        if (cursor < text.length) fragment.append(document.createTextNode(text.slice(cursor)))
        node.parentNode?.replaceChild(fragment, node)
    }

    const walk = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            highlightTextNode(node as Text)
            return
        }
        if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return
        if (node.nodeType === Node.ELEMENT_NODE) {
            const tagName = (node as Element).tagName
            if (tagName === 'SCRIPT' || tagName === 'STYLE' || tagName === 'MARK' || tagName === 'IFRAME') return
        }
        Array.from(node.childNodes).forEach(walk)
    }

    walk(template.content)
    return template.innerHTML
}

function stripHtml(value: string) {
    return decodeHtmlEntities(value.replace(/<[^>]+>/g, ''))
}

function uniqueSlug(value: string, counts: Map<string, number>) {
    const base = slugify(value) || 'section'
    const count = counts.get(base) || 0
    counts.set(base, count + 1)
    return count === 0 ? base : `${base}-${count}`
}

function slugify(value: string) {
    return value
        .toLowerCase()
        .trim()
        .replace(/<[^>]+>/g, '')
        .replace(/[^\p{L}\p{N}\s-]/gu, '')
        .replace(/\s+/g, '-')
}

function escapeHtml(value: string) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

function escapeAttribute(value: string) {
    return escapeHtml(value.trim())
}

function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function decodeHtmlEntities(value: string) {
    if (typeof document !== 'undefined') {
        const textarea = document.createElement('textarea')
        textarea.innerHTML = value
        return textarea.value
    }

    return value
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
}
