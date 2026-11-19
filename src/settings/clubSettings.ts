// Club name and crest for printed sheets, remembered in this browser.

const STORAGE_KEY = 'trainingsplaner.club'
const LOGO_MAX_SIZE = 256

export interface ClubLogo {
  dataUrl: string
  width: number
  height: number
}

export interface ClubSettings {
  name: string
  logo: ClubLogo | null
}

export function loadClubSettings(): ClubSettings {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (data && typeof data.name === 'string') {
      const logo =
        data.logo &&
        typeof data.logo.dataUrl === 'string' &&
        data.logo.dataUrl.startsWith('data:image/') &&
        typeof data.logo.width === 'number' &&
        typeof data.logo.height === 'number'
          ? (data.logo as ClubLogo)
          : null
      return { name: data.name, logo }
    }
  } catch {
    // Not available or broken: start without club data.
  }
  return { name: '', logo: null }
}

export function saveClubSettings(settings: ClubSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Storage full or unavailable: the settings only last for this visit.
  }
}

/** Reads an image file and scales it down (max 256 px) so it stays small in storage and PDFs. */
export function readLogo(file: File): Promise<ClubLogo> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      const scale = Math.min(1, LOGO_MAX_SIZE / Math.max(image.width, image.height))
      const width = Math.max(1, Math.round(image.width * scale))
      const height = Math.max(1, Math.round(image.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')?.drawImage(image, 0, 0, width, height)
      URL.revokeObjectURL(url)
      resolve({ dataUrl: canvas.toDataURL('image/png'), width, height })
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Das Bild konnte nicht gelesen werden.'))
    }
    image.src = url
  })
}
