"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { ExternalLink, RefreshCw, Play } from "lucide-react"

interface StockDashboardProps {
  initialData: string[][]
}

export default function StockDashboard({ initialData }: StockDashboardProps) {
  const [sortConfig, setSortConfig] = useState<{ key: 'symbol' | 'ltp' | 'bonus' | 'cash' | 'right' | 'year' | 'eps' | 'bv'; direction: 'asc' | 'desc' } | null>(null)
  const [tableData, setTableData] = useState<string[][]>(initialData)
  const [isLoading, setIsLoading] = useState(false)
  const [isTriggering, setIsTriggering] = useState(false)

  const refreshData = async () => {
    setIsLoading(true)
    try {
      const [tradingRes, dividendRes, epsRes] = await Promise.all([
        fetch("/api/live-trading"),
        fetch("/api/dividends"),
        fetch("/api/eps")
      ])

      const tradingJson = await tradingRes.json()
      const dividendJson = await dividendRes.json()
      const epsJson = await epsRes.json()

      const dividendMap = new Map<string, { totalBonus: number; totalCash: number; totalRight: number; count: number }>()
      if (dividendJson.data && Array.isArray(dividendJson.data)) {
        dividendJson.data.forEach((item: any) => {
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
      }

      const epsMap = new Map<string, { eps: string; bookValue: string }>()
      if (epsJson.data && Array.isArray(epsJson.data)) {
          epsJson.data.forEach((item: any) => {
              epsMap.set(item.Symbol, { eps: item.EPS, bookValue: item['Book Value'] })
          })
      }

      const mergedData = (tradingJson.data || []).map((row: string[], index: number) => {
        if (index === 0) return [row[0], row[1], "Avg Bonus (%)", "Avg Cash (%)", "Avg Right (%)", "Years Count", "EPS", "Book Value"]
        
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

        return [row[0], row[1], avgBonus, avgCash, avgRight, yearsCount, eps, bookValue]
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

  const triggerScraper = async () => {
    if (!confirm("This will trigger ALL GitHub Actions (LTP, Dividends, Fundamentals). It may take a few minutes. Continue?")) return

    setIsTriggering(true)
    try {
        const workflows = ['update_ltp.yml', 'scrape.yml', 'update_fundamentals.yml']
        
        const results = await Promise.all(workflows.map(wf => 
            fetch('/api/trigger-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workflow: wf })
            }).then(async res => {
                if (res.ok) return { wf, status: 'ok' }
                const json = await res.json().catch(() => ({}))
                return { wf, status: 'failed', error: json.error }
            })
        ))
        
        const failed = results.filter(r => r.status === 'failed')
        
        if (failed.length === 0) {
            alert("All scrapers triggered successfully! Please wait 2-3 minutes and then click 'Refresh Table'.")
        } else {
            const errorMsg = failed.map(f => `${f.wf}: ${f.error || 'Unknown error'}`).join('\n')
            alert(`Failed to trigger some scrapers:\n${errorMsg}`)
        }
    } catch (e) {
        console.error(e)
        alert("Error triggering scrapers")
    } finally {
        setIsTriggering(false)
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
        if (val === '-' || val === 'N/A') return -999999 // Treat missing data as lowest
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
    } else if (sortConfig.key === 'right') {
      sortedRows.sort((a, b) => {
        const numA = getVal(a, 4)
        const numB = getVal(b, 4)
        return sortConfig.direction === 'asc' ? numA - numB : numB - numA
      })
    } else if (sortConfig.key === 'year') {
      sortedRows.sort((a, b) => {
        const numA = getVal(a, 5)
        const numB = getVal(b, 5)
        return sortConfig.direction === 'asc' ? numA - numB : numB - numA
      })
    } else if (sortConfig.key === 'eps') {
        sortedRows.sort((a, b) => {
          const numA = getVal(a, 6)
          const numB = getVal(b, 6)
          return sortConfig.direction === 'asc' ? numA - numB : numB - numA
        })
    } else if (sortConfig.key === 'bv') {
        sortedRows.sort((a, b) => {
          const numA = getVal(a, 7)
          const numB = getVal(b, 7)
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
          <div className="flex gap-2">
            <Button onClick={triggerScraper} variant="outline" className="flex items-center gap-2" disabled={isTriggering}>
                <Play className="h-4 w-4" />
                {isTriggering ? "Starting..." : "Trigger Update"}
            </Button>
            <Button onClick={refreshData} variant="outline" className="flex items-center gap-2" disabled={isLoading}>
                <RefreshCw className="h-4 w-4" />
                {isLoading ? "Refreshing..." : "Refresh Table"}
            </Button>
          </div>
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
                        <TableHead className="font-semibold cursor-pointer select-none" onClick={() => setSortConfig(prev => ({ key: 'right', direction: prev?.key === 'right' && prev.direction === 'asc' ? 'desc' : 'asc' }))}>
                          Avg Right (%) {sortConfig?.key === 'right' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                        </TableHead>
                        <TableHead className="font-semibold cursor-pointer select-none" onClick={() => setSortConfig(prev => ({ key: 'year', direction: prev?.key === 'year' && prev.direction === 'asc' ? 'desc' : 'asc' }))}>
                          Years Count {sortConfig?.key === 'year' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                        </TableHead>
                        <TableHead className="font-semibold cursor-pointer select-none" onClick={() => setSortConfig(prev => ({ key: 'eps', direction: prev?.key === 'eps' && prev.direction === 'asc' ? 'desc' : 'asc' }))}>
                          EPS {sortConfig?.key === 'eps' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                        </TableHead>
                        <TableHead className="font-semibold cursor-pointer select-none" onClick={() => setSortConfig(prev => ({ key: 'bv', direction: prev?.key === 'bv' && prev.direction === 'asc' ? 'desc' : 'asc' }))}>
                          Book Value {sortConfig?.key === 'bv' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
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
                          <TableCell>{row[5]}</TableCell>
                          <TableCell>{row[6]}</TableCell>
                          <TableCell>{row[7]}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </>
                ) : (
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
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
