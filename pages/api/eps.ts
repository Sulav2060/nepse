import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    let csvData = ''
    
    // Check local file first
    const localPath = path.join(process.cwd(), 'eps.csv')
    if (fs.existsSync(localPath)) {
        csvData = fs.readFileSync(localPath, 'utf8')
    } else {
        // Fallback to GitHub Raw
        const githubRawUrl = 'https://raw.githubusercontent.com/Sulav2060/nepse/main/eps.csv'
        const response = await fetch(githubRawUrl)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch from GitHub: ${response.statusText}`)
        }
        
        csvData = await response.text()
    }

    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true
    })

    res.status(200).json({ data: records })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load EPS data' })
  }
}
