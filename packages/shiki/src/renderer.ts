import { IThemedToken } from './themedTokenizer'

export interface HtmlRendererOptions {
  langId?: string
  bg?: string
  colorMap: string[]
}

function createMap(colorMapArray) {
  return colorMapArray.reduce((acc, curr, index) => {
    if (curr) {
      acc[curr] = `s-c-${index}`
    }
    return acc
  }, {})
}
export function renderToSVG(
  lines: IThemedToken[][],
  options: HtmlRendererOptions = { colorMap: [] }
) {
  const map = createMap(options.colorMap)
  const markup = `
   <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
     <style>
       ${Object.keys(map)
         .map(color => `.${map[color]}{ fill: ${color};}`)
         .join('')}
     </style>
     <rect width="100%" height="100%" fill="${options.bg || '#fff'}" />
     ${lines
       .map((line: any[], index: number) => {
         if (!line.length) return ''
         return `<text x="${
           line[0].content.trim() === '' ? 10 + 5 * line[0].content.length : 10
         }" y="${16 * (index + 1)}">
         <tspan>
          ${line
            .map(token =>
              token.content.trim() === ''
                ? token.content
                : `<tspan class="${map[token.color]}">${escapeHtml(token.content)}</tspan>`
            )
            .join('')}
            </tspan>
            </text>`
       })
       .join('')}
   </svg>
  `
  console.log(markup)
  return markup
}
export function renderToHtml(
  lines: IThemedToken[][],
  options: HtmlRendererOptions = { colorMap: [] }
) {
  const bg = options.bg || '#fff'

  let html = ''

  html += `<pre class="shiki" style="background-color: ${bg}">`
  if (options.langId) {
    html += `<div class="language-id">${options.langId}</div>`
  }
  html += `<code>`

  lines.forEach((l: any[]) => {
    if (l.length === 0) {
      html += `\n`
    } else {
      l.forEach(token => {
        html += `<span style="color: ${token.color}">${escapeHtml(token.content)}</span>`
      })
      html += `\n`
    }
  })
  html = html.replace(/\n*$/, '') // Get rid of final new lines
  html += `</code></pre>`

  return html
}

function escapeHtml(html: string) {
  return html.replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

