import { Registry } from 'vscode-textmate'
import { JSDOM } from 'jsdom'
import * as d2i from 'dom-to-image'

import {
  TLang,
  commonLangIds,
  commonLangAliases,
  ILanguageRegistration,
  getLangRegistrations
} from 'shiki-languages'

import { Resolver } from './resolver'
import { getOnigasm } from './onigLibs'
import { tokenizeWithTheme, IThemedToken } from './themedTokenizer'
import { renderToSVG, renderToHtml } from './renderer'

import { getTheme, TTheme, IShikiTheme } from 'shiki-themes'

export interface HighlighterOptions {
  theme: TTheme | IShikiTheme
  langs?: TLang[]
}

export async function getHighlighter(options: HighlighterOptions) {
  let t: IShikiTheme
  if (typeof options.theme === 'string') {
    t = getTheme(options.theme)
  } else if (options.theme.name) {
    t = options.theme
  } else {
    t = getTheme('nord')
  }

  let langs: TLang[] = [...commonLangIds, ...commonLangAliases]

  if (options.langs) {
    langs = options.langs
  }

  const langRegistrations = getLangRegistrations(langs)

  const s = new Shiki(t, langRegistrations)
  return await s.getHighlighter()
}

class Shiki {
  private _resolver: Resolver
  private _registry: Registry

  private _theme: IShikiTheme
  private _colorMap: string[]
  private _langs: ILanguageRegistration[]

  constructor(theme: IShikiTheme, langs: ILanguageRegistration[]) {
    this._resolver = new Resolver(langs, getOnigasm(), 'onigasm')
    this._registry = new Registry(this._resolver)

    this._registry.setTheme(theme)

    this._theme = theme
    this._colorMap = this._registry.getColorMap()

    this._langs = langs
  }

  codeToThemedTokens(code, lang, ltog) {
    if (isPlaintext(lang)) {
      throw Error('Cannot tokenize plaintext')
    }
    if (!ltog[lang]) {
      throw Error(`No language registration for ${lang}`)
    }
    return tokenizeWithTheme(this._theme, this._colorMap, code, ltog[lang])
  }

  codeToHtml(code, lang, ltog) {
    if (isPlaintext(lang)) {
      return renderToHtml([[{ content: code }]], {
        bg: this._theme.bg,
        colorMap: this._colorMap
      })
    }

    const tokens = this.codeToThemedTokens(code, lang, ltog)
    return renderToHtml(tokens, {
      bg: this._theme.bg,
      colorMap: this._colorMap
    })
  }

  codeToSvg(code, lang, ltog) {
    if (isPlaintext(lang)) {
      return renderToSVG([[{ content: code }]], {
        bg: this._theme.bg,
        colorMap: this._colorMap
      })
    }

    const tokens = this.codeToThemedTokens(code, lang, ltog)
    return renderToSVG(tokens, {
      bg: this._theme.bg,
      colorMap: this._colorMap
    })
  }

  async getHighlighter(): Promise<Highlighter> {
    const ltog = {}

    await Promise.all(
      this._langs.map(async l => {
        const g = await this._registry.loadGrammar(l.scopeName)
        ltog[l.id] = g
        l.aliases.forEach(la => {
          ltog[la] = g
        })
      })
    )

    return {
      codeToThemedTokens: (code, lang) => this.codeToThemedTokens(code, lang, ltog),
      codeToSVG: (code, lang) => this.codeToSvg(code, lang, ltog),
      codeToHtml: (code, lang) => this.codeToHtml(code, lang, ltog)
    }
  }
}

function isPlaintext(lang) {
  return ['plaintext', 'txt', 'text'].indexOf(lang) !== -1
}

export interface Highlighter {
  codeToThemedTokens(code: string, lang: TLang): IThemedToken[][]
  codeToHtml?(code: string, lang: TLang): string

  // codeToRawHtml?(code: string): string
  // getRawCSS?(): string

  codeToSVG?(code: string, lang: TLang): string
  // codeToImage?(): string
}
