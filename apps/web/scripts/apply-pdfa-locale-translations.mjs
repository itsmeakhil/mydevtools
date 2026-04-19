/**
 * One-off script: fills Navigation, Dashboard.tools, and PdfToPdfA for each locale
 * with proper translations. Reuses PdfCompressor (chooseFile, reset, pageCount,
 * invalidPdf, encryptedPdf) and PdfWatermark.working for consistency.
 *
 * Run: node scripts/apply-pdfa-locale-translations.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const messagesDir = path.join(__dirname, "../messages");

/** @typedef {{ nav: string, dashboardTitle: string, dashboardDesc: string, intro: string, privacyNote: string, disclaimer: string, levelLabel: string, levelHint: string, download: string, done: string, convertFailed: string, level: Record<string, string> }} Spec */

/** @type {Record<string, Spec>} */
const STRINGS = {
  en: {
    nav: "PDF to PDF/A",
    dashboardTitle: "PDF to PDF/A",
    dashboardDesc:
      "Convert PDFs to PDF/A for archival preservation and pick an ISO conformance level — all in your browser.",
    intro:
      "Convert PDF documents to PDF/A for archiving and long-term preservation.",
    privacyNote: "Your file never leaves this browser.",
    disclaimer:
      "This rebuilds your PDF with PDF/A identification (XMP pdfaid, sRGB output intent, and MarkInfo). Complex PDFs may still fail strict ISO validators (fonts, transparency, attachments). Use dedicated archival software if you need guaranteed compliance.",
    levelLabel: "PDF/A conformance",
    levelHint:
      'PDF/A-1b disables object streams for older archival expectations. PDF/A-2 and PDF/A-3 target modern PDF 1.7 workflows; "U" declares Unicode text assumptions.',
    download: "Convert & download",
    done: "PDF/A-tagged file downloaded.",
    convertFailed: "Could not convert this PDF. Try a different file.",
    level: {
      "1b": "PDF/A-1b (part 1, conformance B)",
      "2b": "PDF/A-2b (part 2, conformance B)",
      "2u": "PDF/A-2u (part 2, conformance U)",
      "3b": "PDF/A-3b (part 3, conformance B)",
      "3u": "PDF/A-3u (part 3, conformance U)",
    },
  },
  de: {
    nav: "PDF nach PDF/A",
    dashboardTitle: "PDF nach PDF/A",
    dashboardDesc:
      "Wandeln Sie PDFs für Archivierung und Langzeitbewahrung in PDF/A um und wählen Sie die ISO-Konformitätsstufe – alles in Ihrem Browser.",
    intro:
      "Wandeln Sie PDF-Dokumente für Archivierung und Langzeitbewahrung in PDF/A um.",
    privacyNote: "Ihre Datei verlässt diesen Browser nicht.",
    disclaimer:
      "Dies erstellt die PDF mit PDF/A-Kennzeichnung (XMP pdfaid, sRGB-Ausgabeintent und MarkInfo) neu. Komplexe PDFs können strenge ISO-Prüfungen dennoch nicht bestehen (Schriftarten, Transparenz, Anhänge). Für garantierte Konformität nutzen Sie spezialisierte Archivsoftware.",
    levelLabel: "PDF/A-Konformität",
    levelHint:
      'PDF/A-1b deaktiviert Objektstreams für ältere Archiverwartungen. PDF/A-2 und PDF/A-3 richten sich an moderne PDF-1.7-Workflows; "U" steht für Unicode-Textannahmen.',
    download: "Konvertieren & herunterladen",
    done: "Die mit PDF/A gekennzeichnete Datei wurde heruntergeladen.",
    convertFailed: "Dieses PDF konnte nicht konvertiert werden. Versuchen Sie eine andere Datei.",
    level: {
      "1b": "PDF/A-1b (Teil 1, Konformität B)",
      "2b": "PDF/A-2b (Teil 2, Konformität B)",
      "2u": "PDF/A-2u (Teil 2, Konformität U)",
      "3b": "PDF/A-3b (Teil 3, Konformität B)",
      "3u": "PDF/A-3u (Teil 3, Konformität U)",
    },
  },
  fr: {
    nav: "PDF vers PDF/A",
    dashboardTitle: "PDF vers PDF/A",
    dashboardDesc:
      "Convertissez des PDF en PDF/A pour l’archivage et la conservation longue durée, avec un niveau de conformité ISO au choix — le tout dans votre navigateur.",
    intro:
      "Convertissez des documents PDF en PDF/A pour l’archivage et la conservation à long terme.",
    privacyNote: "Votre fichier ne quitte jamais ce navigateur.",
    disclaimer:
      "Cette opération reconstruit le PDF avec les marqueurs PDF/A (XMP pdfaid, intention de sortie sRGB et MarkInfo). Les PDF complexes peuvent encore échouer aux validateurs ISO stricts (polices, transparence, pièces jointes). Utilisez un logiciel d’archivage dédié pour une conformité garantie.",
    levelLabel: "Conformité PDF/A",
    levelHint:
      'PDF/A-1b désactive les flux d’objets pour les attentes d’archivage plus anciennes. PDF/A-2 et PDF/A-3 ciblent les workflows PDF 1.7 modernes ; « U » indique des hypothèses de texte Unicode.',
    download: "Convertir et télécharger",
    done: "Fichier balisé PDF/A téléchargé.",
    convertFailed: "Impossible de convertir ce PDF. Essayez un autre fichier.",
    level: {
      "1b": "PDF/A-1b (partie 1, conformité B)",
      "2b": "PDF/A-2b (partie 2, conformité B)",
      "2u": "PDF/A-2u (partie 2, conformité U)",
      "3b": "PDF/A-3b (partie 3, conformité B)",
      "3u": "PDF/A-3u (partie 3, conformité U)",
    },
  },
  es: {
    nav: "PDF a PDF/A",
    dashboardTitle: "PDF a PDF/A",
    dashboardDesc:
      "Convierte PDF a PDF/A para archivo y conservación a largo plazo, con el nivel de conformidad ISO que elijas — todo en tu navegador.",
    intro:
      "Convierte documentos PDF a PDF/A para archivo y conservación a largo plazo.",
    privacyNote: "Tu archivo no sale nunca de este navegador.",
    disclaimer:
      "Esto reconstruye el PDF con identificación PDF/A (XMP pdfaid, intención de salida sRGB y MarkInfo). Los PDF complejos pueden seguir fallando validadores ISO estrictos (fuentes, transparencia, adjuntos). Usa software de archivo dedicado si necesitas conformidad garantizada.",
    levelLabel: "Conformidad PDF/A",
    levelHint:
      'PDF/A-1b desactiva flujos de objetos para expectativas de archivo más antiguas. PDF/A-2 y PDF/A-3 apuntan a flujos de trabajo PDF 1.7 modernos; « U » declara suposiciones de texto Unicode.',
    download: "Convertir y descargar",
    done: "Archivo etiquetado como PDF/A descargado.",
    convertFailed: "No se pudo convertir este PDF. Prueba con otro archivo.",
    level: {
      "1b": "PDF/A-1b (parte 1, conformidad B)",
      "2b": "PDF/A-2b (parte 2, conformidad B)",
      "2u": "PDF/A-2u (parte 2, conformidad U)",
      "3b": "PDF/A-3b (parte 3, conformidad B)",
      "3u": "PDF/A-3u (parte 3, conformidad U)",
    },
  },
  it: {
    nav: "PDF in PDF/A",
    dashboardTitle: "PDF in PDF/A",
    dashboardDesc:
      "Converti i PDF in PDF/A per archiviazione e conservazione a lungo termine, con il livello di conformità ISO desiderato — tutto nel browser.",
    intro:
      "Converti documenti PDF in PDF/A per archiviazione e conservazione a lungo termine.",
    privacyNote: "Il tuo file non lascia mai questo browser.",
    disclaimer:
      "Questo ricostruisce il PDF con identificazione PDF/A (XMP pdfaid, output intent sRGB e MarkInfo). I PDF complessi possono ancora non superare validatori ISO rigidi (font, trasparenza, allegati). Usa software di archiviazione dedicato per una conformità garantita.",
    levelLabel: "Conformità PDF/A",
    levelHint:
      'PDF/A-1b disabilita gli object stream per aspettative di archiviazione più datate. PDF/A-2 e PDF/A-3 sono per flussi di lavoro PDF 1.7 moderni; «U» indica assunzioni sul testo Unicode.',
    download: "Converti e scarica",
    done: "File contrassegnato PDF/A scaricato.",
    convertFailed: "Impossibile convertire questo PDF. Prova un altro file.",
    level: {
      "1b": "PDF/A-1b (parte 1, conformità B)",
      "2b": "PDF/A-2b (parte 2, conformità B)",
      "2u": "PDF/A-2u (parte 2, conformità U)",
      "3b": "PDF/A-3b (parte 3, conformità B)",
      "3u": "PDF/A-3u (parte 3, conformità U)",
    },
  },
  pt: {
    nav: "PDF para PDF/A",
    dashboardTitle: "PDF para PDF/A",
    dashboardDesc:
      "Converta PDFs para PDF/A para arquivo e preservação a longo prazo, com o nível de conformidade ISO que preferir — tudo no seu navegador.",
    intro:
      "Converta documentos PDF em PDF/A para arquivo e preservação a longo prazo.",
    privacyNote: "O seu ficheiro nunca sai deste navegador.",
    disclaimer:
      "Isto reconstrói o PDF com identificação PDF/A (XMP pdfaid, intenção de saída sRGB e MarkInfo). PDFs complexos podem ainda falhar validadores ISO rigorosos (tipos de letra, transparência, anexos). Use software de arquivo dedicado se precisar de conformidade garantida.",
    levelLabel: "Conformidade PDF/A",
    levelHint:
      'PDF/A-1b desativa fluxos de objeto para expectativas de arquivo mais antigas. PDF/A-2 e PDF/A-3 visam fluxos PDF 1.7 modernos; «U» declara pressupostos de texto Unicode.',
    download: "Converter e transferir",
    done: "Ficheiro etiquetado PDF/A transferido.",
    convertFailed: "Não foi possível converter este PDF. Tente outro ficheiro.",
    level: {
      "1b": "PDF/A-1b (parte 1, conformidade B)",
      "2b": "PDF/A-2b (parte 2, conformidade B)",
      "2u": "PDF/A-2u (parte 2, conformidade U)",
      "3b": "PDF/A-3b (parte 3, conformidade B)",
      "3u": "PDF/A-3u (parte 3, conformidade U)",
    },
  },
  "pt-BR": {
    nav: "PDF para PDF/A",
    dashboardTitle: "PDF para PDF/A",
    dashboardDesc:
      "Converta PDFs para PDF/A para arquivamento e preservação a longo prazo, com o nível de conformidade ISO desejado — tudo no seu navegador.",
    intro:
      "Converta documentos PDF em PDF/A para arquivamento e preservação a longo prazo.",
    privacyNote: "Seu arquivo nunca sai deste navegador.",
    disclaimer:
      "Isso reconstrói o PDF com identificação PDF/A (XMP pdfaid, output intent sRGB e MarkInfo). PDFs complexos ainda podem falhar em validadores ISO rigorosos (fontes, transparência, anexos). Use software de arquivamento dedicado se precisar de conformidade garantida.",
    levelLabel: "Conformidade PDF/A",
    levelHint:
      'PDF/A-1b desativa object streams para expectativas de arquivo mais antigas. PDF/A-2 e PDF/A-3 visam fluxos PDF 1.7 modernos; «U» declara suposições de texto Unicode.',
    download: "Converter e baixar",
    done: "Arquivo marcado como PDF/A baixado.",
    convertFailed: "Não foi possível converter este PDF. Tente outro arquivo.",
    level: {
      "1b": "PDF/A-1b (parte 1, conformidade B)",
      "2b": "PDF/A-2b (parte 2, conformidade B)",
      "2u": "PDF/A-2u (parte 2, conformidade U)",
      "3b": "PDF/A-3b (parte 3, conformidade B)",
      "3u": "PDF/A-3u (parte 3, conformidade U)",
    },
  },
  nl: {
    nav: "PDF naar PDF/A",
    dashboardTitle: "PDF naar PDF/A",
    dashboardDesc:
      "Zet PDF’s om naar PDF/A voor archivering en langetermijnbewaring, met het gewenste ISO-conformiteitsniveau — volledig in je browser.",
    intro: "Zet PDF-documenten om naar PDF/A voor archivering en langetermijnbewaring.",
    privacyNote: "Je bestand verlaat deze browser nooit.",
    disclaimer:
      "Dit bouwt de PDF opnieuw op met PDF/A-markering (XMP pdfaid, sRGB-outputintent en MarkInfo). Complexe PDF’s kunnen nog steeds falen voor strikte ISO-validators (lettertypen, transparantie, bijlagen). Gebruik gespecialiseerde archiveringssoftware voor gegarandeerde conformiteit.",
    levelLabel: "PDF/A-conformiteit",
    levelHint:
      'PDF/A-1b schakelt objectstreams uit voor oudere archiefverwachtingen. PDF/A-2 en PDF/A-3 richten zich op moderne PDF 1.7-workflows; "U" betekent Unicode-tekstveronderstellingen.',
    download: "Converteren en downloaden",
    done: "PDF/A-gemarkeerd bestand gedownload.",
    convertFailed: "Deze PDF kon niet worden geconverteerd. Probeer een ander bestand.",
    level: {
      "1b": "PDF/A-1b (deel 1, conformiteit B)",
      "2b": "PDF/A-2b (deel 2, conformiteit B)",
      "2u": "PDF/A-2u (deel 2, conformiteit U)",
      "3b": "PDF/A-3b (deel 3, conformiteit B)",
      "3u": "PDF/A-3u (deel 3, conformiteit U)",
    },
  },
  sv: {
    nav: "PDF till PDF/A",
    dashboardTitle: "PDF till PDF/A",
    dashboardDesc:
      "Konvertera PDF till PDF/A för arkivering och långtidsbevarande med valfri ISO-konformitetsnivå — allt i din webbläsare.",
    intro: "Konvertera PDF-dokument till PDF/A för arkivering och långtidsbevarande.",
    privacyNote: "Din fil lämnar aldrig den här webbläsaren.",
    disclaimer:
      "Detta bygger om PDF:en med PDF/A-markering (XMP pdfaid, sRGB-utdataavsikt och MarkInfo). Komplexa PDF:er kan fortfarande fallera mot strikta ISO-validerare (typsnitt, transparens, bilagor). Använd dedikerad arkivprogramvara om du behöver garanterad efterlevnad.",
    levelLabel: "PDF/A-konformitet",
    levelHint:
      'PDF/A-1b inaktiverar objektströmmar för äldre arkivförväntningar. PDF/A-2 och PDF/A-3 riktar sig mot moderna PDF 1.7-arbetsflöden; "U" anger Unicode-textantaganden.',
    download: "Konvertera och ladda ner",
    done: "PDF/A-märkt fil nedladdad.",
    convertFailed: "Det gick inte att konvertera den här PDF:en. Prova en annan fil.",
    level: {
      "1b": "PDF/A-1b (del 1, konformitet B)",
      "2b": "PDF/A-2b (del 2, konformitet B)",
      "2u": "PDF/A-2u (del 2, konformitet U)",
      "3b": "PDF/A-3b (del 3, konformitet B)",
      "3u": "PDF/A-3u (del 3, konformitet U)",
    },
  },
  da: {
    nav: "PDF til PDF/A",
    dashboardTitle: "PDF til PDF/A",
    dashboardDesc:
      "Konvertér PDF-filer til PDF/A til arkivering og langtidsbevaring med valgfrit ISO-overensstemmelsesniveau — alt i din browser.",
    intro: "Konvertér PDF-dokumenter til PDF/A til arkivering og langtidsbevaring.",
    privacyNote: "Din fil forlader aldrig denne browser.",
    disclaimer:
      "Dette genopbygger PDF’en med PDF/A-markering (XMP pdfaid, sRGB-outputintent og MarkInfo). Komplekse PDF’er kan stadig fejle over for strenge ISO-validatorer (skrifttyper, gennemsigtighed, vedhæftninger). Brug dedikeret arkiveringssoftware, hvis du skal have garanteret overensstemmelse.",
    levelLabel: "PDF/A-overensstemmelse",
    levelHint:
      'PDF/A-1b deaktiverer objektstreams til ældre arkivforventninger. PDF/A-2 og PDF/A-3 sigter mod moderne PDF 1.7-workflows; "U" angiver antagelser om Unicode-tekst.',
    download: "Konvertér og download",
    done: "PDF/A-mærket fil downloadet.",
    convertFailed: "Denne PDF kunne ikke konverteres. Prøv en anden fil.",
    level: {
      "1b": "PDF/A-1b (del 1, overensstemmelse B)",
      "2b": "PDF/A-2b (del 2, overensstemmelse B)",
      "2u": "PDF/A-2u (del 2, overensstemmelse U)",
      "3b": "PDF/A-3b (del 3, overensstemmelse B)",
      "3u": "PDF/A-3u (del 3, overensstemmelse U)",
    },
  },
  nb: {
    nav: "PDF til PDF/A",
    dashboardTitle: "PDF til PDF/A",
    dashboardDesc:
      "Konverter PDF-filer til PDF/A for arkivering og langtidsbevaring med ønsket ISO-samsvarsnivå — alt i nettleseren din.",
    intro: "Konverter PDF-dokumenter til PDF/A for arkivering og langtidsbevaring.",
    privacyNote: "Filen din forlater aldri denne nettleseren.",
    disclaimer:
      "Dette bygger PDF-en på nytt med PDF/A-merking (XMP pdfaid, sRGB-utdatahensikt og MarkInfo). Komplekse PDF-er kan fortsatt feile mot strenge ISO-validerere (fonter, gjennomsiktighet, vedlegg). Bruk dedikert arkiveringsprogramvare hvis du trenger garantert samsvar.",
    levelLabel: "PDF/A-samsvar",
    levelHint:
      'PDF/A-1b slår av objektstrømmer for eldre arkivforventninger. PDF/A-2 og PDF/A-3 retter seg mot moderne PDF 1.7-arbeidsflyter; «U» angir antakelser om Unicode-tekst.',
    download: "Konverter og last ned",
    done: "PDF/A-merket fil lastet ned.",
    convertFailed: "Kunne ikke konvertere denne PDF-en. Prøv en annen fil.",
    level: {
      "1b": "PDF/A-1b (del 1, samsvar B)",
      "2b": "PDF/A-2b (del 2, samsvar B)",
      "2u": "PDF/A-2u (del 2, samsvar U)",
      "3b": "PDF/A-3b (del 3, samsvar B)",
      "3u": "PDF/A-3u (del 3, samsvar U)",
    },
  },
  ca: {
    nav: "PDF a PDF/A",
    dashboardTitle: "PDF a PDF/A",
    dashboardDesc:
      "Converteix PDF a PDF/A per a arxivatge i preservació a llarg termini, amb el nivell de conformitat ISO que triïs — tot al navegador.",
    intro:
      "Converteix documents PDF a PDF/A per a arxivatge i preservació a llarg termini.",
    privacyNote: "El teu fitxer no surt mai d’aquest navegador.",
    disclaimer:
      "Això reconstrueix el PDF amb identificació PDF/A (XMP pdfaid, intenció de sortida sRGB i MarkInfo). Els PDF complexos poden seguir fallant validadors ISO estricts (tipus de lletra, transparència, adjunts). Fes servir programari d’arxivament dedicat si necessites conformitat garantida.",
    levelLabel: "Conformitat PDF/A",
    levelHint:
      'PDF/A-1b desactiva fluxos d’objecte per a expectatives d’arxivament més antigues. PDF/A-2 i PDF/A-3 apunten a fluxos de treball PDF 1.7 moderns; «U» declara suposicions de text Unicode.',
    download: "Converteix i descarrega",
    done: "Fitxer etiquetat com a PDF/A descarregat.",
    convertFailed: "No s’ha pogut convertir aquest PDF. Prova un altre fitxer.",
    level: {
      "1b": "PDF/A-1b (part 1, conformitat B)",
      "2b": "PDF/A-2b (part 2, conformitat B)",
      "2u": "PDF/A-2u (part 2, conformitat U)",
      "3b": "PDF/A-3b (part 3, conformitat B)",
      "3u": "PDF/A-3u (part 3, conformitat U)",
    },
  },
  pl: {
    nav: "PDF do PDF/A",
    dashboardTitle: "PDF do PDF/A",
    dashboardDesc:
      "Konwertuj pliki PDF do PDF/A w celu archiwizacji i długotrwałego przechowywania, wybierając poziom zgodności ISO — wszystko w przeglądarce.",
    intro:
      "Konwertuj dokumenty PDF do formatu PDF/A w celu archiwizacji i długotrwałego przechowywania.",
    privacyNote: "Twój plik nigdy nie opuszcza tej przeglądarki.",
    disclaimer:
      "To odbudowuje plik PDF ze znacznikami PDF/A (XMP pdfaid, intencja wyjścia sRGB i MarkInfo). Złożone pliki PDF mogą nadal nie przejść ścisłych walidatorów ISO (czcionki, przezroczystość, załączniki). Użyj dedykowanego oprogramowania archiwizacyjnego, jeśli potrzebujesz gwarantowanej zgodności.",
    levelLabel: "Zgodność PDF/A",
    levelHint:
      'PDF/A-1b wyłącza strumienie obiektów pod starsze oczekiwania archiwalne. PDF/A-2 i PDF/A-3 są dla nowoczesnych przepływów PDF 1.7; „U” oznacza założenia dotyczące tekstu Unicode.',
    download: "Konwertuj i pobierz",
    done: "Oznaczony plik PDF/A został pobrany.",
    convertFailed: "Nie udało się przekonwertować tego pliku PDF. Spróbuj innego pliku.",
    level: {
      "1b": "PDF/A-1b (część 1, zgodność B)",
      "2b": "PDF/A-2b (część 2, zgodność B)",
      "2u": "PDF/A-2u (część 2, zgodność U)",
      "3b": "PDF/A-3b (część 3, zgodność B)",
      "3u": "PDF/A-3u (część 3, zgodność U)",
    },
  },
  cs: {
    nav: "PDF do PDF/A",
    dashboardTitle: "PDF do PDF/A",
    dashboardDesc:
      "Převeďte PDF do PDF/A pro archivaci a dlouhodobou ochranu, s úrovní shody ISO dle výběru — vše v prohlížeči.",
    intro: "Převeďte dokumenty PDF do PDF/A pro archivaci a dlouhodobou ochranu.",
    privacyNote: "Váš soubor tento prohlížeč nikdy neopustí.",
    disclaimer:
      "Tím se PDF znovu sestaví s identifikací PDF/A (XMP pdfaid, výstupní záměr sRGB a MarkInfo). Složitá PDF mohou stále selhat u přísných ISO validátorů (písma, průhlednost, přílohy). Pro zaručenou shodu použijte specializovaný archivační software.",
    levelLabel: "Shoda PDF/A",
    levelHint:
      'PDF/A-1b vypíná objektové streamy kvůli starším archivním očekáváním. PDF/A-2 a PDF/A-3 cílí na moderní pracovní postupy PDF 1.7; „U“ označuje předpoklady Unicode textu.',
    download: "Převést a stáhnout",
    done: "Soubor označený jako PDF/A byl stažen.",
    convertFailed: "Tento PDF soubor se nepodařilo převést. Zkuste jiný soubor.",
    level: {
      "1b": "PDF/A-1b (část 1, shoda B)",
      "2b": "PDF/A-2b (část 2, shoda B)",
      "2u": "PDF/A-2u (část 2, shoda U)",
      "3b": "PDF/A-3b (část 3, shoda B)",
      "3u": "PDF/A-3u (část 3, shoda U)",
    },
  },
  ru: {
    nav: "PDF в PDF/A",
    dashboardTitle: "PDF в PDF/A",
    dashboardDesc:
      "Конвертируйте PDF в PDF/A для архивного хранения и долговременного сохранения с выбранным уровнем соответствия ISO — всё в браузере.",
    intro:
      "Конвертируйте PDF-документы в PDF/A для архивирования и долговременного хранения.",
    privacyNote: "Ваш файл никогда не покидает этот браузер.",
    disclaimer:
      "PDF пересобирается с маркировкой PDF/A (XMP pdfaid, выходной профиль sRGB и MarkInfo). Сложные PDF всё ещё могут не проходить строгие ISO-валидаторы (шрифты, прозрачность, вложения). Для гарантированного соответствия используйте специализированное архивное ПО.",
    levelLabel: "Соответствие PDF/A",
    levelHint:
      'PDF/A-1b отключает потоки объектов под старые архивные требования. PDF/A-2 и PDF/A-3 ориентированы на современные сценарии PDF 1.7; «U» задаёт предположения о Unicode-тексте.',
    download: "Конвертировать и скачать",
    done: "Файл с меткой PDF/A скачан.",
    convertFailed: "Не удалось конвертировать этот PDF. Попробуйте другой файл.",
    level: {
      "1b": "PDF/A-1b (часть 1, соответствие B)",
      "2b": "PDF/A-2b (часть 2, соответствие B)",
      "2u": "PDF/A-2u (часть 2, соответствие U)",
      "3b": "PDF/A-3b (часть 3, соответствие B)",
      "3u": "PDF/A-3u (часть 3, соответствие U)",
    },
  },
  uk: {
    nav: "PDF у PDF/A",
    dashboardTitle: "PDF у PDF/A",
    dashboardDesc:
      "Конвертуйте PDF у PDF/A для архівного зберігання та довготривалого збереження з обраним рівнем відповідності ISO — усе в браузері.",
    intro:
      "Конвертуйте PDF-документи у PDF/A для архівування та довготривалого збереження.",
    privacyNote: "Ваш файл ніколи не залишає цей браузер.",
    disclaimer:
      "PDF збирається знову з маркуванням PDF/A (XMP pdfaid, вихідний намір sRGB та MarkInfo). Складні PDF можуть не пройти суворі ISO-валідатори (шрифти, прозорість, вкладення). Для гарантованої відповідності використовуйте спеціалізоване архівне ПЗ.",
    levelLabel: "Відповідність PDF/A",
    levelHint:
      'PDF/A-1b вимикає потоки об’єктів для старіших архівних очікувань. PDF/A-2 і PDF/A-3 — для сучасних сценаріїв PDF 1.7; «U» позначає припущення щодо Unicode-тексту.',
    download: "Конвертувати й завантажити",
    done: "Файл із позначкою PDF/A завантажено.",
    convertFailed: "Не вдалося конвертувати цей PDF. Спробуйте інший файл.",
    level: {
      "1b": "PDF/A-1b (частина 1, відповідність B)",
      "2b": "PDF/A-2b (частина 2, відповідність B)",
      "2u": "PDF/A-2u (частина 2, відповідність U)",
      "3b": "PDF/A-3b (частина 3, відповідність B)",
      "3u": "PDF/A-3u (частина 3, відповідність U)",
    },
  },
  el: {
    nav: "PDF σε PDF/A",
    dashboardTitle: "PDF σε PDF/A",
    dashboardDesc:
      "Μετατρέψτε PDF σε PDF/A για αρχειοθέτηση και μακροχρόνια διατήρηση, με επίπεδο συμμόρφωσης ISO της επιλογής σας — όλα στον browser σας.",
    intro:
      "Μετατρέψτε έγγραφα PDF σε PDF/A για αρχειοθέτηση και μακροχρόνια διατήρηση.",
    privacyNote: "Το αρχείο σας δεν φεύγει ποτέ από αυτόν τον browser.",
    disclaimer:
      "Αυτό ξαναχτίζει το PDF με αναγνώριση PDF/A (XMP pdfaid, πρόθεση εξόδου sRGB και MarkInfo). Σύνθετα PDF μπορεί ακόμη να αποτυγχάνουν σε αυστηρούς επικυρωτές ISO (γραμματοσειρές, διαφάνεια, συνημμένα). Χρησιμοποιήστε εξειδικευμένο λογισμικό αρχειοθέτησης για εγγυημένη συμμόρφωση.",
    levelLabel: "Συμμόρφωση PDF/A",
    levelHint:
      'Το PDF/A-1b απενεργοποιεί ροές αντικειμένων για παλαιότερες προσδοκίες αρχειοθέτησης. PDF/A-2 και PDF/A-3 στοχεύουν σε σύγχρονες ροές PDF 1.7· το «U» δηλώνει υποθέσεις Unicode κειμένου.',
    download: "Μετατροπή και λήψη",
    done: "Λήφθηκε αρχείο με επισήμανση PDF/A.",
    convertFailed: "Δεν ήταν δυνατή η μετατροπή αυτού του PDF. Δοκιμάστε άλλο αρχείο.",
    level: {
      "1b": "PDF/A-1b (μέρος 1, συμμόρφωση B)",
      "2b": "PDF/A-2b (μέρος 2, συμμόρφωση B)",
      "2u": "PDF/A-2u (μέρος 2, συμμόρφωση U)",
      "3b": "PDF/A-3b (μέρος 3, συμμόρφωση B)",
      "3u": "PDF/A-3u (μέρος 3, συμμόρφωση U)",
    },
  },
  tr: {
    nav: "PDF’den PDF/A’ya",
    dashboardTitle: "PDF’den PDF/A’ya",
    dashboardDesc:
      "Arşivleme ve uzun süreli saklama için PDF’leri PDF/A’ya dönüştürün; istediğiniz ISO uyumluluk düzeyi — hepsi tarayıcınızda.",
    intro:
      "Arşivleme ve uzun süreli saklama için PDF belgelerini PDF/A formatına dönüştürün.",
    privacyNote: "Dosyanız bu tarayıcıdan asla çıkmaz.",
    disclaimer:
      "Bu işlem, PDF’yi PDF/A tanımlaması (XMP pdfaid, sRGB çıktı niyeti ve MarkInfo) ile yeniden oluşturur. Karmaşık PDF’ler katı ISO doğrulayıcılarında hâlâ başarısız olabilir (yazı tipleri, şeffaflık, ekler). Garanti uyumluluk için özel arşiv yazılımı kullanın.",
    levelLabel: "PDF/A uyumluluğu",
    levelHint:
      'PDF/A-1b, eski arşiv beklentileri için nesne akışlarını kapatır. PDF/A-2 ve PDF/A-3 modern PDF 1.7 iş akışları içindir; «U» Unicode metin varsayımlarını belirtir.',
    download: "Dönüştür ve indir",
    done: "PDF/A etiketli dosya indirildi.",
    convertFailed: "Bu PDF dönüştürülemedi. Başka bir dosya deneyin.",
    level: {
      "1b": "PDF/A-1b (bölüm 1, B uyumluluğu)",
      "2b": "PDF/A-2b (bölüm 2, B uyumluluğu)",
      "2u": "PDF/A-2u (bölüm 2, U uyumluluğu)",
      "3b": "PDF/A-3b (bölüm 3, B uyumluluğu)",
      "3u": "PDF/A-3u (bölüm 3, U uyumluluğu)",
    },
  },
  id: {
    nav: "PDF ke PDF/A",
    dashboardTitle: "PDF ke PDF/A",
    dashboardDesc:
      "Ubah PDF ke PDF/A untuk arsip dan pelestarian jangka panjang, dengan tingkat kesesuaian ISO pilihan Anda — semuanya di browser.",
    intro:
      "Ubah dokumen PDF ke PDF/A untuk pengarsipan dan pelestarian jangka panjang.",
    privacyNote: "Berkas Anda tidak pernah meninggalkan browser ini.",
    disclaimer:
      "Ini membangun ulang PDF dengan identifikasi PDF/A (XMP pdfaid, output intent sRGB, dan MarkInfo). PDF kompleks mungkin masih gagal pada validator ISO ketat (font, transparansi, lampiran). Gunakan perangkat lunak arsip khusus jika Anda membutuhkan kepatuhan terjamin.",
    levelLabel: "Kesesuaian PDF/A",
    levelHint:
      'PDF/A-1b menonaktifkan aliran objek untuk ekspektasi arsip lama. PDF/A-2 dan PDF/A-3 untuk alur kerja PDF 1.7 modern; «U» menyatakan asumsi teks Unicode.',
    download: "Konversi & unduh",
    done: "Berkas bertanda PDF/A telah diunduh.",
    convertFailed: "Tidak dapat mengonversi PDF ini. Coba berkas lain.",
    level: {
      "1b": "PDF/A-1b (bagian 1, kesesuaian B)",
      "2b": "PDF/A-2b (bagian 2, kesesuaian B)",
      "2u": "PDF/A-2u (bagian 2, kesesuaian U)",
      "3b": "PDF/A-3b (bagian 3, kesesuaian B)",
      "3u": "PDF/A-3u (bagian 3, kesesuaian U)",
    },
  },
  vi: {
    nav: "PDF sang PDF/A",
    dashboardTitle: "PDF sang PDF/A",
    dashboardDesc:
      "Chuyển PDF sang PDF/A để lưu trữ và bảo quản lâu dài, chọn mức tuân thủ ISO — hoàn toàn trong trình duyệt.",
    intro:
      "Chuyển tài liệu PDF sang PDF/A để lưu trữ và bảo quản lâu dài.",
    privacyNote: "Tệp của bạn không bao giờ rời khỏi trình duyệt này.",
    disclaimer:
      "Thao tác này tái tạo PDF với định danh PDF/A (XMP pdfaid, output intent sRGB và MarkInfo). PDF phức tạp vẫn có thể không qua được bộ kiểm tra ISO nghiêm ngặt (phông chữ, độ trong suốt, tệp đính kèm). Hãy dùng phần mềm lưu trữ chuyên dụng nếu cần tuân thủ chắc chắn.",
    levelLabel: "Tuân thủ PDF/A",
    levelHint:
      'PDF/A-1b tắt luồng đối tượng cho kỳ vọng lưu trữ cũ hơn. PDF/A-2 và PDF/A-3 hướng tới quy trình PDF 1.7 hiện đại; «U» khai báo giả định văn bản Unicode.',
    download: "Chuyển đổi & tải xuống",
    done: "Đã tải xuống tệp gắn nhãn PDF/A.",
    convertFailed: "Không thể chuyển đổi PDF này. Hãy thử tệp khác.",
    level: {
      "1b": "PDF/A-1b (phần 1, tuân thủ B)",
      "2b": "PDF/A-2b (phần 2, tuân thủ B)",
      "2u": "PDF/A-2u (phần 2, tuân thủ U)",
      "3b": "PDF/A-3b (phần 3, tuân thủ B)",
      "3u": "PDF/A-3u (phần 3, tuân thủ U)",
    },
  },
  ms: {
    nav: "PDF ke PDF/A",
    dashboardTitle: "PDF ke PDF/A",
    dashboardDesc:
      "Tukar PDF ke PDF/A untuk arkib dan pemeliharaan jangka panjang, dengan tahap pematuhan ISO pilihan anda — semuanya dalam pelayar.",
    intro:
      "Tukar dokumen PDF ke PDF/A untuk arkib dan pemeliharaan jangka panjang.",
    privacyNote: "Fail anda tidak pernah meninggalkan pelayar ini.",
    disclaimer:
      "Ini membina semula PDF dengan pengenalan PDF/A (XMP pdfaid, niat output sRGB dan MarkInfo). PDF kompleks mungkin masih gagal pada pengesah ISO yang ketat (fon, ketelusan, lampiran). Gunakan perisian arkib khusus jika anda memerlukan pematuhan terjamin.",
    levelLabel: "Pematuhan PDF/A",
    levelHint:
      'PDF/A-1b melumpuhkan strim objek untuk jangkaan arkib lama. PDF/A-2 dan PDF/A-3 untuk aliran kerja PDF 1.7 moden; «U» menyatakan andaian teks Unicode.',
    download: "Tukar & muat turun",
    done: "Fail berlabel PDF/A dimuat turun.",
    convertFailed: "PDF ini tidak dapat ditukar. Cuba fail lain.",
    level: {
      "1b": "PDF/A-1b (bahagian 1, pematuhan B)",
      "2b": "PDF/A-2b (bahagian 2, pematuhan B)",
      "2u": "PDF/A-2u (bahagian 2, pematuhan U)",
      "3b": "PDF/A-3b (bahagian 3, pematuhan B)",
      "3u": "PDF/A-3u (bahagian 3, pematuhan U)",
    },
  },
  ar: {
    nav: "PDF إلى PDF/A",
    dashboardTitle: "PDF إلى PDF/A",
    dashboardDesc:
      "حوّل ملفات PDF إلى PDF/A للأرشفة والحفظ طويل الأمد مع مستوى مطابقة ISO الذي تختاره — كله داخل المتصفح.",
    intro: "حوّل مستندات PDF إلى PDF/A للأرشفة والحفظ طويل الأمد.",
    privacyNote: "ملفك لا يغادر هذا المتصفح أبدًا.",
    disclaimer:
      "يعيد هذا بناء ملف PDF مع تعريف PDF/A (XMP pdfaid ونية الإخراج sRGB وMarkInfo). قد تفشل ملفات PDF المعقدة في مراجعي ISO الصارمين (الخطوط، الشفافية، المرفقات). استخدم برامج أرشفة متخصصة إذا كنت بحاجة إلى مطابقة مضمونة.",
    levelLabel: "مطابقة PDF/A",
    levelHint:
      'يعطّل PDF/A-1b تدفقات الكائنات لتوقعات الأرشفة الأقدم. يستهدف PDF/A-2 وPDF/A-3 سير عمل PDF 1.7 الحديثة؛ «U» يعلن عن افتراضات نص يونيكود.',
    download: "تحويل وتنزيل",
    done: "تم تنزيل الملف الموسوم بـ PDF/A.",
    convertFailed: "تعذر تحويل ملف PDF هذا. جرّب ملفًا آخر.",
    level: {
      "1b": "PDF/A-1b (الجزء 1، مطابقة B)",
      "2b": "PDF/A-2b (الجزء 2، مطابقة B)",
      "2u": "PDF/A-2u (الجزء 2، مطابقة U)",
      "3b": "PDF/A-3b (الجزء 3، مطابقة B)",
      "3u": "PDF/A-3u (الجزء 3، مطابقة U)",
    },
  },
  fa: {
    nav: "PDF به PDF/A",
    dashboardTitle: "PDF به PDF/A",
    dashboardDesc:
      "PDFها را برای بایگانی و حفظ بلندمدت به PDF/A تبدیل کنید و سطح انطباق ISO را انتخاب کنید — همه در مرورگر.",
    intro: "اسناد PDF را برای بایگانی و حفظ بلندمدت به PDF/A تبدیل کنید.",
    privacyNote: "فایل شما هرگز این مرورگر را ترک نمی‌کند.",
    disclaimer:
      "این کار PDF را با شناسایی PDF/A (XMP pdfaid، قصد خروجی sRGB و MarkInfo) بازسازی می‌کند. PDFهای پیچیده ممکن است در اعتبارسنج‌های سخت‌گیر ISO رد شوند (فونت‌ها، شفافیت، پیوست‌ها). برای انطباق تضمین‌شده از نرم‌افزار بایگانی تخصصی استفاده کنید.",
    levelLabel: "انطباق PDF/A",
    levelHint:
      'PDF/A-1b جریان‌های شیء را برای انتظارات بایگانی قدیمی‌تر غیرفعال می‌کند. PDF/A-2 و PDF/A-3 برای گردش کار مدرن PDF 1.7 هستند؛ «U» فرضیات متن یونیکد را اعلام می‌کند.',
    download: "تبدیل و بارگیری",
    done: "فایل برچسب‌دار PDF/A بارگیری شد.",
    convertFailed: "تبدیل این PDF ممکن نشد. فایل دیگری امتحان کنید.",
    level: {
      "1b": "PDF/A-1b (بخش ۱، انطباق B)",
      "2b": "PDF/A-2b (بخش ۲، انطباق B)",
      "2u": "PDF/A-2u (بخش ۲، انطباق U)",
      "3b": "PDF/A-3b (بخش ۳، انطباق B)",
      "3u": "PDF/A-3u (بخش ۳، انطباق U)",
    },
  },
  zh: {
    nav: "PDF 转 PDF/A",
    dashboardTitle: "PDF 转 PDF/A",
    dashboardDesc:
      "将 PDF 转为 PDF/A，用于归档与长期保存，并可选择 ISO 符合性级别 — 全部在浏览器中完成。",
    intro: "将 PDF 文档转换为 PDF/A，用于归档与长期保存。",
    privacyNote: "您的文件不会离开本浏览器。",
    disclaimer:
      "此操作会使用 PDF/A 标识（XMP pdfaid、sRGB 输出意图和 MarkInfo）重建 PDF。复杂的 PDF 仍可能无法通过严格的 ISO 校验（字体、透明度、附件）。若需保证符合性，请使用专业归档软件。",
    levelLabel: "PDF/A 符合性",
    levelHint:
      "PDF/A-1b 关闭对象流以适配较旧的归档预期。PDF/A-2 与 PDF/A-3 面向现代 PDF 1.7 流程；“U”表示 Unicode 文本假设。",
    download: "转换并下载",
    done: "已下载带 PDF/A 标记的文件。",
    convertFailed: "无法转换此 PDF。请尝试其他文件。",
    level: {
      "1b": "PDF/A-1b（第 1 部分，符合性 B）",
      "2b": "PDF/A-2b（第 2 部分，符合性 B）",
      "2u": "PDF/A-2u（第 2 部分，符合性 U）",
      "3b": "PDF/A-3b（第 3 部分，符合性 B）",
      "3u": "PDF/A-3u（第 3 部分，符合性 U）",
    },
  },
  ja: {
    nav: "PDFをPDF/Aへ",
    dashboardTitle: "PDFをPDF/Aへ",
    dashboardDesc:
      "アーカイブと長期保存のため、PDFをPDF/Aに変換。ISO適合レベルを選択 — すべてブラウザ内で処理。",
    intro: "アーカイブと長期保存のため、PDFドキュメントをPDF/Aに変換します。",
    privacyNote: "ファイルはこのブラウザの外に送信されません。",
    disclaimer:
      "PDF/A識別情報（XMP pdfaid、sRGB出力インテント、MarkInfo）を付与してPDFを再構築します。複雑なPDFは、厳格なISOバリデータ（フォント、透明度、添付ファイル）で不合格になる場合があります。確実な適合が必要な場合は専用のアーカイブソフトを使用してください。",
    levelLabel: "PDF/A適合",
    levelHint:
      "PDF/A-1bは旧来のアーカイブ想定のためオブジェクトストリームを無効化します。PDF/A-2およびPDF/A-3は現行のPDF 1.7ワークフロー向けです。「U」はUnicodeテキストの前提を示します。",
    download: "変換してダウンロード",
    done: "PDF/Aタグ付きファイルをダウンロードしました。",
    convertFailed: "このPDFを変換できませんでした。別のファイルを試してください。",
    level: {
      "1b": "PDF/A-1b（パート1、適合B）",
      "2b": "PDF/A-2b（パート2、適合B）",
      "2u": "PDF/A-2u（パート2、適合U）",
      "3b": "PDF/A-3b（パート3、適合B）",
      "3u": "PDF/A-3u（パート3、適合U）",
    },
  },
  ko: {
    nav: "PDF를 PDF/A로",
    dashboardTitle: "PDF를 PDF/A로",
    dashboardDesc:
      "보관 및 장기 보존을 위해 PDF를 PDF/A로 변환하고 ISO 적합 수준을 선택하세요 — 모두 브라우저에서 처리됩니다.",
    intro: "보관 및 장기 보존을 위해 PDF 문서를 PDF/A로 변환합니다.",
    privacyNote: "파일은 이 브라우저를 벗어나지 않습니다.",
    disclaimer:
      "PDF/A 식별(XMP pdfaid, sRGB 출력 인텐트, MarkInfo)을 추가하여 PDF를 다시 구성합니다. 복잡한 PDF는 엄격한 ISO 검증(글꼴, 투명도, 첨부 파일)에서 여전히 실패할 수 있습니다. 보장된 적합이 필요하면 전용 보관 소프트웨어를 사용하세요.",
    levelLabel: "PDF/A 적합",
    levelHint:
      'PDF/A-1b는 이전 보관 환경을 위해 객체 스트림을 사용하지 않습니다. PDF/A-2와 PDF/A-3은 최신 PDF 1.7 워크플로를 대상으로 합니다. "U"는 유니코드 텍스트 가정을 나타냅니다.',
    download: "변환 후 다운로드",
    done: "PDF/A로 태그된 파일이 다운로드되었습니다.",
    convertFailed: "이 PDF를 변환할 수 없습니다. 다른 파일을 시도하세요.",
    level: {
      "1b": "PDF/A-1b(파트 1, 적합 B)",
      "2b": "PDF/A-2b(파트 2, 적합 B)",
      "2u": "PDF/A-2u(파트 2, 적합 U)",
      "3b": "PDF/A-3b(파트 3, 적합 B)",
      "3u": "PDF/A-3u(파트 3, 적합 U)",
    },
  },
  af: {
    nav: "PDF na PDF/A",
    dashboardTitle: "PDF na PDF/A",
    dashboardDesc:
      "Skakel PDF’s om na PDF/A vir argivering en langtermynbewaring, met die ISO-voldoeningsvlak van jou keuse — alles in jou blaaier.",
    intro: "Skakel PDF-dokumente om na PDF/A vir argivering en langtermynbewaring.",
    privacyNote: "Jou lêer verlaat nooit hierdie blaaier nie.",
    disclaimer:
      "Hierdie bou die PDF weer op met PDF/A-identifikasie (XMP pdfaid, sRGB-uitsetbedoeling en MarkInfo). Komplekse PDF’s kan steeds misluk by streng ISO-valideerders (lettertipes, deursigtigheid, aanhegsels). Gebruik toegewyde argiveringsprogrammatuur as jy gewaarborgde voldoening benodig.",
    levelLabel: "PDF/A-voldoening",
    levelHint:
      'PDF/A-1b skakel voorwerpstrome af vir ouer argiveringsverwagtinge. PDF/A-2 en PDF/A-3 teiken moderne PDF 1.7-werksvloei; "U" verklaar Unicode-teksaanames.',
    download: "Skakel om en laai af",
    done: "PDF/A-gemerkte lêer afgelaai.",
    convertFailed: "Kon nie hierdie PDF omskakel nie. Probeer ’n ander lêer.",
    level: {
      "1b": "PDF/A-1b (deel 1, voldoening B)",
      "2b": "PDF/A-2b (deel 2, voldoening B)",
      "2u": "PDF/A-2u (deel 2, voldoening U)",
      "3b": "PDF/A-3b (deel 3, voldoening B)",
      "3u": "PDF/A-3u (deel 3, voldoening U)",
    },
  },
};

