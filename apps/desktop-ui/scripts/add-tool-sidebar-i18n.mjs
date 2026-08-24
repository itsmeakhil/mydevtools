// Adds the collapse-to-icon rail keys to the ToolSidebar namespace in every
// locale. Idempotent: existing keys are left untouched.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const DIR = new URL('../messages/', import.meta.url).pathname

const T = {
  en: { expand: 'Expand sidebar', collapse: 'Collapse sidebar', resize: 'Resize sidebar', resetWidth: 'Reset sidebar width', moreSections: 'More sections', sections: 'Sidebar sections' },
  af: { expand: 'Vou sybalk uit', collapse: 'Vou sybalk in', resize: 'Verstel sybalk se grootte', resetWidth: 'Herstel sybalk se breedte', moreSections: 'Meer afdelings', sections: 'Sybalk-afdelings' },
  ar: { expand: 'توسيع الشريط الجانبي', collapse: 'طي الشريط الجانبي', resize: 'تغيير حجم الشريط الجانبي', resetWidth: 'إعادة تعيين عرض الشريط الجانبي', moreSections: 'المزيد من الأقسام', sections: 'أقسام الشريط الجانبي' },
  ca: { expand: 'Amplia la barra lateral', collapse: 'Redueix la barra lateral', resize: 'Redimensiona la barra lateral', resetWidth: "Restableix l'amplada de la barra lateral", moreSections: 'Més seccions', sections: 'Seccions de la barra lateral' },
  cs: { expand: 'Rozbalit postranní panel', collapse: 'Sbalit postranní panel', resize: 'Změnit šířku panelu', resetWidth: 'Obnovit šířku panelu', moreSections: 'Další sekce', sections: 'Sekce postranního panelu' },
  da: { expand: 'Udvid sidepanel', collapse: 'Skjul sidepanel', resize: 'Tilpas sidepanelets bredde', resetWidth: 'Nulstil sidepanelets bredde', moreSections: 'Flere sektioner', sections: 'Sidepanelsektioner' },
  de: { expand: 'Seitenleiste ausklappen', collapse: 'Seitenleiste einklappen', resize: 'Seitenleiste anpassen', resetWidth: 'Breite zurücksetzen', moreSections: 'Weitere Abschnitte', sections: 'Abschnitte der Seitenleiste' },
  el: { expand: 'Ανάπτυξη πλαϊνής στήλης', collapse: 'Σύμπτυξη πλαϊνής στήλης', resize: 'Αλλαγή πλάτους', resetWidth: 'Επαναφορά πλάτους', moreSections: 'Περισσότερες ενότητες', sections: 'Ενότητες πλαϊνής στήλης' },
  es: { expand: 'Expandir barra lateral', collapse: 'Contraer barra lateral', resize: 'Redimensionar barra lateral', resetWidth: 'Restablecer ancho', moreSections: 'Más secciones', sections: 'Secciones de la barra lateral' },
  fa: { expand: 'گسترش نوار کناری', collapse: 'جمع کردن نوار کناری', resize: 'تغییر اندازه نوار کناری', resetWidth: 'بازنشانی عرض نوار کناری', moreSections: 'بخش‌های بیشتر', sections: 'بخش‌های نوار کناری' },
  fr: { expand: 'Développer la barre latérale', collapse: 'Réduire la barre latérale', resize: 'Redimensionner la barre latérale', resetWidth: 'Réinitialiser la largeur', moreSections: 'Plus de sections', sections: 'Sections de la barre latérale' },
  id: { expand: 'Bentangkan bilah sisi', collapse: 'Ciutkan bilah sisi', resize: 'Ubah ukuran bilah sisi', resetWidth: 'Atur ulang lebar bilah sisi', moreSections: 'Bagian lainnya', sections: 'Bagian bilah sisi' },
  it: { expand: 'Espandi barra laterale', collapse: 'Comprimi barra laterale', resize: 'Ridimensiona barra laterale', resetWidth: 'Reimposta larghezza', moreSections: 'Altre sezioni', sections: 'Sezioni della barra laterale' },
  ja: { expand: 'サイドバーを展開', collapse: 'サイドバーを折りたたむ', resize: 'サイドバーの幅を変更', resetWidth: 'サイドバーの幅をリセット', moreSections: 'その他のセクション', sections: 'サイドバーのセクション' },
  ko: { expand: '사이드바 펼치기', collapse: '사이드바 접기', resize: '사이드바 너비 조절', resetWidth: '사이드바 너비 초기화', moreSections: '섹션 더 보기', sections: '사이드바 섹션' },
  ms: { expand: 'Kembangkan bar sisi', collapse: 'Runtuhkan bar sisi', resize: 'Ubah saiz bar sisi', resetWidth: 'Tetapkan semula lebar bar sisi', moreSections: 'Lagi bahagian', sections: 'Bahagian bar sisi' },
  nb: { expand: 'Utvid sidepanel', collapse: 'Skjul sidepanel', resize: 'Endre bredde på sidepanel', resetWidth: 'Tilbakestill bredde', moreSections: 'Flere seksjoner', sections: 'Sidepanelseksjoner' },
  nl: { expand: 'Zijbalk uitklappen', collapse: 'Zijbalk inklappen', resize: 'Zijbalkbreedte aanpassen', resetWidth: 'Breedte herstellen', moreSections: 'Meer secties', sections: 'Zijbalksecties' },
  pl: { expand: 'Rozwiń panel boczny', collapse: 'Zwiń panel boczny', resize: 'Zmień szerokość panelu', resetWidth: 'Przywróć szerokość panelu', moreSections: 'Więcej sekcji', sections: 'Sekcje panelu bocznego' },
  'pt-BR': { expand: 'Expandir barra lateral', collapse: 'Recolher barra lateral', resize: 'Redimensionar barra lateral', resetWidth: 'Redefinir largura', moreSections: 'Mais seções', sections: 'Seções da barra lateral' },
  pt: { expand: 'Expandir barra lateral', collapse: 'Recolher barra lateral', resize: 'Redimensionar barra lateral', resetWidth: 'Repor largura', moreSections: 'Mais secções', sections: 'Secções da barra lateral' },
  ru: { expand: 'Развернуть боковую панель', collapse: 'Свернуть боковую панель', resize: 'Изменить ширину панели', resetWidth: 'Сбросить ширину панели', moreSections: 'Ещё разделы', sections: 'Разделы боковой панели' },
  sv: { expand: 'Expandera sidopanelen', collapse: 'Fäll ihop sidopanelen', resize: 'Ändra sidopanelens bredd', resetWidth: 'Återställ bredden', moreSections: 'Fler sektioner', sections: 'Sidopanelens sektioner' },
  tr: { expand: 'Kenar çubuğunu genişlet', collapse: 'Kenar çubuğunu daralt', resize: 'Kenar çubuğunu yeniden boyutlandır', resetWidth: 'Genişliği sıfırla', moreSections: 'Daha fazla bölüm', sections: 'Kenar çubuğu bölümleri' },
  uk: { expand: 'Розгорнути бічну панель', collapse: 'Згорнути бічну панель', resize: 'Змінити ширину панелі', resetWidth: 'Скинути ширину панелі', moreSections: 'Більше розділів', sections: 'Розділи бічної панелі' },
  vi: { expand: 'Mở rộng thanh bên', collapse: 'Thu gọn thanh bên', resize: 'Thay đổi kích thước thanh bên', resetWidth: 'Đặt lại chiều rộng thanh bên', moreSections: 'Thêm mục', sections: 'Các mục thanh bên' },
  zh: { expand: '展开侧边栏', collapse: '折叠侧边栏', resize: '调整侧边栏宽度', resetWidth: '重置侧边栏宽度', moreSections: '更多分区', sections: '侧边栏分区' },
}

let changed = 0
for (const file of readdirSync(DIR).filter((f) => f.endsWith('.json'))) {
  const locale = file.replace(/\.json$/, '')
  const add = T[locale] ?? T.en
  const path = join(DIR, file)
  const json = JSON.parse(readFileSync(path, 'utf8'))
  json.ToolSidebar = { ...add, ...(json.ToolSidebar ?? {}) }
  writeFileSync(path, JSON.stringify(json, null, 2) + '\n')
  changed++
}
console.log(`updated ${changed} locale files`)
