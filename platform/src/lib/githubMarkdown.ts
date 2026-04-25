import DOMPurify from 'dompurify'

const BLOCK_TAGS = new Set(['div', 'p', 'section', 'article', 'li', 'blockquote', 'pre', 'table', 'tr', 'ul', 'ol'])
const TEXT_CONTAINER_TAGS = new Set(['br', 'div', 'p'])
const RAW_HTML_BLOCK = /^<\/?(details|summary|sub|sup|ins|kbd|br|img|picture|source|table|thead|tbody|tr|td|th|div|span|p|a)\b/i
const MERMAID_CDN = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs'
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
        nodes.forEach((node) => {
            node.dataset.rendered = 'error'
            node.classList.add('github-mermaid-fallback')
        })
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
            node.dataset.rendered = 'error'
            node.classList.add('github-mermaid-fallback')
        }
    }
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
    mermaidLoader ??= (new Function('url', 'return import(url)') as (url: string) => Promise<any>)(
        MERMAID_CDN,
    ).then((module) => module.default || module)
    return mermaidLoader
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
        ],
        ADD_ATTR: [
            'allow',
            'allowfullscreen',
            'aria-label',
            'checked',
            'class',
            'data-code',
            'data-language',
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
    const tags = Array.from(content.matchAll(/<\/?([a-z][a-z0-9-]*)\b/gi)).map((match) =>
        match[1].toLowerCase(),
    )
    if (tags.length === 0) return true
    if (!tags.every((tag) => TEXT_CONTAINER_TAGS.has(tag))) return false
    return hasMarkdownSignal(htmlishToMarkdownText(content))
}

