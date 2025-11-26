import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { workflow = 'update_ltp.yml' } = req.body

  // You need to set GITHUB_TOKEN in your .env.local file
  // It must be a Personal Access Token (PAT) with 'workflow' scope
  const token = process.env.GITHUB_TOKEN
  const repoOwner = 'Sulav2060'
  const repoName = 'nepse'

  if (!token) {
    return res.status(500).json({ error: 'GITHUB_TOKEN is not configured on the server.' })
  }

  try {
    // Check for last run time to enforce rate limit (once per 24 hours)
    const runsResponse = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/actions/workflows/${workflow}/runs?per_page=1`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    })

    if (runsResponse.ok) {
      const runsData = await runsResponse.json()
      if (runsData.workflow_runs && runsData.workflow_runs.length > 0) {
        const lastRun = runsData.workflow_runs[0]
        const lastRunDate = new Date(lastRun.created_at)
        const now = new Date()
        const diffMs = now.getTime() - lastRunDate.getTime()
        const diffHours = diffMs / (1000 * 60 * 60)

        if (diffHours < 24) {
           return res.status(429).json({ error: `Rate limit exceeded. Last run was ${diffHours.toFixed(1)} hours ago. Please wait 24 hours between updates.` })
        }
      }
    }

    const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/actions/workflows/${workflow}/dispatches`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: 'main',
      }),
    })

    if (response.status === 204) {
      res.status(200).json({ message: 'Workflow triggered successfully' })
    } else {
      const errorText = await response.text()
      res.status(response.status).json({ error: `Failed to trigger workflow: ${errorText}` })
    }
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
