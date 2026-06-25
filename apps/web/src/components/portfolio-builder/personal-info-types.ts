export const LANGUAGE_LEVELS = ['Native', 'Fluent', 'Professional', 'Intermediate', 'Basic'] as const

export interface LanguageEntry {
  name: string
  level: string
}

export interface PersonalInfo {
  phone?: string | null
  location?: string | null
  date_of_birth?: string | null
  nationality?: string | null
  headline?: string | null
  languages: LanguageEntry[]
  hobbies: string[]
}
