import type { NextApiRequest, NextApiResponse } from 'next'
import fetch from 'node-fetch'

const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/Sulav2060/nepse/main/live-trading-cache.json'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Fetch data directly from GitHub Raw (updated by GitHub Actions)
    const response = await fetch(GITHUB_RAW_URL)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch from GitHub: ${response.statusText}`)
    }

    const cache = await response.json() as any
    
    // Return the cached data
    // The structure of cache is { timestamp: string, data: string[][] }
    res.status(200).json({ 
      data: cache.data, 
      source: 'github-cache',
      timestamp: cache.timestamp 
    })
  } catch (error) {
    console.error("API Error:", error)
    res.status(500).json({ error: 'Failed to fetch live trading data' })
  }
}

