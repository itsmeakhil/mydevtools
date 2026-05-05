import type { Experience, Education, Project, Certification, PersonalInfo } from '@/components/portfolio-builder'

export interface ResumeData {
  displayName: string
  email?: string | null
  username?: string | null
  bio?: string | null
  personalInfo: PersonalInfo
  socialLinks: Record<string, string>
  techStacks: string[]
  experiences: Experience[]
  projects: Project[]
  education: Education[]
  certifications: Certification[]
}

const MARGIN = 18
const PAGE_WIDTH = 210
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const PAGE_HEIGHT = 297
const BOTTOM_MARGIN = 20

function safeDate(s?: string | null): Date | null {
  if (!s) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatPeriod(start: string, end?: string | null): string {
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
  const s = safeDate(start)
  const e = safeDate(end)
  const left = s ? fmt(s) : start
  const right = end?.trim() ? (e ? fmt(e) : end) : 'Present'
  return `${left} – ${right}`
}

function formatSingleDate(s: string): string {
  const d = safeDate(s)
  return d ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : s
}

export async function generateResumePdf(data: ResumeData): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = MARGIN

  function checkPage(needed = 8): void {
    if (y + needed > PAGE_HEIGHT - BOTTOM_MARGIN) {
      doc.addPage()
      y = MARGIN
    }
  }

  function addLine(height = 5): void {
    y += height
  }

  function text(
    content: string,
    x: number,
    options?: { align?: 'left' | 'center' | 'right'; maxWidth?: number },
  ): void {
    doc.text(content, x, y, { align: options?.align, maxWidth: options?.maxWidth })
  }

  function wrappedText(content: string, x: number, maxWidth: number, lineHeight = 5): number {
    const lines = doc.splitTextToSize(content, maxWidth) as string[]
    for (const line of lines) {
      checkPage(lineHeight + 2)
      doc.text(line, x, y)
      y += lineHeight
    }
    return lines.length
  }

  function sectionHeader(title: string): void {
    checkPage(12)
    addLine(4)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(30, 30, 30)
    text(title.toUpperCase(), MARGIN)
    addLine(4)
    doc.setDrawColor(180, 180, 180)
    doc.setLineWidth(0.3)
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y)
    addLine(4)
  }

  // ── Header ──────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(15, 15, 15)
  text(data.displayName, PAGE_WIDTH / 2, { align: 'center' })
  addLine(6)

  if (data.personalInfo.headline?.trim()) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(80, 80, 80)
    text(data.personalInfo.headline, PAGE_WIDTH / 2, { align: 'center' })
    addLine(4)
  }

  // Contact row
  const contactParts: string[] = []
  if (data.email) contactParts.push(data.email)
  if (data.personalInfo.phone) contactParts.push(data.personalInfo.phone)
  if (data.personalInfo.location) contactParts.push(data.personalInfo.location)
  if (data.socialLinks.linkedin?.trim()) contactParts.push(data.socialLinks.linkedin.replace(/^https?:\/\/(www\.)?/, ''))
  if (data.socialLinks.github?.trim()) contactParts.push(data.socialLinks.github.replace(/^https?:\/\/(www\.)?/, ''))
  if (data.socialLinks.website?.trim()) contactParts.push(data.socialLinks.website.replace(/^https?:\/\/(www\.)?/, ''))

  if (contactParts.length > 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(60, 60, 60)
    const contactLine = contactParts.join('  |  ')
    const lines = doc.splitTextToSize(contactLine, CONTENT_WIDTH) as string[]
    for (const line of lines) {
      doc.text(line, PAGE_WIDTH / 2, y, { align: 'center' })
      addLine(4)
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  if (data.bio?.trim()) {
    sectionHeader('Summary')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(40, 40, 40)
    wrappedText(data.bio.trim(), MARGIN, CONTENT_WIDTH, 5)
  }

  // ── Experience ──────────────────────────────────────────────────────────
  if (data.experiences.length > 0) {
    sectionHeader('Experience')
    for (const exp of data.experiences) {
      checkPage(14)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(20, 20, 20)
      text(exp.role, MARGIN)
      const period = formatPeriod(exp.startDate, exp.endDate)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(80, 80, 80)
      text(period, PAGE_WIDTH - MARGIN, { align: 'right' })
      addLine(4.5)

      const companyLine = [
        exp.company,
        exp.employmentType,
        exp.location,
      ].filter(Boolean).join('  ·  ')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
      doc.setTextColor(50, 50, 50)
      text(companyLine, MARGIN)
      addLine(4)

      if (exp.description?.trim()) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(55, 55, 55)
        wrappedText(exp.description.trim(), MARGIN, CONTENT_WIDTH, 4.5)
        addLine(1)
      }

      if (exp.technologies?.length) {
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(8.5)
        doc.setTextColor(90, 90, 90)
        wrappedText(`Technologies: ${exp.technologies.join(', ')}`, MARGIN, CONTENT_WIDTH, 4)
      }

      addLine(4)
    }
  }

  // ── Education ───────────────────────────────────────────────────────────
  if (data.education.length > 0) {
    sectionHeader('Education')
    for (const ed of data.education) {
      checkPage(10)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(20, 20, 20)
      text(ed.degree, MARGIN)
      const period = formatPeriod(ed.startDate, ed.endDate)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(80, 80, 80)
      text(period, PAGE_WIDTH - MARGIN, { align: 'right' })
      addLine(4.5)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
      doc.setTextColor(50, 50, 50)
      text(ed.institution, MARGIN)
      addLine(4)

      if (ed.description?.trim()) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(55, 55, 55)
        wrappedText(ed.description.trim(), MARGIN, CONTENT_WIDTH, 4.5)
      }
      addLine(4)
    }
  }

  // ── Projects ─────────────────────────────────────────────────────────────
  if (data.projects.length > 0) {
    sectionHeader('Projects')
    for (const proj of data.projects) {
      checkPage(10)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(20, 20, 20)
      text(proj.title, MARGIN)
      addLine(4.5)

      if (proj.liveUrl?.trim() || proj.githubUrl?.trim()) {
        const link = (proj.liveUrl || proj.githubUrl || '').replace(/^https?:\/\/(www\.)?/, '')
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8.5)
        doc.setTextColor(70, 70, 70)
        text(link, MARGIN)
        addLine(4)
      }

      if (proj.description?.trim()) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(55, 55, 55)
        wrappedText(proj.description.trim(), MARGIN, CONTENT_WIDTH, 4.5)
        addLine(1)
      }

      if (proj.technologies?.length) {
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(8.5)
        doc.setTextColor(90, 90, 90)
        wrappedText(`Technologies: ${proj.technologies.join(', ')}`, MARGIN, CONTENT_WIDTH, 4)
      }
      addLine(4)
    }
  }

  // ── Certifications ───────────────────────────────────────────────────────
  if (data.certifications.length > 0) {
    sectionHeader('Certifications')
    for (const cert of data.certifications) {
      checkPage(10)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(20, 20, 20)
      text(cert.name, MARGIN)
      addLine(4.5)

      const metaParts: string[] = [cert.issuer]
      if (cert.issueDate) metaParts.push(`Issued ${formatSingleDate(cert.issueDate)}`)
      if (cert.expiryDate) metaParts.push(`Expires ${formatSingleDate(cert.expiryDate)}`)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(60, 60, 60)
      text(metaParts.join('  ·  '), MARGIN)
      addLine(4)

      if (cert.credentialUrl?.trim()) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8.5)
        doc.setTextColor(80, 80, 80)
        text(cert.credentialUrl.replace(/^https?:\/\/(www\.)?/, ''), MARGIN)
        addLine(4)
      }
      addLine(2)
    }
  }

  // ── Skills ───────────────────────────────────────────────────────────────
  if (data.techStacks.length > 0) {
    sectionHeader('Technical Skills')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(40, 40, 40)
    wrappedText(data.techStacks.join(', '), MARGIN, CONTENT_WIDTH, 5)
  }

  // ── Languages / Hobbies ──────────────────────────────────────────────────
  const langs = data.personalInfo.languages
  if (langs?.length > 0) {
    sectionHeader('Languages')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(40, 40, 40)
    const langStr = langs.map((l) => (l.level ? `${l.name} (${l.level})` : l.name)).join(', ')
    wrappedText(langStr, MARGIN, CONTENT_WIDTH, 5)
  }

  const fileName = `${(data.displayName || data.username || 'resume').replace(/\s+/g, '_')}_resume.pdf`
  doc.save(fileName)
}
