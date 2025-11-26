"use client"

import React, { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, ExternalLink } from "lucide-react"

interface StockData {
  symbol: string
  sector: string
  ltp: number
  eps: number
  bookValue: number
  bonus: string
  cash: string
  right: string
  return: number
}

export default function StockWebsite() {
  const [sortConfig, setSortConfig] = useState<{ key: 'symbol' | 'ltp' | 'bonus' | 'cash' | 'year'; direction: 'asc' | 'desc' } | null>(null)
  const [tableData, setTableData] = useState<string[][]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchLiveTradingData = async () => {
    setIsLoading(true)
    try {
      const [tradingRes, dividendRes] = await Promise.all([
        fetch("/api/live-trading"),
        fetch("/api/dividends")
      ])

      const tradingJson = await tradingRes.json()
      const dividendJson = await dividendRes.json()

      // Create a map for faster lookup of dividend data
      const dividendMap = new Map<string, { totalBonus: number; totalCash: number; count: number }>()
      if (dividendJson.data && Array.isArray(dividendJson.data)) {
        dividendJson.data.forEach((item: any) => {
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
      }

      const mergedData = (tradingJson.data || []).map((row: string[], index: number) => {
        // Header row
        if (index === 0) {
          return [row[0], row[1], "Avg Bonus (%)", "Avg Cash (%)", "Years Count"]
        }
        
        // Data rows
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

      setTableData(mergedData)
      setSortConfig(null) // Reset sort on new data
    } catch (error) {
      console.error(error)
      alert("Failed to fetch data.")
    } finally {
      setIsLoading(false)
    }
  }

  React.useEffect(() => {
    fetchLiveTradingData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sorting logic
  const sortedTableData = React.useMemo(() => {
    if (!sortConfig || tableData.length <= 1) return tableData
    const header = tableData[0]
    const rows = tableData.slice(1)
    let sortedRows = [...rows]
    if (sortConfig.key === 'symbol') {
      sortedRows.sort((a, b) => {
        if (a[0] < b[0]) return sortConfig.direction === 'asc' ? -1 : 1
        if (a[0] > b[0]) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    } else if (sortConfig.key === 'ltp') {
      sortedRows.sort((a, b) => {
        // Remove commas and non-numeric chars before parsing
        const cleanA = a[1].replace(/[^\d.\-]/g, "")
        const cleanB = b[1].replace(/[^\d.\-]/g, "")
        const numA = parseFloat(cleanA) || 0
        const numB = parseFloat(cleanB) || 0
        return sortConfig.direction === 'asc' ? numA - numB : numB - numA
      })
    } else if (sortConfig.key === 'bonus') {
      sortedRows.sort((a, b) => {
        const numA = parseFloat(a[2]) || 0
        const numB = parseFloat(b[2]) || 0
        return sortConfig.direction === 'asc' ? numA - numB : numB - numA
      })
    } else if (sortConfig.key === 'cash') {
      sortedRows.sort((a, b) => {
        const numA = parseFloat(a[3]) || 0
        const numB = parseFloat(b[3]) || 0
        return sortConfig.direction === 'asc' ? numA - numB : numB - numA
      })
    } else if (sortConfig.key === 'year') {
      sortedRows.sort((a, b) => {
        if (a[4] < b[4]) return sortConfig.direction === 'asc' ? -1 : 1
        if (a[4] > b[4]) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    return [header, ...sortedRows]
  }, [tableData, sortConfig])

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with Update Button */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground">Live Trading Data</h1>
          <Button onClick={fetchLiveTradingData} variant="outline" className="flex items-center gap-2 bg-transparent" disabled={isLoading}>
            <ExternalLink className="h-4 w-4" />
            {isLoading ? "Loading..." : "Update Data"}
          </Button>
        </div>

  {/* Live Trading Table Section */}

        {/* Live Trading Data Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                {sortedTableData.length > 0 ? (
                  <>
                    <TableHeader>
                      <TableRow>
                        <TableHead
                          className="font-semibold cursor-pointer select-none"
                          onClick={() =>
                            setSortConfig((prev) => {
                              if (!prev || prev.key !== 'symbol') return { key: 'symbol', direction: 'asc' }
                              return {
                                key: 'symbol',
                                direction: prev.direction === 'asc' ? 'desc' : 'asc',
                              }
                            })
                          }
                        >
                          Symbol
                          {sortConfig?.key === 'symbol' && (
                            <span className="ml-1">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </TableHead>
                        <TableHead
                          className="font-semibold cursor-pointer select-none"
                          onClick={() =>
                            setSortConfig((prev) => {
                              if (!prev || prev.key !== 'ltp') return { key: 'ltp', direction: 'asc' }
                              return {
                                key: 'ltp',
                                direction: prev.direction === 'asc' ? 'desc' : 'asc',
                              }
                            })
                          }
                        >
                          LTP
                          {sortConfig?.key === 'ltp' && (
                            <span className="ml-1">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </TableHead>
                        <TableHead
                          className="font-semibold cursor-pointer select-none"
                          onClick={() =>
                            setSortConfig((prev) => {
                              if (!prev || prev.key !== 'bonus') return { key: 'bonus', direction: 'asc' }
                              return {
                                key: 'bonus',
                                direction: prev.direction === 'asc' ? 'desc' : 'asc',
                              }
                            })
                          }
                        >
                          Avg Bonus (%)
                          {sortConfig?.key === 'bonus' && (
                            <span className="ml-1">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </TableHead>
                        <TableHead
                          className="font-semibold cursor-pointer select-none"
                          onClick={() =>
                            setSortConfig((prev) => {
                              if (!prev || prev.key !== 'cash') return { key: 'cash', direction: 'asc' }
                              return {
                                key: 'cash',
                                direction: prev.direction === 'asc' ? 'desc' : 'asc',
                              }
                            })
                          }
                        >
                          Avg Cash (%)
                          {sortConfig?.key === 'cash' && (
                            <span className="ml-1">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </TableHead>
                        <TableHead
                          className="font-semibold cursor-pointer select-none"
                          onClick={() =>
                            setSortConfig((prev) => {
                              if (!prev || prev.key !== 'year') return { key: 'year', direction: 'asc' }
                              return {
                                key: 'year',
                                direction: prev.direction === 'asc' ? 'desc' : 'asc',
                              }
                            })
                          }
                        >
                          Years Count
                          {sortConfig?.key === 'year' && (
                            <span className="ml-1">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedTableData.slice(1).map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{row[0]}</TableCell>
                          <TableCell>{row[1]}</TableCell>
                          <TableCell>{row[2]}</TableCell>
                          <TableCell>{row[3]}</TableCell>
                          <TableCell>{row[4]}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </>
                ) : (
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                        No data available. Click "Update Data" to fetch live trading data.
                      </TableCell>
                    </TableRow>
                  </TableBody>
                )}
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
