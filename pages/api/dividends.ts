import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Try to read from local file first (best for local dev)
    const filePath = path.join(process.cwd(), 'proposed_dividends_sorted.csv')
    let csvData = ''

    if (fs.existsSync(filePath)) {
      csvData = fs.readFileSync(filePath, 'utf8')
    } else {
      // Fallback: Fetch from GitHub (best for production/Vercel if file not bundled)
      // Replace with your actual repo details
      const githubRawUrl = 'https://raw.githubusercontent.com/Sulav2060/nepse/main/proposed_dividends_sorted.csv'
      const response = await fetch(githubRawUrl)
      if (!response.ok) throw new Error('Failed to fetch from GitHub')
      csvData = await response.text()
    }

    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true
    })

    res.status(200).json({ data: records })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load dividend data' })
  }
}
