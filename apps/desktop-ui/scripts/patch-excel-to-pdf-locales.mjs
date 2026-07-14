/**
 * One-off / maintenance: set localized strings for Excel → PDF across all message files.
 * Run from repo root: node apps/web/scripts/patch-excel-to-pdf-locales.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const messagesDir = path.join(__dirname, "../messages");

/** @typedef {{ nav: string, dashboardTitle: string, dashboardDesc: string, panel: Record<string, string> }} LocaleBundle */

/** @type {Record<string, LocaleBundle>} */
const T = {
  en: {
    nav: "Excel to PDF",
    dashboardTitle: "Excel to PDF",
    dashboardDesc:
      "Make Excel spreadsheets easy to read by converting them to PDF in your browser.",
    panel: {
      intro:
        "Make Excel spreadsheets easy to read by converting them to PDF.",
      privacyNote: "Your file never leaves this browser.",
      includeSheets: "Sheets to include",
      allSheets: "All sheets",
      firstSheetOnly: "First sheet only",
      chooseFile: "Choose Excel file",
      clearFile: "Clear",
      downloadPdf: "Download PDF",
      building: "Building PDF…",
      noFile: "Choose an Excel file first.",
      emptyWorkbook:
        "No sheet in this workbook had table data we could export.",
      unsupportedFile: "Use a .xlsx or .xls file.",
      readFailed: "Could not read this spreadsheet.",
      buildFailed:
        "Could not build the PDF. Try a smaller workbook or fewer sheets.",
      sheetHeading: "Sheet: {name}",
    },
  },
  fr: {
    nav: "Excel vers PDF",
    dashboardTitle: "Excel vers PDF",
    dashboardDesc:
      "Rendez vos feuilles Excel plus lisibles en les convertissant en PDF dans le navigateur.",
    panel: {
      intro:
        "Rendez vos feuilles Excel plus lisibles en les convertissant en PDF.",
      privacyNote: "Votre fichier ne quitte jamais ce navigateur.",
      includeSheets: "Feuilles à inclure",
      allSheets: "Toutes les feuilles",
      firstSheetOnly: "Première feuille uniquement",
      chooseFile: "Choisir un fichier Excel",
      clearFile: "Effacer",
      downloadPdf: "Télécharger le PDF",
      building: "Génération du PDF…",
      noFile: "Choisissez d'abord un fichier Excel.",
      emptyWorkbook:
        "Aucune feuille de ce classeur ne contenait de données tabulaires exportables.",
      unsupportedFile: "Utilisez un fichier .xlsx ou .xls.",
      readFailed: "Impossible de lire ce classeur.",
      buildFailed:
        "Impossible de créer le PDF. Essayez un classeur plus petit ou moins de feuilles.",
      sheetHeading: "Feuille : {name}",
    },
  },
  es: {
    nav: "Excel a PDF",
    dashboardTitle: "Excel a PDF",
    dashboardDesc:
      "Haga que las hojas de Excel sean fáciles de leer convirtiéndolas a PDF en el navegador.",
    panel: {
      intro:
        "Haga que las hojas de Excel sean fáciles de leer convirtiéndolas a PDF.",
      privacyNote: "Su archivo no sale nunca de este navegador.",
      includeSheets: "Hojas a incluir",
      allSheets: "Todas las hojas",
      firstSheetOnly: "Solo la primera hoja",
      chooseFile: "Elegir archivo de Excel",
      clearFile: "Borrar",
      downloadPdf: "Descargar PDF",
      building: "Generando PDF…",
      noFile: "Elija primero un archivo de Excel.",
      emptyWorkbook:
        "Ninguna hoja de este libro tenía datos de tabla que pudiéramos exportar.",
      unsupportedFile: "Use un archivo .xlsx o .xls.",
      readFailed: "No se pudo leer esta hoja de cálculo.",
      buildFailed:
        "No se pudo generar el PDF. Pruebe con un libro más pequeño o menos hojas.",
      sheetHeading: "Hoja: {name}",
    },
  },
  de: {
    nav: "Excel zu PDF",
    dashboardTitle: "Excel zu PDF",
    dashboardDesc:
      "Machen Sie Excel-Tabellen leichter lesbar, indem Sie sie im Browser in PDF umwandeln.",
    panel: {
      intro:
        "Machen Sie Excel-Tabellen leichter lesbar, indem Sie sie in PDF umwandeln.",
      privacyNote: "Ihre Datei verlässt diesen Browser nie.",
      includeSheets: "Einzubeziehende Blätter",
      allSheets: "Alle Blätter",
      firstSheetOnly: "Nur erstes Blatt",
      chooseFile: "Excel-Datei wählen",
      clearFile: "Zurücksetzen",
      downloadPdf: "PDF herunterladen",
      building: "PDF wird erstellt…",
      noFile: "Wählen Sie zuerst eine Excel-Datei.",
      emptyWorkbook:
        "Kein Blatt in dieser Arbeitsmappe enthielt exportierbare Tabellendaten.",
      unsupportedFile: "Verwenden Sie eine .xlsx- oder .xls-Datei.",
      readFailed: "Diese Tabelle konnte nicht gelesen werden.",
      buildFailed:
        "PDF konnte nicht erstellt werden. Versuchen Sie eine kleinere Datei oder weniger Blätter.",
      sheetHeading: "Blatt: {name}",
    },
  },
  it: {
    nav: "Excel in PDF",
    dashboardTitle: "Excel in PDF",
    dashboardDesc:
      "Rendi i fogli Excel più leggibili convertendoli in PDF nel browser.",
    panel: {
      intro: "Rendi i fogli Excel più leggibili convertendoli in PDF.",
      privacyNote: "Il file non lascia mai questo browser.",
      includeSheets: "Fogli da includere",
      allSheets: "Tutti i fogli",
      firstSheetOnly: "Solo il primo foglio",
      chooseFile: "Scegli file Excel",
      clearFile: "Cancella",
      downloadPdf: "Scarica PDF",
      building: "Creazione PDF…",
      noFile: "Scegli prima un file Excel.",
      emptyWorkbook:
        "Nessun foglio di questa cartella conteneva dati tabulari esportabili.",
      unsupportedFile: "Usa un file .xlsx o .xls.",
      readFailed: "Impossibile leggere questo foglio di calcolo.",
      buildFailed:
        "Impossibile creare il PDF. Prova una cartella più piccola o meno fogli.",
      sheetHeading: "Foglio: {name}",
    },
  },
  pt: {
    nav: "Excel para PDF",
    dashboardTitle: "Excel para PDF",
    dashboardDesc:
      "Torne as folhas Excel mais fáceis de ler convertendo-as para PDF no navegador.",
    panel: {
      intro: "Torne as folhas Excel mais fáceis de ler convertendo-as para PDF.",
      privacyNote: "O ficheiro nunca sai deste navegador.",
      includeSheets: "Folhas a incluir",
      allSheets: "Todas as folhas",
      firstSheetOnly: "Apenas a primeira folha",
      chooseFile: "Escolher ficheiro Excel",
      clearFile: "Limpar",
      downloadPdf: "Descarregar PDF",
      building: "A criar PDF…",
      noFile: "Escolha primeiro um ficheiro Excel.",
      emptyWorkbook:
        "Nenhuma folha deste livro continha dados de tabela exportáveis.",
      unsupportedFile: "Use um ficheiro .xlsx ou .xls.",
      readFailed: "Não foi possível ler esta folha de cálculo.",
      buildFailed:
        "Não foi possível criar o PDF. Tente um livro mais pequeno ou menos folhas.",
      sheetHeading: "Folha: {name}",
    },
  },
  "pt-BR": {
    nav: "Excel para PDF",
    dashboardTitle: "Excel para PDF",
    dashboardDesc:
      "Deixe planilhas Excel mais fáceis de ler convertendo-as para PDF no navegador.",
    panel: {
      intro: "Deixe planilhas Excel mais fáceis de ler convertendo-as para PDF.",
      privacyNote: "Seu arquivo nunca sai deste navegador.",
      includeSheets: "Planilhas a incluir",
      allSheets: "Todas as planilhas",
      firstSheetOnly: "Somente a primeira planilha",
      chooseFile: "Escolher arquivo Excel",
      clearFile: "Limpar",
      downloadPdf: "Baixar PDF",
      building: "Gerando PDF…",
      noFile: "Escolha um arquivo Excel primeiro.",
      emptyWorkbook:
        "Nenhuma planilha desta pasta continha dados de tabela exportáveis.",
      unsupportedFile: "Use um arquivo .xlsx ou .xls.",
      readFailed: "Não foi possível ler esta planilha.",
      buildFailed:
        "Não foi possível gerar o PDF. Tente uma pasta menor ou menos planilhas.",
      sheetHeading: "Planilha: {name}",
    },
  },
  nl: {
    nav: "Excel naar PDF",
    dashboardTitle: "Excel naar PDF",
    dashboardDesc:
      "Maak Excel-spreadsheets makkelijker leesbaar door ze in de browser naar PDF te zetten.",
    panel: {
      intro:
        "Maak Excel-spreadsheets makkelijker leesbaar door ze naar PDF te zetten.",
      privacyNote: "Uw bestand verlaat deze browser nooit.",
      includeSheets: "Te verwerken werkbladen",
      allSheets: "Alle werkbladen",
      firstSheetOnly: "Alleen eerste werkblad",
      chooseFile: "Excelbestand kiezen",
      clearFile: "Wissen",
      downloadPdf: "PDF downloaden",
      building: "PDF wordt gemaakt…",
      noFile: "Kies eerst een Excelbestand.",
      emptyWorkbook:
        "Geen werkblad in deze map bevatte exporteerbare tabelgegevens.",
      unsupportedFile: "Gebruik een .xlsx- of .xls-bestand.",
      readFailed: "Kon deze spreadsheet niet lezen.",
      buildFailed:
        "Kon de PDF niet maken. Probeer een kleinere map of minder werkbladen.",
      sheetHeading: "Werkblad: {name}",
    },
  },
  pl: {
    nav: "Excel do PDF",
    dashboardTitle: "Excel do PDF",
    dashboardDesc:
      "Ułatwiaj czytanie arkuszy Excel, konwertując je do PDF w przeglądarce.",
    panel: {
      intro: "Ułatwiaj czytanie arkuszy Excel, konwertując je do PDF.",
      privacyNote: "Plik nigdy nie opuszcza tej przeglądarki.",
      includeSheets: "Arkusze do uwzględnienia",
      allSheets: "Wszystkie arkusze",
      firstSheetOnly: "Tylko pierwszy arkusz",
      chooseFile: "Wybierz plik Excel",
      clearFile: "Wyczyść",
      downloadPdf: "Pobierz PDF",
      building: "Tworzenie PDF…",
      noFile: "Najpierw wybierz plik Excel.",
      emptyWorkbook:
        "Żaden arkusz w tym skoroszycie nie zawierał danych tabelarycznych do eksportu.",
      unsupportedFile: "Użyj pliku .xlsx lub .xls.",
      readFailed: "Nie można odczytać tego arkusza.",
      buildFailed:
        "Nie można utworzyć PDF. Spróbuj mniejszego skoroszytu lub mniej arkuszy.",
      sheetHeading: "Arkusz: {name}",
    },
  },
  ru: {
    nav: "Excel в PDF",
    dashboardTitle: "Excel в PDF",
    dashboardDesc:
      "Сделайте таблицы Excel удобнее для чтения, конвертируя их в PDF в браузере.",
    panel: {
      intro: "Сделайте таблицы Excel удобнее для чтения, конвертируя их в PDF.",
      privacyNote: "Файл не покидает этот браузер.",
      includeSheets: "Листы для включения",
      allSheets: "Все листы",
      firstSheetOnly: "Только первый лист",
      chooseFile: "Выбрать файл Excel",
      clearFile: "Очистить",
      downloadPdf: "Скачать PDF",
      building: "Создание PDF…",
      noFile: "Сначала выберите файл Excel.",
      emptyWorkbook:
        "Ни на одном листе книги не было табличных данных для экспорта.",
      unsupportedFile: "Используйте файл .xlsx или .xls.",
      readFailed: "Не удалось прочитать эту таблицу.",
      buildFailed:
        "Не удалось создать PDF. Попробуйте меньшую книгу или меньше листов.",
      sheetHeading: "Лист: {name}",
    },
  },
  uk: {
    nav: "Excel у PDF",
    dashboardTitle: "Excel у PDF",
    dashboardDesc:
      "Зробіть таблиці Excel зручнішими для читання, конвертуючи їх у PDF у браузері.",
    panel: {
      intro: "Зробіть таблиці Excel зручнішими для читання, конвертуючи їх у PDF.",
      privacyNote: "Файл не покидає цей браузер.",
      includeSheets: "Аркуші для включення",
      allSheets: "Усі аркуші",
      firstSheetOnly: "Лише перший аркуш",
      chooseFile: "Вибрати файл Excel",
      clearFile: "Очистити",
      downloadPdf: "Завантажити PDF",
      building: "Створення PDF…",
      noFile: "Спочатку виберіть файл Excel.",
      emptyWorkbook:
        "Жоден аркуш у цій книзі не містив табличних даних для експорту.",
      unsupportedFile: "Використовуйте файл .xlsx або .xls.",
      readFailed: "Не вдалося прочитати цю таблицю.",
      buildFailed:
        "Не вдалося створити PDF. Спробуйте меншу книгу або менше аркушів.",
      sheetHeading: "Аркуш: {name}",
    },
  },
  cs: {
    nav: "Excel do PDF",
    dashboardTitle: "Excel do PDF",
    dashboardDesc:
      "Udělejte tabulky Excel snáze čitelné jejich převodem na PDF v prohlížeči.",
    panel: {
      intro: "Udělejte tabulky Excel snáze čitelné převodem na PDF.",
      privacyNote: "Soubor tento prohlížeč nikdy neopustí.",
      includeSheets: "Listy k zahrnutí",
      allSheets: "Všechny listy",
      firstSheetOnly: "Pouze první list",
      chooseFile: "Vybrat soubor Excel",
      clearFile: "Vymazat",
      downloadPdf: "Stáhnout PDF",
      building: "Vytváření PDF…",
      noFile: "Nejprve vyberte soubor Excel.",
      emptyWorkbook:
        "Žádný list v tomto sešitu neobsahoval exportovatelná tabulková data.",
      unsupportedFile: "Použijte soubor .xlsx nebo .xls.",
      readFailed: "Tento sešit nelze přečíst.",
      buildFailed:
        "PDF se nepodařilo vytvořit. Zkuste menší sešit nebo méně listů.",
      sheetHeading: "List: {name}",
    },
  },
  da: {
    nav: "Excel til PDF",
    dashboardTitle: "Excel til PDF",
    dashboardDesc:
      "Gør Excel-regneark lettere at læse ved at konvertere dem til PDF i browseren.",
    panel: {
      intro: "Gør Excel-regneark lettere at læse ved at konvertere dem til PDF.",
      privacyNote: "Din fil forlader aldrig denne browser.",
      includeSheets: "Ark der skal medtages",
      allSheets: "Alle ark",
      firstSheetOnly: "Kun første ark",
      chooseFile: "Vælg Excel-fil",
      clearFile: "Ryd",
      downloadPdf: "Download PDF",
      building: "Opretter PDF…",
      noFile: "Vælg først en Excel-fil.",
      emptyWorkbook:
        "Intet ark i denne projektmappe indeholdt tabeldata, vi kunne eksportere.",
      unsupportedFile: "Brug en .xlsx- eller .xls-fil.",
      readFailed: "Kunne ikke læse dette regneark.",
      buildFailed:
        "Kunne ikke oprette PDF. Prøv en mindre projektmappe eller færre ark.",
      sheetHeading: "Ark: {name}",
    },
  },
  nb: {
    nav: "Excel til PDF",
    dashboardTitle: "Excel til PDF",
    dashboardDesc:
      "Gjør Excel-ark lettere å lese ved å konvertere dem til PDF i nettleseren.",
    panel: {
      intro: "Gjør Excel-ark lettere å lese ved å konvertere dem til PDF.",
      privacyNote: "Filen forlater aldri denne nettleseren.",
      includeSheets: "Ark som skal tas med",
      allSheets: "Alle ark",
      firstSheetOnly: "Kun første ark",
      chooseFile: "Velg Excel-fil",
      clearFile: "Tøm",
      downloadPdf: "Last ned PDF",
      building: "Bygger PDF…",
      noFile: "Velg en Excel-fil først.",
      emptyWorkbook:
        "Ingen ark i denne arbeidsboken inneholdt tabelldata vi kunne eksportere.",
      unsupportedFile: "Bruk en .xlsx- eller .xls-fil.",
      readFailed: "Kunne ikke lese dette regnearket.",
      buildFailed:
        "Kunne ikke bygge PDF. Prøv en mindre arbeidsbok eller færre ark.",
      sheetHeading: "Ark: {name}",
    },
  },
  sv: {
    nav: "Excel till PDF",
    dashboardTitle: "Excel till PDF",
    dashboardDesc:
      "Gör Excel-kalkylblad lättare att läsa genom att konvertera dem till PDF i webbläsaren.",
    panel: {
      intro: "Gör Excel-kalkylblad lättare att läsa genom att konvertera dem till PDF.",
      privacyNote: "Din fil lämnar aldrig den här webbläsaren.",
      includeSheets: "Blad att inkludera",
      allSheets: "Alla blad",
      firstSheetOnly: "Endast första bladet",
      chooseFile: "Välj Excel-fil",
      clearFile: "Rensa",
      downloadPdf: "Ladda ner PDF",
      building: "Skapar PDF…",
      noFile: "Välj en Excel-fil först.",
      emptyWorkbook:
        "Inget blad i den här arbetsboken innehöll tabelldata som vi kunde exportera.",
      unsupportedFile: "Använd en .xlsx- eller .xls-fil.",
      readFailed: "Kunde inte läsa detta kalkylblad.",
      buildFailed:
        "Kunde inte skapa PDF. Prova en mindre arbetsbok eller färre blad.",
      sheetHeading: "Blad: {name}",
    },
  },
  tr: {
    nav: "Excel'den PDF",
    dashboardTitle: "Excel'den PDF'ye",
    dashboardDesc:
      "Excel sayfalarını tarayıcıda PDF'ye dönüştürerek okunmasını kolaylaştırın.",
    panel: {
      intro: "Excel sayfalarını PDF'ye dönüştürerek okunmasını kolaylaştırın.",
      privacyNote: "Dosyanız bu tarayıcıdan hiç ayrılmaz.",
      includeSheets: "Dahil edilecek sayfalar",
      allSheets: "Tüm sayfalar",
      firstSheetOnly: "Yalnızca ilk sayfa",
      chooseFile: "Excel dosyası seç",
      clearFile: "Temizle",
      downloadPdf: "PDF indir",
      building: "PDF oluşturuluyor…",
      noFile: "Önce bir Excel dosyası seçin.",
      emptyWorkbook:
        "Bu çalışma kitabındaki hiçbir sayfada dışa aktarılabilir tablo verisi yoktu.",
      unsupportedFile: ".xlsx veya .xls dosyası kullanın.",
      readFailed: "Bu e-tablo okunamadı.",
      buildFailed:
        "PDF oluşturulamadı. Daha küçük bir çalışma kitabı veya daha az sayfa deneyin.",
      sheetHeading: "Sayfa: {name}",
    },
  },
  vi: {
    nav: "Excel sang PDF",
    dashboardTitle: "Excel sang PDF",
    dashboardDesc:
      "Giúp bảng Excel dễ đọc hơn bằng cách chuyển sang PDF ngay trên trình duyệt.",
    panel: {
      intro: "Giúp bảng Excel dễ đọc hơn bằng cách chuyển sang PDF.",
      privacyNote: "Tệp của bạn không bao giờ rời khỏi trình duyệt này.",
      includeSheets: "Trang tính cần gồm",
      allSheets: "Tất cả trang tính",
      firstSheetOnly: "Chỉ trang tính đầu tiên",
      chooseFile: "Chọn tệp Excel",
      clearFile: "Xóa",
      downloadPdf: "Tải PDF",
      building: "Đang tạo PDF…",
      noFile: "Hãy chọn tệp Excel trước.",
      emptyWorkbook:
        "Không trang tính nào trong sổ làm việc này có dữ liệu bảng để xuất.",
      unsupportedFile: "Dùng tệp .xlsx hoặc .xls.",
      readFailed: "Không đọc được bảng tính này.",
      buildFailed:
        "Không tạo được PDF. Hãy thử sổ làm việc nhỏ hơn hoặc ít trang tính hơn.",
      sheetHeading: "Trang tính: {name}",
    },
  },
  zh: {
    nav: "Excel 转 PDF",
    dashboardTitle: "Excel 转 PDF",
    dashboardDesc: "在浏览器中将 Excel 表格转为 PDF，阅读更轻松。",
    panel: {
      intro: "将 Excel 表格转为 PDF，让内容更易读。",
      privacyNote: "您的文件不会离开本浏览器。",
      includeSheets: "包含的工作表",
      allSheets: "所有工作表",
      firstSheetOnly: "仅第一个工作表",
      chooseFile: "选择 Excel 文件",
      clearFile: "清除",
      downloadPdf: "下载 PDF",
      building: "正在生成 PDF…",
      noFile: "请先选择 Excel 文件。",
      emptyWorkbook: "此工作簿中没有可导出的表格数据。",
      unsupportedFile: "请使用 .xlsx 或 .xls 文件。",
      readFailed: "无法读取此电子表格。",
      buildFailed: "无法生成 PDF。请尝试更小的工作簿或更少的工作表。",
      sheetHeading: "工作表：{name}",
    },
  },
  ja: {
    nav: "Excel から PDF",
    dashboardTitle: "Excel から PDF",
    dashboardDesc:
      "ブラウザ上で Excel を PDF に変換し、表を読みやすくします。",
    panel: {
      intro: "Excel を PDF に変換して、表を読みやすくします。",
      privacyNote: "ファイルはこのブラウザから外部に送信されません。",
      includeSheets: "含めるシート",
      allSheets: "すべてのシート",
      firstSheetOnly: "最初のシートのみ",
      chooseFile: "Excel ファイルを選択",
      clearFile: "クリア",
      downloadPdf: "PDF をダウンロード",
      building: "PDF を作成中…",
      noFile: "先に Excel ファイルを選択してください。",
      emptyWorkbook:
        "このブックのどのシートにもエクスポート可能な表データがありませんでした。",
      unsupportedFile: ".xlsx または .xls ファイルを使用してください。",
      readFailed: "このスプレッドシートを読み取れませんでした。",
      buildFailed:
        "PDF を作成できませんでした。ブックを小さくするか、シート数を減らしてお試しください。",
      sheetHeading: "シート: {name}",
    },
  },
  ko: {
    nav: "Excel을 PDF로",
    dashboardTitle: "Excel을 PDF로",
    dashboardDesc:
      "브라우저에서 Excel을 PDF로 변환해 스프레드시트를 더 읽기 쉽게 만듭니다.",
    panel: {
      intro: "Excel을 PDF로 변환해 스프레드시트를 더 읽기 쉽게 만듭니다.",
      privacyNote: "파일은 이 브라우저를 벗어나지 않습니다.",
      includeSheets: "포함할 시트",
      allSheets: "모든 시트",
      firstSheetOnly: "첫 번째 시트만",
      chooseFile: "Excel 파일 선택",
      clearFile: "지우기",
      downloadPdf: "PDF 다운로드",
      building: "PDF 생성 중…",
      noFile: "먼저 Excel 파일을 선택하세요.",
      emptyWorkbook:
        "이 통합 문서에서 보낼 수 있는 표 형식 데이터가 있는 시트를 찾을 수 없습니다.",
      unsupportedFile: ".xlsx 또는 .xls 파일을 사용하세요.",
      readFailed: "이 스프레드시트를 읽을 수 없습니다.",
      buildFailed:
        "PDF를 만들 수 없습니다. 더 작은 통합 문서나 시트 수를 줄여 보세요.",
      sheetHeading: "시트: {name}",
    },
  },
  ar: {
    nav: "Excel إلى PDF",
    dashboardTitle: "Excel إلى PDF",
    dashboardDesc:
      "اجعل جداول Excel أسهل للقراءة بتحويلها إلى PDF داخل المتصفح.",
    panel: {
      intro: "اجعل جداول Excel أسهل للقراءة بتحويلها إلى PDF.",
      privacyNote: "ملفك لا يغادر هذا المتصفح أبدًا.",
      includeSheets: "الأوراق المضمّنة",
      allSheets: "كل الأوراق",
      firstSheetOnly: "الورقة الأولى فقط",
      chooseFile: "اختر ملف Excel",
      clearFile: "مسح",
      downloadPdf: "تنزيل PDF",
      building: "جارٍ إنشاء PDF…",
      noFile: "اختر ملف Excel أولًا.",
      emptyWorkbook: "لم يحتوِ أي ورقة في هذا المصنف على بيانات جدول يمكن تصديرها.",
      unsupportedFile: "استخدم ملف .xlsx أو .xls.",
      readFailed: "تعذّر قراءة هذا الجدول.",
      buildFailed:
        "تعذّر إنشاء PDF. جرّب مصنفًا أصغر أو عددًا أقل من الأوراق.",
      sheetHeading: "الورقة: {name}",
    },
  },
  ca: {
    nav: "Excel a PDF",
    dashboardTitle: "Excel a PDF",
    dashboardDesc:
      "Feu que els fulls de càlcul Excel siguin més fàcils de llegir convertint-los a PDF al navegador.",
    panel: {
      intro:
        "Feu que els fulls de càlcul Excel siguin més fàcils de llegir convertint-los a PDF.",
      privacyNote: "El fitxer no surt mai d’aquest navegador.",
      includeSheets: "Fulls a incloure",
      allSheets: "Tots els fulls",
      firstSheetOnly: "Només el primer full",
      chooseFile: "Trieu un fitxer Excel",
      clearFile: "Neteja",
      downloadPdf: "Descarrega el PDF",
      building: "S’està generant el PDF…",
      noFile: "Trieu primer un fitxer Excel.",
      emptyWorkbook:
        "Cap full d’aquest llibre tenia dades de taula que poguéssim exportar.",
      unsupportedFile: "Utilitzeu un fitxer .xlsx o .xls.",
      readFailed: "No s’ha pogut llegir aquest full de càlcul.",
      buildFailed:
        "No s’ha pogut crear el PDF. Proveu un llibre més petit o menys fulls.",
      sheetHeading: "Full: {name}",
    },
  },
  el: {
    nav: "Excel σε PDF",
    dashboardTitle: "Excel σε PDF",
    dashboardDesc:
      "Κάντε τα φύλλα Excel πιο ευανάγνωστα μετατρέποντάς τα σε PDF στον browser.",
    panel: {
      intro: "Κάντε τα φύλλα Excel πιο ευανάγνωστα μετατρέποντάς τα σε PDF.",
      privacyNote: "Το αρχείο σας δεν φεύγει ποτέ από αυτόν τον browser.",
      includeSheets: "Φύλλα προς συμπερίληψη",
      allSheets: "Όλα τα φύλλα",
      firstSheetOnly: "Μόνο το πρώτο φύλλο",
      chooseFile: "Επιλέξτε αρχείο Excel",
      clearFile: "Καθαρισμός",
      downloadPdf: "Λήψη PDF",
      building: "Δημιουργία PDF…",
      noFile: "Επιλέξτε πρώτα αρχείο Excel.",
      emptyWorkbook:
        "Κανένα φύλλο αυτού του βιβλίου δεν είχε δεδομένα πίνακα για εξαγωγή.",
      unsupportedFile: "Χρησιμοποιήστε αρχείο .xlsx ή .xls.",
      readFailed: "Δεν ήταν δυνατή η ανάγνωση αυτού του υπολογιστικού φύλλου.",
      buildFailed:
        "Δεν ήταν δυνατή η δημιουργία PDF. Δοκιμάστε μικρότερο βιβλίο ή λιγότερα φύλλα.",
      sheetHeading: "Φύλλο: {name}",
    },
  },
  af: {
    nav: "Excel na PDF",
    dashboardTitle: "Excel na PDF",
    dashboardDesc:
      "Maak Excel-spruitstukke makliker om te lees deur dit in die blaaier na PDF om te skakel.",
    panel: {
      intro: "Maak Excel-spruitstukke makliker om te lees deur dit na PDF om te skakel.",
      privacyNote: "Jou lêer verlaat nooit hierdie blaaier nie.",
      includeSheets: "Blaaie om in te sluit",
      allSheets: "Alle blaaie",
      firstSheetOnly: "Slegs eerste blad",
      chooseFile: "Kies Excel-lêer",
      clearFile: "Maak skoon",
      downloadPdf: "Laai PDF af",
      building: "Bou PDF…",
      noFile: "Kies eers ’n Excel-lêer.",
      emptyWorkbook:
        "Geen blad in hierdie werkboek het tabeldata gehad wat ons kon uitvoer nie.",
      unsupportedFile: "Gebruik ’n .xlsx- of .xls-lêer.",
      readFailed: "Kon nie hierdie sigblad lees nie.",
      buildFailed:
        "Kon nie die PDF bou nie. Probeer ’n kleiner werkboek of minder blaaie.",
      sheetHeading: "Blad: {name}",
    },
  },
  id: {
    nav: "Excel ke PDF",
    dashboardTitle: "Excel ke PDF",
    dashboardDesc:
      "Buat lembar Excel lebih mudah dibaca dengan mengonversinya ke PDF di browser.",
    panel: {
      intro: "Buat lembar Excel lebih mudah dibaca dengan mengonversinya ke PDF.",
      privacyNote: "Berkas Anda tidak pernah meninggalkan browser ini.",
      includeSheets: "Lembar yang disertakan",
      allSheets: "Semua lembar",
      firstSheetOnly: "Hanya lembar pertama",
      chooseFile: "Pilih berkas Excel",
      clearFile: "Hapus",
      downloadPdf: "Unduh PDF",
      building: "Membuat PDF…",
      noFile: "Pilih berkas Excel terlebih dahulu.",
      emptyWorkbook:
        "Tidak ada lembar dalam buku kerja ini yang berisi data tabel untuk diekspor.",
      unsupportedFile: "Gunakan berkas .xlsx atau .xls.",
      readFailed: "Tidak dapat membaca spreadsheet ini.",
      buildFailed:
        "Tidak dapat membuat PDF. Coba buku kerja yang lebih kecil atau lebih sedikit lembar.",
      sheetHeading: "Lembar: {name}",
    },
  },
  fa: {
    nav: "Excel به PDF",
    dashboardTitle: "Excel به PDF",
    dashboardDesc:
      "صفحه‌های Excel را با تبدیل به PDF در مرورگر راحت‌تر بخوانید.",
    panel: {
      intro: "صفحه‌های Excel را با تبدیل به PDF راحت‌تر بخوانید.",
      privacyNote: "فایل شما هرگز این مرورگر را ترک نمی‌کند.",
      includeSheets: "برگه‌های شامل",
      allSheets: "همه برگه‌ها",
      firstSheetOnly: "فقط اولین برگه",
      chooseFile: "انتخاب فایل Excel",
      clearFile: "پاک کردن",
      downloadPdf: "دانلود PDF",
      building: "در حال ساخت PDF…",
      noFile: "ابتدا یک فایل Excel انتخاب کنید.",
      emptyWorkbook:
        "هیچ برگه‌ای در این کتاب دادهٔ جدولی برای خروجی نداشت.",
      unsupportedFile: "از فایل .xlsx یا .xls استفاده کنید.",
      readFailed: "خواندن این صفحه گسترده ممکن نشد.",
      buildFailed:
        "ساخت PDF ممکن نشد. کتاب کوچک‌تر یا برگه‌های کمتر امتحان کنید.",
      sheetHeading: "برگه: {name}",
    },
  },
  ms: {
    nav: "Excel ke PDF",
    dashboardTitle: "Excel ke PDF",
    dashboardDesc:
      "Jadikan helaian Excel lebih mudah dibaca dengan menukarkannya kepada PDF dalam pelayar.",
    panel: {
      intro: "Jadikan helaian Excel lebih mudah dibaca dengan menukarkannya kepada PDF.",
      privacyNote: "Fail anda tidak pernah meninggalkan pelayar ini.",
      includeSheets: "Helaian untuk disertakan",
      allSheets: "Semua helaian",
      firstSheetOnly: "Helaian pertama sahaja",
      chooseFile: "Pilih fail Excel",
      clearFile: "Kosongkan",
      downloadPdf: "Muat turun PDF",
      building: "Membina PDF…",
      noFile: "Pilih fail Excel dahulu.",
      emptyWorkbook:
        "Tiada helaian dalam buku kerja ini mengandungi data jadual untuk dieksport.",
      unsupportedFile: "Gunakan fail .xlsx atau .xls.",
      readFailed: "Tidak dapat membaca helaian ini.",
      buildFailed:
        "Tidak dapat membina PDF. Cuba buku kerja yang lebih kecil atau kurang helaian.",
      sheetHeading: "Helaian: {name}",
    },
  },
};

const expectedLocales = [
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
const keys = Object.keys(T).sort();
if (keys.length !== expectedLocales.length || !expectedLocales.every((l) => T[l])) {
  console.error("Locale set mismatch", keys);
  process.exit(1);
}

for (const [locale, bundle] of Object.entries(T)) {
  const fp = path.join(messagesDir, `${locale}.json`);
  if (!fs.existsSync(fp)) {
    console.warn("missing file", fp);
    continue;
  }
  const raw = fs.readFileSync(fp, "utf8");
  const data = JSON.parse(raw);
  if (!data.Navigation || !data.Dashboard?.tools || !data.ExcelToPdf) {
    console.error("unexpected structure", locale);
    process.exit(1);
  }
  data.Navigation.excelToPdf = bundle.nav;
  data.Dashboard.tools.excelToPdf = {
    title: bundle.dashboardTitle,
    description: bundle.dashboardDesc,
  };
  Object.assign(data.ExcelToPdf, bundle.panel);
  fs.writeFileSync(fp, JSON.stringify(data, null, 2) + "\n");
  console.log("updated", locale);
}
