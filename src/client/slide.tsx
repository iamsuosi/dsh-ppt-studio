import { h } from './react.js'
import { resolveTheme } from '../themes.js'
import type { PptStudioSlide, PptStudioThemeId } from '../types.js'

/**
 * One slide, laid out like src/engine.ts renderHtmlSlide but in container units (vh → cqh),
 * so the same markup works for the stage, the filmstrip and theme previews at any size.
 */
export function SlideView(props: { slide: PptStudioSlide; index: number; total: number; theme: PptStudioThemeId }) {
  const { slide, index, total } = props
  const theme = resolveTheme(props.theme)
  const p = theme.palette
  const style = {
    '--s-bg': `#${p.bg}`,
    '--s-fg': `#${p.fg}`,
    '--s-muted': `#${p.muted}`,
    '--s-accent': `#${p.accent}`,
    '--s-accent2': `#${p.accent2}`,
    '--s-hf': `'${theme.fonts.heading}', system-ui, sans-serif`,
    '--s-bf': `'${theme.fonts.body}', system-ui, sans-serif`,
  } as Record<string, string>

  let inner
  switch (slide.layout) {
    case 'cover':
    case 'closing':
      inner = [
        <h1 key="t">{slide.title}</h1>,
        slide.subtitle ? <div key="st" className="pps-s-st">{slide.subtitle}</div> : null,
      ]
      break
    case 'section':
      inner = [<h2 key="t">{slide.title}</h2>, slide.subtitle ? <div key="st" className="pps-s-st">{slide.subtitle}</div> : null]
      break
    case 'statement':
      inner = [<div key="t" className="pps-s-stmt">{slide.title}</div>, slide.subtitle ? <div key="st" className="pps-s-st">{slide.subtitle}</div> : null]
      break
    default:
      inner = [
        <h2 key="t">{slide.title}</h2>,
        slide.bullets?.length ? (
          <ul key="b">
            {slide.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        ) : null,
      ]
  }

  return (
    <div className="pps-slide-box">
      <div className="pps-slide" style={style}>
        {inner}
        <div className="pps-s-num">
          {index + 1} / {total}
        </div>
      </div>
    </div>
  )
}
