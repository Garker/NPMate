import type {
  RegistryPackageDetail,
  RegistryPackageSummary,
  RegistryPackageVersion,
} from '../../src/types/package'

const registryBaseUrl = 'https://registry.npmjs.org'
const downloadsBaseUrl = 'https://api.npmjs.org/downloads/point/last-week'

interface SearchResponse {
  objects?: Array<{
    package?: {
      name?: string
      version?: string
      description?: string
      publisher?: { username?: string }
      maintainers?: Array<{ username?: string }>
      links?: { npm?: string; repository?: string }
    }
  }>
}

interface PackageMetadata {
  name?: string
  description?: string
  readme?: string
  license?: string
  homepage?: string
  author?: string | { name?: string }
  maintainers?: Array<{ name?: string }>
  repository?: string | { url?: string }
  keywords?: string[]
  'dist-tags'?: { latest?: string }
  versions?: Record<string, { deprecated?: string }>
  time?: Record<string, string>
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(12_000),
  })
  if (!response.ok) {
    if (response.status === 404) throw new Error('npm 包不存在。')
    throw new Error(`npm Registry 请求失败（${response.status}）。`)
  }
  return (await response.json()) as T
}

function repositoryUrl(
  repository: string | { url?: string } | undefined,
): string | null {
  const raw = typeof repository === 'string' ? repository : repository?.url
  if (!raw) return null
  return raw
    .replace(/^git\+/, '')
    .replace(/^git:\/\//, 'https://')
    .replace(/^git@github\.com:/, 'https://github.com/')
    .replace(/\.git$/, '')
}

function authorName(metadata: PackageMetadata): string {
  if (typeof metadata.author === 'string') return metadata.author
  return (
    metadata.author?.name ??
    metadata.maintainers?.[0]?.name ??
    '未提供'
  )
}

async function weeklyDownloads(name: string): Promise<number | null> {
  try {
    const data = await fetchJson<{ downloads?: number }>(
      `${downloadsBaseUrl}/${encodeURIComponent(name)}`,
    )
    return typeof data.downloads === 'number' ? data.downloads : null
  } catch {
    // 下载统计失败不应阻断 Registry 搜索。
    return null
  }
}

/**
 * npm Registry 访问统一放在主进程，并设置超时与响应状态检查。
 */
export class PackageService {
  async search(query: string): Promise<RegistryPackageSummary[]> {
    const text = query.trim()
    if (text.length < 2) throw new Error('请输入至少 2 个字符。')

    const data = await fetchJson<SearchResponse>(
      `${registryBaseUrl}/-/v1/search?text=${encodeURIComponent(text)}&size=12`,
    )
    return Promise.all(
      (data.objects ?? []).map(async ({ package: item }) => {
        const name = item?.name ?? ''
        return {
          name,
          version: item?.version ?? '—',
          description: item?.description ?? '暂无描述',
          author:
            item?.publisher?.username ??
            item?.maintainers?.[0]?.username ??
            '未提供',
          weeklyDownloads: name ? await weeklyDownloads(name) : null,
          npmUrl: item?.links?.npm ?? `https://www.npmjs.com/package/${name}`,
          repositoryUrl: repositoryUrl(item?.links?.repository),
        }
      }),
    )
  }

  async detail(name: string): Promise<RegistryPackageDetail> {
    const metadata = await fetchJson<PackageMetadata>(
      `${registryBaseUrl}/${encodeURIComponent(name)}`,
    )
    const latest = metadata['dist-tags']?.latest ?? '—'
    const versions: RegistryPackageVersion[] = Object.keys(
      metadata.versions ?? {},
    )
      .map((version) => ({
        version,
        publishedAt: metadata.time?.[version] ?? null,
        deprecated: metadata.versions?.[version]?.deprecated ?? null,
      }))
      .sort((left, right) =>
        (right.publishedAt ?? '').localeCompare(left.publishedAt ?? ''),
      )

    return {
      name: metadata.name ?? name,
      version: latest,
      description: metadata.description ?? '暂无描述',
      author: authorName(metadata),
      weeklyDownloads: await weeklyDownloads(name),
      npmUrl: `https://www.npmjs.com/package/${name}`,
      repositoryUrl: repositoryUrl(metadata.repository),
      readme: metadata.readme?.trim() || '该包未提供 README。',
      license: metadata.license ?? null,
      homepage: metadata.homepage ?? null,
      versions,
      keywords: Array.isArray(metadata.keywords) ? metadata.keywords : [],
    }
  }
}
