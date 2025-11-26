import React from "react"
import { parse } from 'csv-parse/sync'
import StockDashboard from "@/components/stock-dashboard"

// This is a Server Component
export default async function StockWebsite() {
  let mergedData: string[][] = []

  try {
    // Fetch data directly from GitHub Raw
    const [tradingRes, dividendRes] = await Promise.all([
      fetch('https://raw.githubusercontent.com/Sulav2060/nepse/main/live-trading-cache.json', { cache: 'no-store' }),
      fetch('https://raw.githubusercontent.com/Sulav2060/nepse/main/proposed_dividends_sorted.csv', { cache: 'no-store' })
    ])

    let tradingData: string[][] = []
    let dividendRecords: any[] = []

    if (tradingRes.ok) {
      const json = await tradingRes.json()
      tradingData = json.data || []
    }

    if (dividendRes.ok) {
      const csvText = await dividendRes.text()
      dividendRecords = parse(csvText, {
        columns: true,
        skip_empty_lines: true
      })
    }

    // Process Dividend Data
    const dividendMap = new Map<string, { totalBonus: number; totalCash: number; count: number }>()
    dividendRecords.forEach((item: any) => {
      const symbol = item.Symbol
      const bonus = parseFloat(item['Bonus(%)']) || 0
      const cash = parseFloat(item['Cash(%)']) || 0

      if (!dividendMap.has(symbol)) {
        dividendMap.set(symbol, { totalBonus: 0, totalCash: 0, count: 0 })
      }
      
      const entry = dividendMap.get(symbol)!
      entry.totalBonus += bonus
      entry.totalCash += cash
      entry.count += 1
    })

    // Merge Data
    mergedData = tradingData.map((row: string[], index: number) => {
      if (index === 0) {
        return [row[0], row[1], "Avg Bonus (%)", "Avg Cash (%)", "Years Count"]
      }
      
      const symbol = row[0]
      const dividendStats = dividendMap.get(symbol)
      
      let avgBonus = '-'
      let avgCash = '-'
      let yearsCount = '-'

      if (dividendStats) {
          avgBonus = (dividendStats.totalBonus / dividendStats.count).toFixed(2)
          avgCash = (dividendStats.totalCash / dividendStats.count).toFixed(2)
          yearsCount = dividendStats.count.toString()
      }

      return [
        row[0], 
        row[1], 
        avgBonus, 
        avgCash, 
        yearsCount
      ]
    })

  } catch (error) {
    console.error("Server-side fetch error:", error)
    // Fallback to empty or error state
  }

  return <StockDashboard initialData={mergedData} />
}
