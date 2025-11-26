"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { ExternalLink } from "lucide-react"

interface StockDashboardProps {
  initialData: string[][]
}

export default function StockDashboard({ initialData }: StockDashboardProps) {
  const [sortConfig, setSortConfig] = useState<{ key: 'symbol' | 'ltp' | 'bonus' | 'cash' | 'year'; direction: 'asc' | 'desc' } | null>(null)
  const [tableData, setTableData] = useState<string[][]>(initialData)
  const [isLoading, setIsLoading] = useState(false)

  const refreshData = async () => {
    setIsLoading(true)
    try {
      const [tradingRes, dividendRes] = await Promise.all([
        fetch("/api/live-trading"),
        fetch("/api/dividends")
      ])

      const tradingJson = await tradingRes.json()
      const dividendJson = await dividendRes.json()

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
        if (index === 0) return [row[0], row[1], "Avg Bonus (%)", "Avg Cash (%)", "Years Count"]
        
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

        return [row[0], row[1], avgBonus, avgCash, yearsCount]
      })

      setTableData(mergedData)
      setSortConfig(null)
    } catch (error) {
      console.error(error)
      alert("Failed to refresh data.")
    } finally {
      setIsLoading(false)
    }
  }

  // Sorting logic
  const sortedTableData = React.useMemo(() => {
    if (!sortConfig || tableData.length <= 1) return tableData
    const header = tableData[0]
    const rows = tableData.slice(1)
    let sortedRows = [...rows]
    
    const getVal = (row: string[], idx: number) => {
        const val = row[idx]
        if (val === '-') return -1 // Treat missing data as lowest
        return parseFloat(val.replace(/[^\d.\-]/g, "")) || 0
    }

    if (sortConfig.key === 'symbol') {
      sortedRows.sort((a, b) => {
        if (a[0] < b[0]) return sortConfig.direction === 'asc' ? -1 : 1
        if (a[0] > b[0]) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    } else if (sortConfig.key === 'ltp') {
      sortedRows.sort((a, b) => {
        const numA = getVal(a, 1)
        const numB = getVal(b, 1)
        return sortConfig.direction === 'asc' ? numA - numB : numB - numA
      })
    } else if (sortConfig.key === 'bonus') {
      sortedRows.sort((a, b) => {
        const numA = getVal(a, 2)
        const numB = getVal(b, 2)
        return sortConfig.direction === 'asc' ? numA - numB : numB - numA
      })
    } else if (sortConfig.key === 'cash') {
      sortedRows.sort((a, b) => {
        const numA = getVal(a, 3)
        const numB = getVal(b, 3)
        return sortConfig.direction === 'asc' ? numA - numB : numB - numA
      })
    } else if (sortConfig.key === 'year') {
      sortedRows.sort((a, b) => {
        const numA = getVal(a, 4)
        const numB = getVal(b, 4)
        return sortConfig.direction === 'asc' ? numA - numB : numB - numA
      })
    }
    return [header, ...sortedRows]
  }, [tableData, sortConfig])

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground">Live Trading Data</h1>
          <Button onClick={refreshData} variant="outline" className="flex items-center gap-2 bg-transparent" disabled={isLoading}>
            <ExternalLink className="h-4 w-4" />
            {isLoading ? "Loading..." : "Update Data"}
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                {sortedTableData.length > 0 ? (
                  <>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-semibold cursor-pointer select-none" onClick={() => setSortConfig(prev => ({ key: 'symbol', direction: prev?.key === 'symbol' && prev.direction === 'asc' ? 'desc' : 'asc' }))}>
                          Symbol {sortConfig?.key === 'symbol' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                        </TableHead>
                        <TableHead className="font-semibold cursor-pointer select-none" onClick={() => setSortConfig(prev => ({ key: 'ltp', direction: prev?.key === 'ltp' && prev.direction === 'asc' ? 'desc' : 'asc' }))}>
                          LTP {sortConfig?.key === 'ltp' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                        </TableHead>
                        <TableHead className="font-semibold cursor-pointer select-none" onClick={() => setSortConfig(prev => ({ key: 'bonus', direction: prev?.key === 'bonus' && prev.direction === 'asc' ? 'desc' : 'asc' }))}>
                          Avg Bonus (%) {sortConfig?.key === 'bonus' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                        </TableHead>
                        <TableHead className="font-semibold cursor-pointer select-none" onClick={() => setSortConfig(prev => ({ key: 'cash', direction: prev?.key === 'cash' && prev.direction === 'asc' ? 'desc' : 'asc' }))}>
                          Avg Cash (%) {sortConfig?.key === 'cash' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                        </TableHead>
                        <TableHead className="font-semibold cursor-pointer select-none" onClick={() => setSortConfig(prev => ({ key: 'year', direction: prev?.key === 'year' && prev.direction === 'asc' ? 'desc' : 'asc' }))}>
                          Years Count {sortConfig?.key === 'year' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
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
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No data available.
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
