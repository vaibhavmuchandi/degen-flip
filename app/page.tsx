import { getFrameMetadata } from 'frog/next'
import type { Metadata } from 'next'

import styles from './page.module.css'

const vercelUrl = String(`${process.env.VERCEL_URL}/api`)
const localUrl = "http://localhost:3000/api"

const url = process.env.VERCEL_URL ? vercelUrl : localUrl
export async function generateMetadata(): Promise<Metadata> {
  const frameTags = await getFrameMetadata(
    url,
  )
  return {
    other: frameTags
  }
}

export default function Home() {
  return (
    <main className={styles.main}>
      Lessgo
    </main>
  )
}
