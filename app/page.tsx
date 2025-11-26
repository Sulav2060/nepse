import React from "react"
import { parse } from 'csv-parse/sync'
import StockDashboard from "@/components/stock-dashboard"
import fs from 'fs'
import path from 'path'

// This is a Server Component
export default async function StockWebsite() {
  let mergedData: string[][] = []

  try {
    let tradingData: string[][] = []
    let dividendRecords: any[] = []

    // 1. Get Live Trading Data (Local file first, then GitHub)
    const localTradingPath = path.join(process.cwd(), 'live-trading-cache.json')
    if (fs.existsSync(localTradingPath)) {
        try {
            const fileContent = fs.readFileSync(localTradingPath, 'utf8')
            const json = JSON.parse(fileContent)
            tradingData = json.data || []
        } catch (e) {
            console.error("Error reading local trading cache:", e)
        }
    }
    
    if (tradingData.length === 0) {
        const tradingRes = await fetch('https://raw.githubusercontent.com/Sulav2060/nepse/main/live-trading-cache.json', { cache: 'no-store' })
        if (tradingRes.ok) {
            const json = await tradingRes.json()
            tradingData = json.data || []
        }
    }

    // 2. Get Dividend Data (Local file first, then GitHub)
    const localDividendPath = path.join(process.cwd(), 'proposed_dividends_sorted.csv')
    if (fs.existsSync(localDividendPath)) {
        try {
            const csvText = fs.readFileSync(localDividendPath, 'utf8')
            dividendRecords = parse(csvText, {
                columns: true,
                skip_empty_lines: true
            })
        } catch (e) {
            console.error("Error reading local dividend csv:", e)
        }
    }

    if (dividendRecords.length === 0) {
        const dividendRes = await fetch('https://raw.githubusercontent.com/Sulav2060/nepse/main/proposed_dividends_sorted.csv', { cache: 'no-store' })
        if (dividendRes.ok) {
            const csvText = await dividendRes.text()
            dividendRecords = parse(csvText, {
                columns: true,
                skip_empty_lines: true
            })
        }
    }

    // 3. Get EPS Data (Local file first, then GitHub)
    let epsRecords: any[] = []
    const localEpsPath = path.join(process.cwd(), 'eps.csv')
    if (fs.existsSync(localEpsPath)) {
        try {
            const csvText = fs.readFileSync(localEpsPath, 'utf8')
            epsRecords = parse(csvText, {
                columns: true,
                skip_empty_lines: true
            })
        } catch (e) {
            console.error("Error reading local eps csv:", e)
        }
    }

    if (epsRecords.length === 0) {
        const epsRes = await fetch('https://raw.githubusercontent.com/Sulav2060/nepse/main/eps.csv', { cache: 'no-store' })
        if (epsRes.ok) {
            const csvText = await epsRes.text()
            epsRecords = parse(csvText, {
                columns: true,
                skip_empty_lines: true
            })
        }
    }

    // Process Dividend Data
    const dividendMap = new Map<string, { totalBonus: number; totalCash: number; totalRight: number; count: number }>()
    dividendRecords.forEach((item: any) => {
      const symbol = item.Symbol
      const bonus = parseFloat(item['Bonus(%)']) || 0
      const cash = parseFloat(item['Cash(%)']) || 0
      const right = parseFloat(item['Right Share']) || 0

      if (!dividendMap.has(symbol)) {
        dividendMap.set(symbol, { totalBonus: 0, totalCash: 0, totalRight: 0, count: 0 })
      }
      
      const entry = dividendMap.get(symbol)!
      entry.totalBonus += bonus
      entry.totalCash += cash
      entry.totalRight += right
      entry.count += 1
    })

    // Process EPS Data
    const epsMap = new Map<string, { eps: string; bookValue: string }>()
    epsRecords.forEach((item: any) => {
        epsMap.set(item.Symbol, { eps: item.EPS, bookValue: item['Book Value'] })
    })

    // Merge Data
    mergedData = tradingData.map((row: string[], index: number) => {
      if (index === 0) {
        return [row[0], row[1], "Avg Bonus (%)", "Avg Cash (%)", "Avg Right (%)", "Years Count", "EPS", "Book Value"]
      }
      
      const symbol = row[0]
      const dividendStats = dividendMap.get(symbol)
      const epsStats = epsMap.get(symbol)
      
      let avgBonus = '-'
      let avgCash = '-'
      let avgRight = '-'
      let yearsCount = '-'
      let eps = '-'
      let bookValue = '-'

      if (dividendStats) {
          avgBonus = (dividendStats.totalBonus / dividendStats.count).toFixed(2)
          avgCash = (dividendStats.totalCash / dividendStats.count).toFixed(2)
          avgRight = (dividendStats.totalRight / dividendStats.count).toFixed(2)
          yearsCount = dividendStats.count.toString()
      }

      if (epsStats) {
          eps = epsStats.eps
          bookValue = epsStats.bookValue
      }

      return [
        row[0], 
        row[1], 
        avgBonus, 
        avgCash,
        avgRight,
        yearsCount,
        eps,
        bookValue
      ]
    })

  } catch (error) {
    console.error("Server-side fetch error:", error)
    // Fallback to empty or error state
  }

  return <StockDashboard initialData={mergedData} />
}