function hasMarkdownSignal(text: string) {
    return /(^|\n)\s{0,3}(#{1,6}\s|```|\$\$|>\s|\|.+\||[-*+]\s+\[[ xX]\]|[-*+]\s+|\d+\.\s+|!\[[^\]]*]\(|\[.+]\(.+\)|---\s*$)|\$[^$\n]+\$/.test(
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
    const footnotes: Footnote[] = []
    const lines = markdown
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .filter((line) => {
            const match = line.match(/^\[\^([^\]]+)]:\s+(.+)$/)
            if (!match) return true
            footnotes.push({ id: match[1], body: match[2] })
            return false
        })

    const html: string[] = []
    const headingCounts = new Map<string, number>()
    let index = 0

    while (index < lines.length) {
        const line = lines[index]

        if (!line.trim()) {
            index += 1
            continue
        }

        const fence = line.match(/^```([a-zA-Z0-9_-]+)?\s*$/)
        if (fence) {
            const language = (fence[1] || '').toLowerCase()
            const code: string[] = []
            index += 1
            while (index < lines.length && !/^```\s*$/.test(lines[index])) {
                code.push(lines[index])
                index += 1
            }
            if (index < lines.length) index += 1
            html.push(renderFence(language, code.join('\n')))
            continue
        }

        if (/^\$\$\s*$/.test(line.trim())) {
            const math: string[] = []
            index += 1
            while (index < lines.length && !/^\$\$\s*$/.test(lines[index].trim())) {
                math.push(lines[index])
                index += 1
            }
            if (index < lines.length) index += 1
            html.push(renderMathBlock(math.join('\n')))
            continue
        }

        const inlineMathBlock = line.trim().match(/^\$\$([\s\S]+)\$\$$/)
        if (inlineMathBlock) {
            html.push(renderMathBlock(inlineMathBlock[1].trim()))
            index += 1
            continue
        }

        if (RAW_HTML_BLOCK.test(line.trim())) {
            const raw: string[] = []
            while (index < lines.length && lines[index].trim()) {
                raw.push(lines[index])
                index += 1
            }
            html.push(raw.join('\n'))
            continue
        }

        const heading = line.match(/^(#{1,6})\s+(.+)$/)
        if (heading) {
            const level = heading[1].length
            const text = stripInlineMarkdown(heading[2])
            const id = uniqueSlug(text, headingCounts)
            html.push(`<h${level} id="${id}">${renderInline(heading[2])}</h${level}>`)
            index += 1
            continue
        }

        if (/^\s{0,3}(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
            html.push('<hr />')
            index += 1
            continue
        }

        if (isTableStart(lines, index)) {
            const tableLines: string[] = [lines[index], lines[index + 1]]
            index += 2
            while (index < lines.length && /\|/.test(lines[index]) && lines[index].trim()) {
                tableLines.push(lines[index])
                index += 1
            }
            html.push(renderTable(tableLines))
            continue
        }

        if (/^\s{0,3}>\s?/.test(line)) {
            const quoteLines: string[] = []
            while (index < lines.length && /^\s{0,3}>\s?/.test(lines[index])) {
                quoteLines.push(lines[index].replace(/^\s{0,3}>\s?/, ''))
                index += 1
            }
            html.push(renderBlockquote(quoteLines.join('\n')))
            continue
        }

        if (isListLine(line)) {
            const listLines: string[] = []
            const ordered = /^\s*\d+\.\s+/.test(line)
            while (index < lines.length && isListLine(lines[index]) && /^\s*\d+\.\s+/.test(lines[index]) === ordered) {
                listLines.push(lines[index])
                index += 1
            }
            html.push(renderList(listLines, ordered))
            continue
        }

        const paragraph: string[] = [line]
        index += 1
        while (index < lines.length && lines[index].trim() && !isBlockStart(lines, index)) {
            paragraph.push(lines[index])
            index += 1
        }
        html.push(renderParagraph(paragraph))
    }

    if (footnotes.length > 0) {
        html.push(renderFootnotes(footnotes))
    }

    return html.join('\n')
}

function renderFence(language: string, code: string) {
    const escapedCode = escapeHtml(code)

    if (language === 'mermaid' || language === 'mmd') {
        return `<div class="github-mermaid" data-code="${escapeHtml(encodeURIComponent(code))}"><pre><code>${escapedCode}</code></pre></div>`
    }

    if (language === 'geojson' || language === 'topojson' || language === 'stl') {
        const label =
            language === 'stl'
                ? 'ASCII STL model'
                : language === 'geojson'
                  ? 'GeoJSON map data'
                  : 'TopoJSON map data'
        return `<figure class="github-diagram github-diagram-${language}"><figcaption>${label}</figcaption><pre><code>${escapedCode}</code></pre></figure>`
    }

    const className = language ? ` class="language-${escapeHtml(language)}"` : ''
    return `<pre><code${className}>${escapedCode}</code></pre>`
}

function renderMathBlock(value: string) {
    return `<div class="github-math github-math-block">\\[${escapeHtml(value)}\\]</div>`
}

function renderBlockquote(value: string) {
    const alert = value.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)]\s*\n?([\s\S]*)$/i)
    if (alert) {
        const type = alert[1].toLowerCase()
        return `<div class="github-alert github-alert-${type}"><div class="github-alert-title">${escapeHtml(
            alert[1].toUpperCase(),
        )}</div>${markdownToHtml(alert[2].trim())}</div>`
    }
    return `<blockquote>${markdownToHtml(value)}</blockquote>`
}

function renderList(lines: string[], ordered: boolean) {
    const items = lines
        .map((line) => {
            const content = line.replace(/^\s*(?:[-*+]|\d+\.)\s+/, '')
            const task = content.match(/^\[([ xX])]\s+(.+)$/)
            if (task) {
                const checked = task[1].toLowerCase() === 'x' ? ' checked' : ''
                return `<li class="github-task-list-item"><input type="checkbox" disabled${checked} /> ${renderInline(
                    task[2],
                )}</li>`
            }
            return `<li>${renderInline(content)}</li>`
        })
        .join('')
    const tag = ordered ? 'ol' : 'ul'
    const className = lines.some((line) => /^\s*(?:[-*+]|\d+\.)\s+\[[ xX]]/.test(line))
        ? ' class="github-task-list"'
        : ''
    return `<${tag}${className}>${items}</${tag}>`
}

function renderTable(lines: string[]) {
    const header = splitTableRow(lines[0])
    const alignments = splitTableRow(lines[1]).map((cell) => {
        const left = cell.startsWith(':')
        const right = cell.endsWith(':')
        if (left && right) return 'center'
        if (right) return 'right'
        return left ? 'left' : ''
    })
    const body = lines.slice(2).map(splitTableRow)

    return `<table class="github-markdown-table"><thead><tr>${header
        .map((cell, index) => tableCell('th', cell, alignments[index]))
        .join('')}</tr></thead><tbody>${body
        .map((row) => `<tr>${row.map((cell, index) => tableCell('td', cell, alignments[index])).join('')}</tr>`)
        .join('')}</tbody></table>`
}

