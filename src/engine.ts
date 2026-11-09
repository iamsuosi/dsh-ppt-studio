import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { deflateRawSync } from 'node:zlib'
import type { PptStudioCreateResult, PptStudioLanguage, PptStudioSlide, PptStudioThemeId } from './types.js'
import type { Theme } from './themes.js'
import { resolveTheme } from './themes.js'
import { sanitizeFileName, resolveDeckFileName } from './utils.js'

export interface BuildDeckOptions {
  title: string
  slides: PptStudioSlide[]
  theme: PptStudioThemeId
  lang: PptStudioLanguage
  outputDir: string
  fileName?: string
  overwrite?: boolean
}

const EMU_W = 12192000
const EMU_H = 6858000

export function writeDeckArtifacts(options: BuildDeckOptions): PptStudioCreateResult {
  const theme = resolveTheme(options.theme)
  const outputDir = resolve(options.outputDir)
  mkdirSync(outputDir, { recursive: true })
  const baseName = sanitizeFileName(options.fileName || options.title)
  const finalName = resolveDeckFileName(outputDir, baseName, options.overwrite === true)

  const pptxPath = join(outputDir, `${finalName}.pptx`)
  const htmlPath = join(outputDir, `${finalName}.html`)
  const jsonPath = join(outputDir, `${finalName}.json`)

  const pptxBuffer = buildPptx(options.title, options.slides, theme, options.lang)
  writeFileSync(pptxPath, pptxBuffer)

  const html = renderDeckHtml(options.title, options.slides, theme, options.lang)
  writeFileSync(htmlPath, html, 'utf8')

  const manifest = renderDeckManifest(options.title, options.slides, options.theme, options.lang)
  writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf8')

  return {
    ok: true,
    pptxPath,
    htmlPath,
    jsonPath,
    slideCount: options.slides.length,
    theme: options.theme,
    lang: options.lang,
  }
}

// ---------------------------------------------------------------------------
// HTML renderer
// ---------------------------------------------------------------------------

export function renderDeckHtml(title: string, slides: PptStudioSlide[], theme: Theme, lang: PptStudioLanguage): string {
  const isZh = lang === 'zh'
  const slideHtml = slides
    .map((slide, index) => renderHtmlSlide(slide, index + 1, slides.length, theme, isZh))
    .join('\n')

  return `<!DOCTYPE html>
<html lang="${lang === 'zh' ? 'zh-CN' : 'en-US'}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }
body {
  background: #${theme.palette.bg};
  color: #${theme.palette.fg};
  font-family: ${theme.fonts.body}, system-ui, sans-serif;
  overflow: hidden;
}
#stage {
  width: 100vw; height: 100vh;
  display: flex; align-items: center; justify-content: center;
}
.slide {
  width: 100%; height: 100%;
  padding: 6vh 8vw;
  display: none;
  flex-direction: column;
  justify-content: center;
}
.slide.active { display: flex; }
h1 { font-family: ${theme.fonts.heading}, system-ui, sans-serif; font-size: 6vh; margin-bottom: 3vh; }
h2 { font-family: ${theme.fonts.heading}, system-ui, sans-serif; font-size: 5vh; margin-bottom: 3vh; color: #${theme.palette.accent}; }
.subtitle { font-size: 2.8vh; color: #${theme.palette.muted}; margin-bottom: 2vh; }
ul { list-style: none; }
ul li { font-size: 3vh; margin: 2vh 0; padding-left: 2vw; position: relative; }
ul li::before { content: '•'; color: #${theme.palette.accent}; position: absolute; left: 0; }
.statement { font-size: 5vh; font-weight: 700; }
.footer { position: fixed; bottom: 2vh; right: 3vw; font-size: 1.6vh; color: #${theme.palette.muted}; }
.nav { position: fixed; bottom: 2vh; left: 3vw; font-size: 1.6vh; color: #${theme.palette.muted}; }
</style>
</head>
<body>
<div id="stage">${slideHtml}</div>
<div class="nav">← → navigate · F fullscreen</div>
<div class="footer">${escapeHtml(title)}</div>
<script>
const slides = document.querySelectorAll('.slide');
let idx = 0;
function go(n) { idx = (n + slides.length) % slides.length; slides.forEach((s,i)=>s.classList.toggle('active', i===idx)); }
document.addEventListener('keydown', e => {
  if (e.key==='ArrowRight'||e.key==='PageDown'||e.key===' ') { e.preventDefault(); go(idx+1); }
  else if (e.key==='ArrowLeft'||e.key==='PageUp') { e.preventDefault(); go(idx-1); }
  else if (e.key.toLowerCase()==='f') { document.documentElement.requestFullscreen?.(); }
});
</script>
</body>
</html>`
}