const LOCALES = [
  "en",
  "fr",
  "es",
  "ar",
  "ca",
  "zh",
  "cs",
  "el",
  "de",
  "da",
  "af",
  "id",
  "fa",
  "ru",
  "it",
  "ja",
  "ko",
  "ms",
  "nb",
  "nl",
  "sv",
  "pl",
  "tr",
  "pt",
  "pt-BR",
  "vi",
  "uk",
];

for (const locale of LOCALES) {
  const p = path.join(messagesDir, `${locale}.json`);
  const j = JSON.parse(fs.readFileSync(p, "utf8"));
  const pc = j.PdfCompressor;
  const pw = j.PdfWatermark;
  if (!pc || !pw) {
    throw new Error(`${locale}.json: missing PdfCompressor or PdfWatermark`);
  }
  const sp = STRINGS[locale] ?? STRINGS.en;

  j.Navigation.pdfToPdfA = sp.nav;
  j.Dashboard.tools.pdfToPdfA = {
    title: sp.dashboardTitle,
    description: sp.dashboardDesc,
  };

  j.PdfToPdfA = {
    intro: sp.intro,
    privacyNote: sp.privacyNote,
    disclaimer: sp.disclaimer,
    chooseFile: pc.chooseFile,
    reset: pc.reset,
    pageCount: pc.pageCount,
    levelLabel: sp.levelLabel,
    levelHint: sp.levelHint,
    download: sp.download,
    working: pw.working,
    done: sp.done,
    invalidPdf: pc.invalidPdf,
    encryptedPdf: pc.encryptedPdf,
    convertFailed: sp.convertFailed,
    level: { ...sp.level },
  };

  fs.writeFileSync(p, `${JSON.stringify(j, null, 2)}\n`);
}

console.log(`Updated PdfToPdfA strings in ${LOCALES.length} locale files.`);