function renderParagraph(lines: string[]) {
    const text = lines.join('\n').trim()
    const youtube = extractYouTubeId(text)
    if (youtube) return youtubeEmbed(youtube)
    return `<p>${lines.map(renderInline).join('<br />')}</p>`
}

function renderFootnotes(footnotes: Footnote[]) {
    return `<section class="github-footnotes"><ol>${footnotes
        .map(
            (footnote) =>
                `<li id="fn-${escapeHtml(slugify(footnote.id))}">${renderInline(footnote.body)}</li>`,
        )
        .join('')}</ol></section>`
}

function renderInline(raw: string) {
    const placeholders: string[] = []
    const stash = (html: string) => {
        const token = `\u0000${placeholders.length}\u0000`
        placeholders.push(html)
        return token
    }

    let value = raw.replace(/\$`([^`]+)`\$/g, (_, math: string) =>
        stash(`<span class="github-math github-math-inline">\\(${escapeHtml(math)}\\)</span>`),
    )
    value = value.replace(/`([^`]+)`/g, (_, code: string) => stash(`<code>${escapeHtml(code)}</code>`))
    value = value.replace(/(^|[^\\])\$([^$\n]+?)\$/g, (_, prefix: string, math: string) =>
        `${prefix}${stash(`<span class="github-math github-math-inline">\\(${escapeHtml(math)}\\)</span>`)}`,
    )
    value = value.replace(/!\[([^\]]*)]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, alt: string, url: string) => {
        const youtube = extractYouTubeId(url)
        if (youtube) return stash(youtubeEmbed(youtube))
        return stash(`<img src="${escapeAttribute(url)}" alt="${escapeAttribute(alt)}" loading="lazy" />`)
    })
    value = value.replace(/\[([^\]]+)]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, label: string, url: string) =>
        stash(`<a href="${escapeAttribute(url)}" target="_blank" rel="noopener noreferrer">${renderInline(label)}</a>`),
    )
    value = escapeHtml(value)
    value = value.replace(/\[\^([^\]]+)]/g, (_, id: string) => {
        const slug = slugify(id)
        return `<sup><a href="#fn-${slug}">[${escapeHtml(id)}]</a></sup>`
    })
    value = value.replace(/~~(.+?)~~/g, '<del>$1</del>')
    value = value.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    value = value.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    value = value.replace(/(^|[^*])\*(?!\s)([^*]+?)\*/g, '$1<em>$2</em>')
    value = value.replace(/(^|[^_])_(?!\s)([^_]+?)_/g, '$1<em>$2</em>')
    value = value.replace(/(^|\s)(https?:\/\/[^\s<]+)/g, (_, prefix: string, url: string) =>
        `${prefix}${stash(`<a href="${escapeAttribute(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>`)}`,
    )

    return placeholders.reduce((result, html, index) => result.split(`\u0000${index}\u0000`).join(html), value)
}

function enhanceMedia(html: string) {
    if (typeof document === 'undefined') return html

    const template = document.createElement('template')
    template.innerHTML = html

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

    return template.innerHTML
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

function isBlockStart(lines: string[], index: number) {
    const line = lines[index]
    return (
        /^```/.test(line) ||
        /^(#{1,6})\s+/.test(line) ||
        /^\s{0,3}>\s?/.test(line) ||
        isListLine(line) ||
        isTableStart(lines, index) ||
        /^\s{0,3}(-{3,}|\*{3,}|_{3,})\s*$/.test(line)
    )
}

function isListLine(line: string) {
    return /^\s*(?:[-*+]|\d+\.)\s+/.test(line)
}

function isTableStart(lines: string[], index: number) {
    return (
        index + 1 < lines.length &&
        /\|/.test(lines[index]) &&
        /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index + 1])
    )
}

function splitTableRow(line: string) {
    return line
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((cell) => cell.trim())
}

function tableCell(tag: 'td' | 'th', value: string, align?: string) {
    const style = align ? ` style="text-align:${align}"` : ''
    return `<${tag}${style}>${renderInline(value)}</${tag}>`
}

function stripInlineMarkdown(value: string) {
    return value
        .replace(/`([^`]+)`/g, '$1')
        .replace(/!\[([^\]]*)]\([^)]+\)/g, '$1')
        .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
        .replace(/[*_~]/g, '')
        .trim()
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
