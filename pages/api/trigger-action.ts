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
