import * as htmlToImage from '../../src'
import { getSvgDocument } from './helper'

describe('font embedding', () => {
  it('embeds a used font without changing the source stylesheet', async () => {
    const style = document.createElement('style')
    style.textContent =
      '@font-face { font-family: "SnapshotFont"; src: url("asset:font.woff2") format("woff2"); }' +
      '.snapshot-font { font-family: "SnapshotFont"; }'
    document.head.appendChild(style)
    const root = document.createElement('div')
    root.className = 'snapshot-font'
    root.style.cssText = 'width:32px;height:20px'
    root.textContent = 'font'
    document.body.appendChild(root)
    try {
      const sheet = style.sheet as CSSStyleSheet
      const before = Array.from(sheet.cssRules).map((rule) => rule.cssText)
      const kinds: string[] = []
      const svg = await htmlToImage.toSvg(root, {
        resources: {
          resolve: ({ kind }) => {
            kinds.push(kind)
            return new Blob(['font bytes'], { type: 'font/woff2' })
          },
        },
      })
      const doc = await getSvgDocument(svg)
      expect(kinds).toEqual(['font'])
      expect(doc.documentElement.textContent).toContain('data:font/woff2')
      expect(Array.from(sheet.cssRules).map((rule) => rule.cssText)).toEqual(
        before,
      )
      expect(root.querySelector('style')).toBeNull()
    } finally {
      root.remove()
      style.remove()
    }
  })

  it('finds a used font inside a grouped adopted stylesheet', async () => {
    const sheet = new CSSStyleSheet()
    sheet.replaceSync(
      '@media screen { @font-face { font-family: "GroupedFont"; src: url("asset:grouped.woff2") format("woff2"); } }',
    )
    const original = document.adoptedStyleSheets
    document.adoptedStyleSheets = [...original, sheet]
    const root = document.createElement('div')
    root.style.cssText = 'width:32px;height:20px;font-family:"GroupedFont"'
    root.textContent = 'grouped'
    document.body.appendChild(root)
    try {
      const svg = await htmlToImage.toSvg(root, {
        resources: {
          resolve: ({ kind }) =>
            kind === 'font'
              ? new Blob(['font bytes'], { type: 'font/woff2' })
              : undefined,
        },
      })
      const doc = await getSvgDocument(svg)
      expect(doc.documentElement.textContent).toContain('GroupedFont')
      expect(doc.documentElement.textContent).toContain('data:font/woff2')
      expect(Array.from(sheet.cssRules).length).toBe(1)
    } finally {
      root.remove()
      document.adoptedStyleSheets = original
    }
  })

  describe('should embed only used fonts', () => {
    it('should embed 1 font when use 1', async () => {
      const root = document.createElement('div')
      document.body.append(root)
      try {
        root.innerHTML = `
          <style>
              @font-face { 
                  font-family: 'Font 0';
                  src: url('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu72xKKTU1Kvnz.woff2');
              }
              @font-face { 
                  font-family: 'Font 1';
                  src: url('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu72xKKTU1Kvnz.woff2');
              }
              @font-face { 
                  font-family: 'Font 2';
                  src: url('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu72xKKTU1Kvnz.woff2');
              }
          </style>
          <p style="font-family: 'Font 1'">Hello world</p>
        `
        const svg = await htmlToImage.toSvg(root)
        const doc = await getSvgDocument(svg)
        const [style] = Array.from(doc.getElementsByTagName('style'))
        expect(style.textContent).toContain('Font 1')
        expect(style.textContent).not.toContain('Font 0')
        expect(style.textContent).not.toContain('Font 2')
      } finally {
        root.remove()
      }
    })
    it('should embed 2 fonts when use 2', async () => {
      const root = document.createElement('div')
      document.body.append(root)
      try {
        root.innerHTML = `
          <style>
              @font-face { 
                  font-family: 'Font 0';
                  src: url('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu72xKKTU1Kvnz.woff2');
              }
              @font-face { 
                  font-family: 'Font 1';
                  src: url('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu72xKKTU1Kvnz.woff2');
              }
              @font-face { 
                  font-family: 'Font 2';
                  src: url('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu72xKKTU1Kvnz.woff2');
              }
          </style>
          <p style="font-family: 'Font 0'">Hello world</p>
          <p style="font-family: 'Font 2'">Hello world</p>
        `
        const svg = await htmlToImage.toSvg(root)
        const doc = await getSvgDocument(svg)
        const [style] = Array.from(doc.getElementsByTagName('style'))
        expect(style.textContent).toContain('Font 0')
        expect(style.textContent).toContain('Font 2')
        expect(style.textContent).not.toContain('Font 1')
      } finally {
        root.remove()
      }
    })
    it('should embed font used by deeply nested child', async () => {
      const root = document.createElement('div')
      document.body.append(root)
      try {
        root.innerHTML = `
          <style>
              @font-face { 
                  font-family: 'Font 0';
                  src: url('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu72xKKTU1Kvnz.woff2');
              }
              @font-face { 
                  font-family: 'Font 1';
                  src: url('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu72xKKTU1Kvnz.woff2');
              }
              @font-face { 
                  font-family: 'Font 2';
                  src: url('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu72xKKTU1Kvnz.woff2');
              }
          </style>
          <div>
            <div>
                <div>
                    <div style="font-family: 'Font 1'">Hello world</div>
                </div>
            </div>
          </div>
        `
        const svg = await htmlToImage.toSvg(root)
        const doc = await getSvgDocument(svg)
        const [style] = Array.from(doc.getElementsByTagName('style'))
        expect(style.textContent).toContain('Font 1')
        expect(style.textContent).not.toContain('Font 0')
        expect(style.textContent).not.toContain('Font 2')
      } finally {
        root.remove()
      }
    })
  })
})
