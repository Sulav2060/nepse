import type { NextApiRequest, NextApiResponse } from 'next'
import fetch from 'node-fetch'
import { JSDOM } from 'jsdom'
import fs from 'fs'
import path from 'path'

const CACHE_FILE = path.join(process.cwd(), 'live-trading-cache.json')

// Helper to get Nepal Time
function getNepalTime() {
  const now = new Date()
  // Nepal is UTC + 5:45
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
  return new Date(utc + (5.75 * 3600000))
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const nepalTime = getNepalTime()
    const currentHour = nepalTime.getHours()
    const currentMinute = nepalTime.getMinutes()
    
    // Market hours: roughly 11:00 to 15:00
    // We want to cache aggressively after 15:00 until next day 11:00
    const isAfterMarketClose = (currentHour > 15) || (currentHour === 15 && currentMinute >= 0)
    const isBeforeMarketOpen = currentHour < 11
    
    let shouldFetch = true
    let cachedData = null

    if (fs.existsSync(CACHE_FILE)) {
      try {
        const fileContent = fs.readFileSync(CACHE_FILE, 'utf8')
        const cache = JSON.parse(fileContent)
        const cacheTime = new Date(cache.timestamp)
        const cacheAgeMinutes = (Date.now() - cacheTime.getTime()) / 60000
        
        // Caching Strategy:
        // 1. If it's after market close (and before next open), and we have a cache from AFTER today's close, keep it.
        //    Actually, simpler: If it's after market close, keep cache for 12 hours.
        // 2. If it's during market hours, keep cache for 5 minutes.
        
        if (isAfterMarketClose || isBeforeMarketOpen) {
           // If cache is less than 18 hours old, use it. 
           // (Covers the overnight period)
           if (cacheAgeMinutes < 18 * 60) {
             shouldFetch = false
             cachedData = cache.data
           }
        } else {
           // During market hours: Cache for 5 minutes
           if (cacheAgeMinutes < 5) {
             shouldFetch = false
             cachedData = cache.data
           }
        }
      } catch (e) {
        console.error("Cache read error", e)
      }
    }

    if (!shouldFetch && cachedData) {
      return res.status(200).json({ data: cachedData, source: 'cache' })
    }

    // Fetch fresh data
    const response = await fetch('https://www.sharesansar.com/live-trading')
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
    
    // Save to cache
    try {
      fs.writeFileSync(CACHE_FILE, JSON.stringify({
        timestamp: new Date().toISOString(),
        data: data
      }))
    } catch (e) {
      console.error("Cache write error", e)
    }

    res.status(200).json({ data, source: 'live' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch or parse table' })
  }
}
