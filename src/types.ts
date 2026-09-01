export interface Bookmark {
  id: string
  groupId: string
  name: string
  url: string
  order: number
  updatedAt: number
  deletedAt?: number
  isDivider?: boolean
}

export interface Group {
  id: string
  name: string
  order: number
  updatedAt: number
  deletedAt?: number
}

export interface Repo {
  id: string
  fullName: string // "owner/repo"
  order: number
  updatedAt: number
  deletedAt?: number
  isDivider?: boolean
}

export interface QuickPin {
  id: string
  label: string
  url: string
  order: number
  updatedAt: number
  deletedAt?: number
  isDivider?: boolean
}

export interface HomepageData {
  groups: Group[]
  bookmarks: Bookmark[]
  repos: Repo[]
  quickPins: QuickPin[]
}

export interface ExportedData extends HomepageData {
  exportedAt: number
  version: 1
}