function renderHtmlSlide(slide: PptStudioSlide, index: number, total: number, theme: Theme, isZh: boolean): string {
  const number = `<span style="color:#${theme.palette.muted}">${index} / ${total}</span>`
  let inner = ''
  switch (slide.layout) {
    case 'cover':
      inner = `<h1>${escapeHtml(slide.title)}</h1>${slide.subtitle ? `<div class="subtitle">${escapeHtml(slide.subtitle)}</div>` : ''}`
      break
    case 'section':
      inner = `<h2>${escapeHtml(slide.title)}</h2>${slide.subtitle ? `<div class="subtitle">${escapeHtml(slide.subtitle)}</div>` : ''}`
      break
    case 'statement':
      inner = `<div class="statement">${escapeHtml(slide.title)}</div>${slide.subtitle ? `<div class="subtitle">${escapeHtml(slide.subtitle)}</div>` : ''}`
      break
    case 'closing':
      inner = `<h1>${escapeHtml(slide.title)}</h1>${slide.subtitle ? `<div class="subtitle">${escapeHtml(slide.subtitle)}</div>` : ''}`
      break
    case 'bullets':
    default:
      inner = `<h2>${escapeHtml(slide.title)}</h2>${slide.bullets ? `<ul>${slide.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>` : ''}`
  }
  return `<section class="slide ${index === 1 ? 'active' : ''}" data-index="${index}">${inner}<div style="position:absolute;bottom:3vh;right:3vw;font-size:1.6vh;color:#${theme.palette.muted}">${number}</div></section>`
}

function escapeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ---------------------------------------------------------------------------
// PPTX renderer (hand-written OOXML + node:zlib)
// ---------------------------------------------------------------------------

function hex(value: string): string {
  return value.replace('#', '').toUpperCase()
}

function escapeXml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function paragraphXml(text: string, options: Record<string, any> = {}): string {
  const {
    size = 2000,
    color = 'FFFFFF',
    bold = false,
    align = 'l',
    bullet = false,
    font = 'Arial',
  } = options
  const spacing = options.spaceAfter ? `<a:spcAft><a:spcPts val="${options.spaceAfter}"/></a:spcAft>` : ''
  const pPr = `<a:pPr${bullet ? ' marL="285750" indent="-285750"' : align !== 'l' ? ` algn="${align}"` : ''}>${spacing}${bullet ? '<a:buFont typeface="Arial" panose="020B0604020202020204"/><a:buChar char="•"/>' : '<a:buNone/>'}</a:pPr>`
  return `<a:p>${pPr}<a:r><a:rPr lang="${options.lang ?? 'zh-CN'}" sz="${size}" b="${bold ? 1 : 0}" dirty="0"><a:solidFill><a:srgbClr val="${hex(color)}"/></a:solidFill><a:latin typeface="${escapeXml(font)}"/><a:ea typeface="${escapeXml(font)}"/></a:rPr><a:t>${escapeXml(text)}</a:t></a:r></a:p>`
}

function textShapeXml(id: number, name: string, box: any, paragraphs: string[], options: any = {}): string {
  const { x = 0, y = 0, w = EMU_W, h = EMU_H } = box
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${escapeXml(name)}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln/></p:spPr><p:txBody><a:bodyPr wrap="square" rtlCol="0"/><a:lstStyle/>${paragraphs.join('')}</p:txBody></p:sp>`
}

function accentBarXml(id: number, box: any, color: string): string {
  const { x = 0, y = 0, w = EMU_W, h = EMU_H } = box
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="accent-bar"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="${hex(color)}"/></a:solidFill><a:ln/></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody></p:sp>`
}

function slideShapeList(slide: PptStudioSlide, index: number, total: number, theme: Theme, lang: PptStudioLanguage): string {
  const p = theme.palette
  const font = theme.fonts.heading
  const bodyFont = theme.fonts.body
  const isZh = lang === 'zh'
  const para = (content: string, options: any = {}) => paragraphXml(content, { lang: isZh ? 'zh-CN' : 'en-US', ...options })
  const shapes: string[] = []
  const idBase = (index + 1) * 10
  const footer = `Slide ${index} / ${total}`

  switch (slide.layout) {
    case 'cover': {
      shapes.push(accentBarXml(idBase + 1, { x: 914400, y: 2250000, w: 240000, h: 1600000 }, p.accent))
      shapes.push(textShapeXml(idBase + 2, 'Title', { x: 1550000, y: 2160000, w: 9250000, h: 1800000 }, [para(slide.title, { size: 4400, color: p.fg, bold: true, font })]))
      if (slide.subtitle) {
        shapes.push(textShapeXml(idBase + 3, 'Subtitle', { x: 1570000, y: 4150000, w: 9000000, h: 1200000 }, [para(slide.subtitle, { size: 2200, color: p.muted, font: bodyFont })]))
      }
      break
    }
    case 'section': {
      shapes.push(textShapeXml(idBase + 1, 'Title', { x: 1050000, y: 3150000, w: 10200000, h: 1400000 }, [para(slide.title, { size: 4000, color: p.accent, bold: true, font })]))
      if (slide.subtitle) {
        shapes.push(textShapeXml(idBase + 2, 'Subtitle', { x: 1070000, y: 4750000, w: 9000000, h: 900000 }, [para(slide.subtitle, { size: 1800, color: p.muted, font: bodyFont })]))
      }
      break
    }
    case 'statement': {
      shapes.push(accentBarXml(idBase + 1, { x: 914400, y: 1900000, w: 200000, h: 2800000 }, p.accent))
      shapes.push(textShapeXml(idBase + 2, 'Statement', { x: 1500000, y: 1950000, w: 9400000, h: 2700000 }, [para(slide.title, { size: 3600, color: p.fg, bold: true, font })]))
      if (slide.subtitle) {
        shapes.push(textShapeXml(idBase + 3, 'Subtitle', { x: 1520000, y: 4900000, w: 9000000, h: 800000 }, [para(slide.subtitle, { size: 1800, color: p.muted, font: bodyFont })]))
      }
      break
    }
    case 'closing': {
      shapes.push(textShapeXml(idBase + 1, 'Title', { x: 1050000, y: 2300000, w: 10200000, h: 1700000 }, [para(slide.title, { size: 5200, color: p.fg, bold: true, align: 'ctr', font })]))
      if (slide.subtitle) {
        shapes.push(textShapeXml(idBase + 2, 'Subtitle', { x: 1050000, y: 4200000, w: 10200000, h: 900000 }, [para(slide.subtitle, { size: 2000, color: p.accent, bold: true, align: 'ctr', font: bodyFont })]))
      }
      break
    }
    case 'bullets':
    default: {
      shapes.push(textShapeXml(idBase + 1, 'Title', { x: 900000, y: 920000, w: 10300000, h: 800000 }, [para(slide.title, { size: 3400, color: p.fg, bold: true, font })]))
      const bullets = slide.bullets ?? []
      const bodyParagraphs = bullets.length > 0
        ? bullets.map((bullet) => para(bullet, { size: 2200, color: p.fg, bullet: true, font: bodyFont, spaceAfter: 600 }))
        : [para(slide.subtitle || '', { size: 2200, color: p.fg, font: bodyFont })]
      shapes.push(textShapeXml(idBase + 2, 'Body', { x: 1050000, y: 1850000, w: 10100000, h: 4500000 }, bodyParagraphs))
      break
    }
  }

  shapes.push(textShapeXml(idBase + 9, 'Page number', { x: 10600000, y: 6250000, w: 1200000, h: 400000 }, [para(footer, { size: 1000, color: p.muted, align: 'r', font: bodyFont })]))

  return shapes.join('')
}

function slideXml(slide: PptStudioSlide, index: number, total: number, theme: Theme, lang: PptStudioLanguage): string {
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
    '<p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="' + hex(theme.palette.bg) + '"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>' +
    '<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>' +
    slideShapeList(slide, index, total, theme, lang) +
    '</p:spTree></p:cSld><p:clrMapOvr><a:overrideClrMapping bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/></p:clrMapOvr></p:sld>'
}

function presentationXml(slideCount: number): string {
  const slideIds = Array.from({ length: slideCount }, (_, i) => 256 + i)
  const sldIdLst = slideIds.map((id, i) => `<p:sldId id="${id}" r:id="rId${i + 3}"/>`).join('')
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
    '<p:sldIdLst>' + sldIdLst + '</p:sldIdLst><p:sldSz cx="12192000" cy="6858000" type="screen16x9"/><p:notesSz cx="6858000" cy="9144000"/>' +
    '<p:defaultTextStyle><a:defPPr><a:defRPr lang="zh-CN"/></a:defPPr></p:defaultTextStyle></p:presentation>'
}

function contentTypesXml(slideCount: number): string {
  const slideOverrides = Array.from({ length: slideCount }, (_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('')
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>' +
    slideOverrides +
    '<Override PartName="/ppt/presProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presProps+xml"/>' +
    '<Override PartName="/ppt/viewProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.viewProps+xml"/>' +
    '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>' +
    '<Override PartName="/ppt/tableStyles.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.tableStyles+xml"/>' +
    '</Types>'
}

function relsXml(slideCount: number): string {
  const slideRels = Array.from({ length: slideCount }, (_, i) => `<Relationship Id="rId${i + 3}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`).join('')
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
    '</Relationships>'
}

function presentationRelsXml(slideCount: number): string {
  const slideRels = Array.from({ length: slideCount }, (_, i) => `<Relationship Id="rId${i + 3}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`).join('')
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/presProps" Target="presProps.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/viewProps" Target="viewProps.xml"/>' +
    '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>' +
    slideRels +
    '</Relationships>'
}

function slideRelsXml(): string {
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>' +
    '</Relationships>'
}

function coreXml(title: string): string {
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
    '<dc:title>' + escapeXml(title) + '</dc:title><dc:creator>dsh-ppt-studio</dc:creator><cp:lastModifiedBy>dsh-ppt-studio</cp:lastModifiedBy>' +
    '<dcterms:created xsi:type="dcterms:W3CDTF">' + new Date().toISOString() + '</dcterms:created>' +
    '<dcterms:modified xsi:type="dcterms:W3CDTF">' + new Date().toISOString() + '</dcterms:modified></cp:coreProperties>'
}

function themeXml(): string {
  // Minimal theme placeholder; PowerPoint will repair/extend on first open.
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Theme">' +
    '<a:themeElements><a:clrScheme name="Office"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>' +
    '<a:dk2><a:srgbClr val="44546A"/></a:dk2><a:lt2><a:srgbClr val="E7E6E6"/></a:lt2><a:accent1><a:srgbClr val="5B9BD5"/></a:accent1><a:accent2><a:srgbClr val="ED7D31"/></a:accent2>' +
    '<a:accent3><a:srgbClr val="A5A5A5"/></a:accent3><a:accent4><a:srgbClr val="FFC000"/></a:accent4><a:accent5><a:srgbClr val="4472C4"/></a:accent5><a:accent6><a:srgbClr val="70AD47"/></a:accent6>' +
    '<a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme>' +
    '<a:fontScheme name="Office"><a:majorFont><a:latin typeface="Calibri Light" panose="020F0302020204030204"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>' +
    '<a:minorFont><a:latin typeface="Calibri" panose="020F0502020204030204"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme>' +
    '<a:fmtScheme name="Office"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="50000"/><a:satMod val="300000"/></a:schemeClr></a:gs><a:gs pos="35000"><a:schemeClr val="phClr"><a:tint val="37000"/><a:satMod val="300000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"><a:tint val="15000"/><a:satMod val="350000"/></a:schemeClr></a:gs></a:gsLst><a:lin ang="16200000" scaled="1"/></a:gradFill><a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:shade val="51000"/><a:satMod val="130000"/></a:schemeClr></a:gs><a:gs pos="80000"><a:schemeClr val="phClr"><a:shade val="93000"/><a:satMod val="130000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"><a:shade val="94000"/><a:satMod val="135000"/></a:schemeClr></a:gs></a:gsLst><a:lin ang="16200000" scaled="0"/></a:gradFill></a:fillStyleLst>' +
    '<a:lnStyleLst><a:ln w="9525" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"><a:shade val="95000"/><a:satMod val="105000"/></a:schemeClr></a:solidFill><a:prstDash val="solid"/></a:ln><a:ln w="25400" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln><a:ln w="38100" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln></a:lnStyleLst>' +
    '<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst><a:outerShd blurRad="40000" dist="20000" dir="5400000" rotWithShape="0"><a:srgbClr val="000000"><a:alpha val="38000"/></a:srgbClr></a:outerShd></a:effectLst></a:effectStyle></a:effectStyleLst>' +
    '<a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"><a:tint val="95000"/><a:shade val="63000"/></a:schemeClr></a:solidFill><a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="80000"/><a:shade val="63000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"><a:shade val="63000"/></a:schemeClr></a:gs></a:gsLst><a:path path="circle"><a:fillToRect l="50000" t="-80000" r="50000" b="180000"/></a:path></a:gradFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>'
}

function buildPptx(title: string, slides: PptStudioSlide[], theme: Theme, lang: PptStudioLanguage): Buffer {
  const entries: Record<string, Buffer> = {}
  entries['[Content_Types].xml'] = Buffer.from(contentTypesXml(slides.length), 'utf8')
  entries['_rels/.rels'] = Buffer.from(relsXml(slides.length), 'utf8')
  entries['ppt/presentation.xml'] = Buffer.from(presentationXml(slides.length), 'utf8')
  entries['ppt/_rels/presentation.xml.rels'] = Buffer.from(presentationRelsXml(slides.length), 'utf8')
  entries['ppt/presProps.xml'] = Buffer.from('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presProps xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:showPr><p:presentDuration val="0"/></p:showPr></p:presProps>', 'utf8')
  entries['ppt/viewProps.xml'] = Buffer.from('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:viewPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:normalViewPr><p:restoredLeft sz="15620" autoAdjust="0"/><p:restoredTop sz="94660" autoAdjust="0"/></p:normalViewPr><p:slideViewPr><p:cSldViewPr><p:cViewPr varScale="1"><p:scale><a:sx n="104" d="100"/><a:sy n="104" d="100"/></p:scale></p:cViewPr><p:guideLst/></p:cSldViewPr></p:slideViewPr><p:notesTextViewPr/><p:gridSpacing cx="72000" cy="72000"/></p:viewPr>', 'utf8')
  entries['ppt/theme/theme1.xml'] = Buffer.from(themeXml(), 'utf8')
  entries['ppt/tableStyles.xml'] = Buffer.from('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:tblStyles xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" def="{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}"/>', 'utf8')
  entries['docProps/core.xml'] = Buffer.from(coreXml(title), 'utf8')

  for (let i = 0; i < slides.length; i++) {
    entries[`ppt/slides/slide${i + 1}.xml`] = Buffer.from(slideXml(slides[i], i + 1, slides.length, theme, lang), 'utf8')
    entries[`ppt/slides/_rels/slide${i + 1}.xml.rels`] = Buffer.from(slideRelsXml(), 'utf8')
  }

  return buildZip(entries)
}

function buildZip(entries: Record<string, Buffer>): Buffer {
  const parts: Buffer[] = []
  const crcTable = new Int32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    crcTable[i] = c
  }
  const crc32 = (buf: Buffer): number => {
    let c = -1
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
    }
    return c ^ -1
  }

  const localHeaders: Buffer[] = []
  const centralDir: Buffer[] = []
  let offset = 0

  for (const [name, data] of Object.entries(entries)) {
    const compressed = deflateRawSync(data)
    const nameBuf = Buffer.from(name, 'utf8')
    const crc = crc32(data)
    const local = Buffer.alloc(30 + nameBuf.length)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0, 6)
    local.writeUInt16LE(8, 8) // deflate
    local.writeUInt32LE(0, 10)
    local.writeUInt32LE(crc >>> 0, 14)
    local.writeUInt32LE(compressed.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(nameBuf.length, 26)
    local.writeUInt16LE(0, 28)
    nameBuf.copy(local, 30)
    parts.push(local, compressed)

    const central = Buffer.alloc(46 + nameBuf.length)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0, 8)
    central.writeUInt16LE(8, 10)
    central.writeUInt32LE(0, 12)
    central.writeUInt32LE(crc >>> 0, 16)
    central.writeUInt32LE(compressed.length, 20)
    central.writeUInt32LE(data.length, 24)
    central.writeUInt16LE(nameBuf.length, 28)
    central.writeUInt16LE(0, 30)
    central.writeUInt16LE(0, 32)
    central.writeUInt16LE(0, 34)
    central.writeUInt16LE(0, 36)
    central.writeUInt32LE(0, 38)
    central.writeUInt32LE(offset >>> 0, 42)
    nameBuf.copy(central, 46)
    centralDir.push(central)

    offset += local.length + compressed.length
  }

  const centralOffset = offset
  const centralBuf = Buffer.concat(centralDir)
  parts.push(centralBuf)

  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(0, 4)
  eocd.writeUInt16LE(0, 6)
  const entryCount = Object.keys(entries).length
  eocd.writeUInt16LE(entryCount, 8)
  eocd.writeUInt16LE(entryCount, 10)
  eocd.writeUInt32LE(centralBuf.length, 12)
  eocd.writeUInt32LE(centralOffset >>> 0, 16)
  eocd.writeUInt16LE(0, 20)
  parts.push(eocd)

  return Buffer.concat(parts)
}

export function renderDeckManifest(title: string, slides: PptStudioSlide[], theme: PptStudioThemeId, lang: PptStudioLanguage): object {
  return {
    title,
    theme,
    lang,
    slideCount: slides.length,
    slides: slides.map((s, i) => ({ index: i + 1, layout: s.layout, title: s.title, subtitle: s.subtitle, bullets: s.bullets })),
  }
}
