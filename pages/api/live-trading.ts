import type { NextApiRequest, NextApiResponse } from 'next'
import fetch from 'node-fetch'
import { JSDOM } from 'jsdom'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const response = await fetch('https://www.sharesansar.com/live-trading')
    console.log(response)
    const html = await response.text()
    const dom = new JSDOM(html)
    const table = dom.window.document.querySelector('table') as HTMLTableElement | null
    if (!table) return res.status(404).json({ error: 'Table not found' })

    const rows = Array.from(table.querySelectorAll('tr')) as HTMLTableRowElement[]
    let symbolIdx = -1, ltpIdx = -1
    const data: string[][] = []
    rows.forEach((row, i) => {
      const cells = Array.from(row.querySelectorAll('th, td')) as HTMLElement[]
      if (i === 0) {
        // Find indexes for Symbol and LTP
        cells.forEach((cell, idx) => {
          const txt = cell.textContent?.trim().toLowerCase() || ''
          if (txt === 'symbol') symbolIdx = idx
          if (txt === 'ltp') ltpIdx = idx
        })
        data.push(['Symbol', 'LTP'])
      } else {
        if (symbolIdx !== -1 && ltpIdx !== -1 && cells.length > Math.max(symbolIdx, ltpIdx)) {
          data.push([
            cells[symbolIdx].textContent?.trim() || '',
            cells[ltpIdx].textContent?.trim() || ''
          ])
        }
      }
    })
    res.status(200).json({ data })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch or parse table' })
  }
}
