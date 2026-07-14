/**
 * Updates Navigation.pdfCompare, Dashboard.tools.pdfCompare, and PdfCompare
 * in all apps/web/messages/*.json files. PdfCompare invalid/password/generic
 * messages reuse PdfToJpg in the same file when present.
 */
const fs = require("fs");
const path = require("path");

const MESSAGES_DIR = path.join(__dirname, "../messages");

/** @typedef {{ nav: string, dashTitle: string, dashDesc: string } & Record<string, string>} Tr */

/** @type {Record<string, Tr>} */
const T = {
  en: {
    nav: "Compare PDF",
    dashTitle: "Compare PDF",
    dashDesc:
      "Easily display the differences between two similar files. Text is extracted with PDF.js and compared locally — nothing is uploaded.",
    title: "Compare PDF",
    subtitle:
      "Upload two PDFs to compare their text layer side by side. Runs locally in your browser with PDF.js.",
    privacyNote:
      "Your files never leave this browser. The PDF.js worker loads from a CDN the first time you compare.",
    firstPdf: "First PDF",
    secondPdf: "Second PDF",
    chooseFile: "Choose file",
    removeFile: "Remove",
    clearAll: "Clear all",
    extracting: "Extracting text…",
    comparisonLabel: "Text diff",
    emptyState: "Choose two PDFs to see additions and removals side by side.",
    truncatedWarning: "Showing first {max} rows.",
    limitExceeded: "Extracted text is limited to {max} characters per file.",
    noTextHint: "Little or no text was found in one or both PDFs (common for scanned pages).",
    mobileTabFiles: "PDFs",
    mobileTabDiff: "Diff",
  },
  af: {
    nav: "Vergelyk PDF",
    dashTitle: "Vergelyk PDF",
    dashDesc:
      "Wys maklik die verskille tussen twee soortgelyke lêers. Teks word met PDF.js plaaslik onttrek en vergelyk — niks word opgelaai nie.",
    title: "Vergelyk PDF",
    subtitle:
      "Laai twee PDF's op om hul tekslaag sy aan sy te vergelyk. Gebeur plaaslik in jou blaaier met PDF.js.",
    privacyNote:
      "Jou lêers verlaat nie hierdie blaaier nie. Die PDF.js-werker laai die eerste keer vanaf 'n CDN.",
    firstPdf: "Eerste PDF",
    secondPdf: "Tweede PDF",
    chooseFile: "Kies lêer",
    removeFile: "Verwyder",
    clearAll: "Maak alles skoon",
    extracting: "Onttrek teks…",
    comparisonLabel: "Teksverskil",
    emptyState: "Kies twee PDF's om byvoegings en verwyderings sy aan sy te sien.",
    truncatedWarning: "Wys eerste {max} rye.",
    limitExceeded: "Onttrekte teks is beperk tot {max} karakters per lêer.",
    noTextHint: "Min of geen teks in een of beide PDF's (gewoon by geskandeerde bladsye).",
    mobileTabFiles: "PDF's",
    mobileTabDiff: "Verskil",
  },
  ar: {
    nav: "مقارنة PDF",
    dashTitle: "مقارنة PDF",
    dashDesc:
      "اعرض الاختلافات بين ملفين متشابهين بسهولة. يُستخرج النص محليًا باستخدام PDF.js ويُقارن دون رفع الملفات إلى خادم.",
    title: "مقارنة PDF",
    subtitle:
      "ارفع ملفي PDF لمقارنة طبقة النص جنبًا إلى جنب. يعمل محليًا في المتصفح عبر PDF.js.",
    privacyNote:
      "ملفاتك لا تغادر هذا المتصفح. يُحمّل عامل PDF.js من شبكة CDN عند أول مقارنة.",
    firstPdf: "ملف PDF الأول",
    secondPdf: "ملف PDF الثاني",
    chooseFile: "اختر ملفًا",
    removeFile: "إزالة",
    clearAll: "مسح الكل",
    extracting: "جارٍ استخراج النص…",
    comparisonLabel: "فرق النص",
    emptyState: "اختر ملفي PDF لعرض الإضافات والحذف جنبًا إلى جنب.",
    truncatedWarning: "عرض أول {max} صفًا.",
    limitExceeded: "النص المستخرج محدود بـ {max} حرفًا لكل ملف.",
    noTextHint: "لم يُعثر على نص تقريبًا في أحد الملفين أو كليهما (شائع في المستندات الممسوحة ضوئيًا).",
    mobileTabFiles: "ملفات PDF",
    mobileTabDiff: "الفروقات",
  },
  ca: {
    nav: "Comparar PDF",
    dashTitle: "Comparar PDF",
    dashDesc:
      "Mostra fàcilment les diferències entre dos fitxers similars. El text s'extreu amb PDF.js i es compara localment — res no es puja.",
    title: "Comparar PDF",
    subtitle:
      "Puja dos PDF per comparar la capa de text costat per costat. S'executa localment al navegador amb PDF.js.",
    privacyNote:
      "Els fitxers no surten d'aquest navegador. El worker de PDF.js es carrega des d'un CDN la primera vegada.",
    firstPdf: "Primer PDF",
    secondPdf: "Segon PDF",
    chooseFile: "Trieu fitxer",
    removeFile: "Elimina",
    clearAll: "Neteja-ho tot",
    extracting: "Extraient text…",
    comparisonLabel: "Diferència de text",
    emptyState: "Trieu dos PDF per veure afegits i eliminacions costat per costat.",
    truncatedWarning: "Es mostren les primeres {max} files.",
    limitExceeded: "El text extret es limita a {max} caràcters per fitxer.",
    noTextHint: "Poc o cap text en un o tots dos PDF (freqüent en pàgines escanejades).",
    mobileTabFiles: "PDF",
    mobileTabDiff: "Diferències",
  },
  cs: {
    nav: "Porovnat PDF",
    dashTitle: "Porovnat PDF",
    dashDesc:
      "Snadno ukažte rozdíly mezi dvěma podobnými soubory. Text se extrahuje pomocí PDF.js a porovnává lokálně — nic se nenahrává.",
    title: "Porovnat PDF",
    subtitle:
      "Nahrajte dvě PDF a porovnejte jejich textovou vrstvu vedle sebe. Běží lokálně v prohlížeči s PDF.js.",
    privacyNote:
      "Soubory neopouštějí tento prohlížeč. Worker PDF.js se při prvním porovnání načte z CDN.",
    firstPdf: "První PDF",
    secondPdf: "Druhé PDF",
    chooseFile: "Vybrat soubor",
    removeFile: "Odebrat",
    clearAll: "Vymazat vše",
    extracting: "Extrahuji text…",
    comparisonLabel: "Textový rozdíl",
    emptyState: "Vyberte dvě PDF a uvidíte přidané a odebrané řádky vedle sebe.",
    truncatedWarning: "Zobrazuji prvních {max} řádků.",
    limitExceeded: "Extrahovaný text je omezen na {max} znaků na soubor.",
    noTextHint: "V jednom nebo obou PDF je málo nebo žádný text (běžné u skenů).",
    mobileTabFiles: "PDF",
    mobileTabDiff: "Rozdíl",
  },
  da: {
    nav: "Sammenlign PDF",
    dashTitle: "Sammenlign PDF",
    dashDesc:
      "Vis nemt forskelle mellem to lignende filer. Tekst udtrækkes med PDF.js og sammenlignes lokalt — intet uploades.",
    title: "Sammenlign PDF",
    subtitle:
      "Upload to PDF-filer for at sammenligne tekstlag side om side. Kører lokalt i din browser med PDF.js.",
    privacyNote:
      "Dine filer forlader ikke denne browser. PDF.js-worker indlæses fra et CDN første gang.",
    firstPdf: "Første PDF",
    secondPdf: "Anden PDF",
    chooseFile: "Vælg fil",
    removeFile: "Fjern",
    clearAll: "Ryd alt",
    extracting: "Udtrækker tekst…",
    comparisonLabel: "Tekstdiff",
    emptyState: "Vælg to PDF-filer for at se tilføjelser og fjernelser side om side.",
    truncatedWarning: "Viser de første {max} rækker.",
    limitExceeded: "Udtrukket tekst er begrænset til {max} tegn pr. fil.",
    noTextHint: "Der blev fundet lidt eller ingen tekst i en eller begge PDF'er (almindeligt ved scanninger).",
    mobileTabFiles: "PDF'er",
    mobileTabDiff: "Diff",
  },
  de: {
    nav: "PDF vergleichen",
    dashTitle: "PDF vergleichen",
    dashDesc:
      "Unterschiede zwischen zwei ähnlichen Dateien einfach anzeigen. Text wird mit PDF.js lokal extrahiert und verglichen — kein Upload.",
    title: "PDF vergleichen",
    subtitle:
      "Zwei PDFs hochladen und die Textebene nebeneinander vergleichen. Läuft lokal im Browser mit PDF.js.",
    privacyNote:
      "Ihre Dateien verlassen diesen Browser nicht. Der PDF.js-Worker wird beim ersten Vergleich von einem CDN geladen.",
    firstPdf: "Erstes PDF",
    secondPdf: "Zweites PDF",
    chooseFile: "Datei wählen",
    removeFile: "Entfernen",
    clearAll: "Alles löschen",
    extracting: "Text wird extrahiert…",
    comparisonLabel: "Textdiff",
    emptyState: "Wählen Sie zwei PDFs, um Hinzufügungen und Entfernungen nebeneinander zu sehen.",
    truncatedWarning: "Es werden die ersten {max} Zeilen angezeigt.",
    limitExceeded: "Extrahierter Text ist auf {max} Zeichen pro Datei begrenzt.",
    noTextHint: "In einem oder beiden PDFs wurde wenig oder kein Text gefunden (häufig bei Scans).",
    mobileTabFiles: "PDFs",
    mobileTabDiff: "Diff",
  },
  el: {
    nav: "Σύγκριση PDF",
    dashTitle: "Σύγκριση PDF",
    dashDesc:
      "Εμφανίστε εύκολα τις διαφορές μεταξύ δύο παρόμοιων αρχείων. Το κείμενο εξάγεται τοπικά με PDF.js και συγκρίνεται — χωρίς αποστολή στον διακομιστή.",
    title: "Σύγκριση PDF",
    subtitle:
      "Ανεβάστε δύο PDF για να συγκρίνετε το επίπεδο κειμένου πλευρικά. Εκτελείται τοπικά στον browser με PDF.js.",
    privacyNote:
      "Τα αρχεία σας δεν εγκαταλείπουν αυτόν τον browser. Ο worker PDF.js φορτώνεται από CDN την πρώτη φορά.",
    firstPdf: "Πρώτο PDF",
    secondPdf: "Δεύτερο PDF",
    chooseFile: "Επιλογή αρχείου",
    removeFile: "Αφαίρεση",
    clearAll: "Εκκαθάριση όλων",
    extracting: "Εξαγωγή κειμένου…",
    comparisonLabel: "Διαφορά κειμένου",
    emptyState: "Επιλέξτε δύο PDF για να δείτε προσθήκες και αφαιρέσεις πλευρικά.",
    truncatedWarning: "Εμφάνιση των πρώτων {max} γραμμών.",
    limitExceeded: "Το εξαγόμενο κείμενο περιορίζεται σε {max} χαρακτήρες ανά αρχείο.",
    noTextHint: "Βρέθηκε ελάχιστο ή καθόλου κείμενο σε ένα ή και τα δύο PDF (συχνά σε σαρωμένες σελίδες).",
    mobileTabFiles: "PDF",
    mobileTabDiff: "Διαφορά",
  },
  es: {
    nav: "Comparar PDF",
    dashTitle: "Comparar PDF",
    dashDesc:
      "Muestra fácilmente las diferencias entre dos archivos similares. El texto se extrae con PDF.js y se compara en local: no se sube nada.",
    title: "Comparar PDF",
    subtitle:
      "Sube dos PDF para comparar su capa de texto lado a lado. Se ejecuta en local en el navegador con PDF.js.",
    privacyNote:
      "Tus archivos no salen de este navegador. El worker de PDF.js se carga desde un CDN la primera vez.",
    firstPdf: "Primer PDF",
    secondPdf: "Segundo PDF",
    chooseFile: "Elegir archivo",
    removeFile: "Quitar",
    clearAll: "Borrar todo",
    extracting: "Extrayendo texto…",
    comparisonLabel: "Diff de texto",
    emptyState: "Elige dos PDF para ver adiciones y eliminaciones lado a lado.",
    truncatedWarning: "Mostrando las primeras {max} filas.",
    limitExceeded: "El texto extraído está limitado a {max} caracteres por archivo.",
    noTextHint: "Poco o ningún texto en uno o ambos PDF (frecuente en páginas escaneadas).",
    mobileTabFiles: "PDF",
    mobileTabDiff: "Diff",
  },
  fa: {
    nav: "مقایسه PDF",
    dashTitle: "مقایسه PDF",
    dashDesc:
      "تفاوت‌های دو فایل مشابه را به‌سادگی نمایش دهید. متن با PDF.js به‌صورت محلی استخراج و مقایسه می‌شود — چیزی آپلود نمی‌شود.",
    title: "مقایسه PDF",
    subtitle:
      "دو فایل PDF بارگذاری کنید تا لایهٔ متن را کنار هم مقایسه کنید. به‌صورت محلی در مرورگر با PDF.js اجرا می‌شود.",
    privacyNote:
      "فایل‌های شما این مرورگر را ترک نمی‌کنند. worker مربوط به PDF.js بار اول از CDN بارگذاری می‌شود.",
    firstPdf: "PDF اول",
    secondPdf: "PDF دوم",
    chooseFile: "انتخاب فایل",
    removeFile: "حذف",
    clearAll: "پاک‌سازی همه",
    extracting: "در حال استخراج متن…",
    comparisonLabel: "تفاوت متن",
    emptyState: "دو PDF انتخاب کنید تا افزوده‌ها و حذف‌ها را کنار هم ببینید.",
    truncatedWarning: "نمایش {max} سطر اول.",
    limitExceeded: "متن استخراج‌شده به {max} نویسه در هر فایل محدود است.",
    noTextHint: "در یک یا هر دو PDF متن کمی یا اصلاً یافت نشد (در اسکن‌ها رایج است).",
    mobileTabFiles: "فایل‌های PDF",
    mobileTabDiff: "تفاوت",
  },
  fr: {
    nav: "Comparer des PDF",
    dashTitle: "Comparer des PDF",
    dashDesc:
      "Affichez facilement les différences entre deux fichiers similaires. Le texte est extrait avec PDF.js et comparé localement — rien n’est envoyé au serveur.",
    title: "Comparer des PDF",
    subtitle:
      "Importez deux PDF pour comparer leur couche texte côte à côte. S’exécute localement dans le navigateur avec PDF.js.",
    privacyNote:
      "Vos fichiers ne quittent pas ce navigateur. Le worker PDF.js est chargé depuis un CDN lors de la première comparaison.",
    firstPdf: "Premier PDF",
    secondPdf: "Second PDF",
    chooseFile: "Choisir un fichier",
    removeFile: "Retirer",
    clearAll: "Tout effacer",
    extracting: "Extraction du texte…",
    comparisonLabel: "Diff texte",
    emptyState: "Choisissez deux PDF pour voir les ajouts et suppressions côte à côte.",
    truncatedWarning: "Affichage des {max} premières lignes.",
    limitExceeded: "Le texte extrait est limité à {max} caractères par fichier.",
    noTextHint: "Peu ou pas de texte dans un ou les deux PDF (fréquent pour les scans).",
    mobileTabFiles: "PDF",
    mobileTabDiff: "Diff",
  },
  id: {
    nav: "Bandingkan PDF",
    dashTitle: "Bandingkan PDF",
    dashDesc:
      "Tampilkan perbedaan antara dua file serupa dengan mudah. Teks diekstrak dengan PDF.js dan dibandingkan secara lokal — tidak ada unggahan.",
    title: "Bandingkan PDF",
    subtitle:
      "Unggah dua PDF untuk membandingkan lapisan teks berdampingan. Berjalan lokal di browser dengan PDF.js.",
    privacyNote:
      "File Anda tidak meninggalkan browser ini. Worker PDF.js dimuat dari CDN saat pertama kali membandingkan.",
    firstPdf: "PDF pertama",
    secondPdf: "PDF kedua",
    chooseFile: "Pilih file",
    removeFile: "Hapus",
    clearAll: "Bersihkan semua",
    extracting: "Mengekstrak teks…",
    comparisonLabel: "Diff teks",
    emptyState: "Pilih dua PDF untuk melihat penambahan dan penghapusan berdampingan.",
    truncatedWarning: "Menampilkan {max} baris pertama.",
    limitExceeded: "Teks yang diekstrak dibatasi hingga {max} karakter per file.",
    noTextHint: "Sedikit atau tidak ada teks di salah satu atau kedua PDF (umum pada hasil pindaian).",
    mobileTabFiles: "PDF",
    mobileTabDiff: "Diff",
  },
  it: {
    nav: "Confronta PDF",
    dashTitle: "Confronta PDF",
    dashDesc:
      "Mostra facilmente le differenze tra due file simili. Il testo viene estratto con PDF.js e confrontato in locale — nulla viene caricato.",
    title: "Confronta PDF",
    subtitle:
      "Carica due PDF per confrontare il livello testo affiancato. Funziona in locale nel browser con PDF.js.",
    privacyNote:
      "I tuoi file non lasciano questo browser. Il worker PDF.js viene caricato da un CDN la prima volta.",
    firstPdf: "Primo PDF",
    secondPdf: "Secondo PDF",
    chooseFile: "Scegli file",
    removeFile: "Rimuovi",
    clearAll: "Cancella tutto",
    extracting: "Estrazione testo…",
    comparisonLabel: "Diff testo",
    emptyState: "Scegli due PDF per vedere aggiunte e rimozioni affiancate.",
    truncatedWarning: "Prime {max} righe mostrate.",
    limitExceeded: "Il testo estratto è limitato a {max} caratteri per file.",
    noTextHint: "Poco o nessun testo in uno o entrambi i PDF (frequente con pagine scansionate).",
    mobileTabFiles: "PDF",
    mobileTabDiff: "Diff",
  },
  ja: {
    nav: "PDF を比較",
    dashTitle: "PDF を比較",
    dashDesc:
      "似た 2 つのファイルの違いを簡単に表示します。PDF.js でテキストをローカル抽出・比較します。アップロードはありません。",
    title: "PDF を比較",
    subtitle:
      "2 つの PDF を読み込み、テキストレイヤーを並べて比較します。PDF.js でブラウザ内のみで処理します。",
    privacyNote:
      "ファイルはこのブラウザの外に出ません。初回比較時に PDF.js のワーカーが CDN から読み込まれます。",
    firstPdf: "1 つ目の PDF",
    secondPdf: "2 つ目の PDF",
    chooseFile: "ファイルを選択",
    removeFile: "削除",
    clearAll: "すべてクリア",
    extracting: "テキストを抽出しています…",
    comparisonLabel: "テキスト差分",
    emptyState: "2 つの PDF を選ぶと、追加・削除が並んで表示されます。",
    truncatedWarning: "先頭 {max} 行を表示しています。",
    limitExceeded: "抽出テキストはファイルごとに {max} 文字までです。",
    noTextHint: "どちらかまたは両方の PDF にテキストがほとんどありません（スキャン PDF でよくあります）。",
    mobileTabFiles: "PDF",
    mobileTabDiff: "差分",
  },
  ko: {
    nav: "PDF 비교",
    dashTitle: "PDF 비교",
    dashDesc:
      "비슷한 두 파일의 차이를 쉽게 확인하세요. PDF.js로 텍스트를 로컬에서 추출·비교하며 업로드되지 않습니다.",
    title: "PDF 비교",
    subtitle:
      "두 개의 PDF를 업로드하여 텍스트 레이어를 나란히 비교합니다. PDF.js로 브라우저에서만 실행됩니다.",
    privacyNote:
      "파일은 이 브라우저를 벗어나지 않습니다. 처음 비교할 때 PDF.js 워커가 CDN에서 로드됩니다.",
    firstPdf: "첫 번째 PDF",
    secondPdf: "두 번째 PDF",
    chooseFile: "파일 선택",
    removeFile: "제거",
    clearAll: "모두 지우기",
    extracting: "텍스트 추출 중…",
    comparisonLabel: "텍스트 diff",
    emptyState: "두 개의 PDF를 선택하면 추가·삭제를 나란히 볼 수 있습니다.",
    truncatedWarning: "처음 {max}줄만 표시합니다.",
    limitExceeded: "추출된 텍스트는 파일당 {max}자로 제한됩니다.",
    noTextHint: "한쪽 또는 양쪽 PDF에서 텍스트가 거의 없습니다(스캔 문서에서 흔함).",
    mobileTabFiles: "PDF",
    mobileTabDiff: "Diff",
  },
  ms: {
    nav: "Bandingkan PDF",
    dashTitle: "Bandingkan PDF",
    dashDesc:
      "Paparkan perbezaan antara dua fail serupa dengan mudah. Teks diekstrak dengan PDF.js dan dibandingkan secara setempat — tiada muat naik.",
    title: "Bandingkan PDF",
    subtitle:
      "Muat naik dua PDF untuk membandingkan lapisan teks bersebelahan. Berjalan secara setempat dalam pelayar dengan PDF.js.",
    privacyNote:
      "Fail anda tidak meninggalkan pelayar ini. Pekerja PDF.js dimuat dari CDN kali pertama anda membandingkan.",
    firstPdf: "PDF pertama",
    secondPdf: "PDF kedua",
    chooseFile: "Pilih fail",
    removeFile: "Buang",
    clearAll: "Kosongkan semua",
    extracting: "Mengekstrak teks…",
    comparisonLabel: "Diff teks",
    emptyState: "Pilih dua PDF untuk melihat tambahan dan pembuangan bersebelahan.",
    truncatedWarning: "Menunjukkan {max} baris pertama.",
    limitExceeded: "Teks yang diekstrak terhad kepada {max} aksara setiap fail.",
    noTextHint: "Sedikit atau tiada teks dalam satu atau kedua-dua PDF (biasa pada imbasan).",
    mobileTabFiles: "PDF",
    mobileTabDiff: "Diff",
  },
  nb: {
    nav: "Sammenlign PDF",
    dashTitle: "Sammenlign PDF",
    dashDesc:
      "Vis enkelt forskjeller mellom to lignende filer. Tekst hentes ut med PDF.js og sammenlignes lokalt — ingenting lastes opp.",
    title: "Sammenlign PDF",
    subtitle:
      "Last opp to PDF-filer for å sammenligne tekstlag side ved side. Kjører lokalt i nettleseren med PDF.js.",
    privacyNote:
      "Filene dine forlater ikke denne nettleseren. PDF.js-arbeider lastes fra et CDN første gang.",
    firstPdf: "Første PDF",
    secondPdf: "Andre PDF",
    chooseFile: "Velg fil",
    removeFile: "Fjern",
    clearAll: "Tøm alt",
    extracting: "Henter ut tekst…",
    comparisonLabel: "Tekstdiff",
    emptyState: "Velg to PDF-filer for å se tillegg og slettinger side ved side.",
    truncatedWarning: "Viser de første {max} radene.",
    limitExceeded: "Uthentet tekst er begrenset til {max} tegn per fil.",
    noTextHint: "Lite eller ingen tekst i én eller begge PDF-ene (vanlig ved skanning).",
    mobileTabFiles: "PDF-filer",
    mobileTabDiff: "Diff",
  },
  nl: {
    nav: "PDF vergelijken",
    dashTitle: "PDF vergelijken",
    dashDesc:
      "Toon eenvoudig de verschillen tussen twee vergelijkbare bestanden. Tekst wordt met PDF.js lokaal geëxtraheerd en vergeleken — er wordt niets geüpload.",
    title: "PDF vergelijken",
    subtitle:
      "Upload twee PDF’s om de tekstlaag naast elkaar te vergelijken. Draait lokaal in je browser met PDF.js.",
    privacyNote:
      "Je bestanden verlaten deze browser niet. De PDF.js-worker wordt de eerste keer vanaf een CDN geladen.",
    firstPdf: "Eerste PDF",
    secondPdf: "Tweede PDF",
    chooseFile: "Bestand kiezen",
    removeFile: "Verwijderen",
    clearAll: "Alles wissen",
    extracting: "Tekst extraheren…",
    comparisonLabel: "Tekstverschil",
    emptyState: "Kies twee PDF’s om toevoegingen en verwijderingen naast elkaar te zien.",
    truncatedWarning: "Eerste {max} rijen worden getoond.",
    limitExceeded: "Geëxtraheerde tekst is beperkt tot {max} tekens per bestand.",
    noTextHint: "Weinig of geen tekst in een of beide PDF’s (gebruikelijk bij scans).",
    mobileTabFiles: "PDF’s",
    mobileTabDiff: "Diff",
  },
  pl: {
    nav: "Porównaj PDF",
    dashTitle: "Porównaj PDF",
    dashDesc:
      "Łatwo pokaż różnice między dwoma podobnymi plikami. Tekst jest wyciągany przez PDF.js i porównywany lokalnie — nic nie jest wysyłane.",
    title: "Porównaj PDF",
    subtitle:
      "Prześlij dwa pliki PDF, aby porównać warstwę tekstową obok siebie. Działa lokalnie w przeglądarce z PDF.js.",
    privacyNote:
      "Twoje pliki nie opuszczają tej przeglądarki. Worker PDF.js ładuje się z CDN przy pierwszym porównaniu.",
    firstPdf: "Pierwszy PDF",
    secondPdf: "Drugi PDF",
    chooseFile: "Wybierz plik",
    removeFile: "Usuń",
    clearAll: "Wyczyść wszystko",
    extracting: "Wyciąganie tekstu…",
    comparisonLabel: "Różnice tekstu",
    emptyState: "Wybierz dwa pliki PDF, aby zobaczyć dodania i usunięcia obok siebie.",
    truncatedWarning: "Wyświetlane są pierwsze {max} wierszy.",
    limitExceeded: "Wyciągnięty tekst jest ograniczony do {max} znaków na plik.",
    noTextHint: "W jednym lub obu plikach PDF jest mało lub brak tekstu (częste przy skanach).",
    mobileTabFiles: "PDF",
    mobileTabDiff: "Różnice",
  },
  pt: {
    nav: "Comparar PDF",
    dashTitle: "Comparar PDF",
    dashDesc:
      "Mostre facilmente as diferenças entre dois ficheiros semelhantes. O texto é extraído com PDF.js e comparado localmente — nada é enviado.",
    title: "Comparar PDF",
    subtitle:
      "Carregue dois PDFs para comparar a camada de texto lado a lado. Corre localmente no navegador com PDF.js.",
    privacyNote:
      "Os seus ficheiros não saem deste navegador. O worker PDF.js é carregado a partir de um CDN na primeira vez.",
    firstPdf: "Primeiro PDF",
    secondPdf: "Segundo PDF",
    chooseFile: "Escolher ficheiro",
    removeFile: "Remover",
    clearAll: "Limpar tudo",
    extracting: "A extrair texto…",
    comparisonLabel: "Diff de texto",
    emptyState: "Escolha dois PDFs para ver adições e remoções lado a lado.",
    truncatedWarning: "A mostrar as primeiras {max} linhas.",
    limitExceeded: "O texto extraído está limitado a {max} caracteres por ficheiro.",
    noTextHint: "Pouco ou nenhum texto num ou em ambos os PDFs (comum em digitalizações).",
    mobileTabFiles: "PDFs",
    mobileTabDiff: "Diff",
  },
  "pt-BR": {
    nav: "Comparar PDF",
    dashTitle: "Comparar PDF",
    dashDesc:
      "Mostre facilmente as diferenças entre dois arquivos semelhantes. O texto é extraído com PDF.js e comparado localmente — nada é enviado.",
    title: "Comparar PDF",
    subtitle:
      "Envie dois PDFs para comparar a camada de texto lado a lado. Roda localmente no navegador com PDF.js.",
    privacyNote:
      "Seus arquivos não saem deste navegador. O worker do PDF.js é carregado de um CDN na primeira comparação.",
    firstPdf: "Primeiro PDF",
    secondPdf: "Segundo PDF",
    chooseFile: "Escolher arquivo",
    removeFile: "Remover",
    clearAll: "Limpar tudo",
    extracting: "Extraindo texto…",
    comparisonLabel: "Diff de texto",
    emptyState: "Escolha dois PDFs para ver adições e remoções lado a lado.",
    truncatedWarning: "Mostrando as primeiras {max} linhas.",
    limitExceeded: "O texto extraído é limitado a {max} caracteres por arquivo.",
    noTextHint: "Pouco ou nenhum texto em um ou ambos os PDFs (comum em digitalizações).",
    mobileTabFiles: "PDFs",
    mobileTabDiff: "Diff",
  },
  ru: {
    nav: "Сравнить PDF",
    dashTitle: "Сравнить PDF",
    dashDesc:
      "Наглядно покажите отличия между двумя похожими файлами. Текст извлекается с помощью PDF.js и сравнивается локально — ничего не загружается на сервер.",
    title: "Сравнить PDF",
    subtitle:
      "Загрузите два PDF, чтобы сравнить текстовый слой рядом. Работает локально в браузере с PDF.js.",
    privacyNote:
      "Ваши файлы не покидают этот браузер. Воркер PDF.js подгружается с CDN при первом сравнении.",
    firstPdf: "Первый PDF",
    secondPdf: "Второй PDF",
    chooseFile: "Выбрать файл",
    removeFile: "Убрать",
    clearAll: "Очистить всё",
    extracting: "Извлечение текста…",
    comparisonLabel: "Текстовые отличия",
    emptyState: "Выберите два PDF, чтобы увидеть добавления и удаления рядом.",
    truncatedWarning: "Показаны первые {max} строк.",
    limitExceeded: "Извлечённый текст ограничен {max} символами на файл.",
    noTextHint: "В одном или обоих PDF мало текста (часто у отсканированных страниц).",
    mobileTabFiles: "PDF",
    mobileTabDiff: "Отличия",
  },
  sv: {
    nav: "Jämför PDF",
    dashTitle: "Jämför PDF",
    dashDesc:
      "Visa enkelt skillnaderna mellan två liknande filer. Text extraheras med PDF.js och jämförs lokalt — inget laddas upp.",
    title: "Jämför PDF",
    subtitle:
      "Ladda upp två PDF-filer för att jämföra textlagret sida vid sida. Körs lokalt i webbläsaren med PDF.js.",
    privacyNote:
      "Dina filer lämnar inte den här webbläsaren. PDF.js-arbetaren laddas från ett CDN första gången.",
    firstPdf: "Första PDF",
    secondPdf: "Andra PDF",
    chooseFile: "Välj fil",
    removeFile: "Ta bort",
    clearAll: "Rensa allt",
    extracting: "Extraherar text…",
    comparisonLabel: "Textdiff",
    emptyState: "Välj två PDF-filer för att se tillägg och borttagningar sida vid sida.",
    truncatedWarning: "Visar de första {max} raderna.",
    limitExceeded: "Extraherad text är begränsad till {max} tecken per fil.",
    noTextHint: "Lite eller ingen text i en eller båda PDF:erna (vanligt vid skanning).",
    mobileTabFiles: "PDF",
    mobileTabDiff: "Diff",
  },
  tr: {
    nav: "PDF karşılaştır",
    dashTitle: "PDF karşılaştır",
    dashDesc:
      "İki benzer dosya arasındaki farkları kolayca gösterin. Metin PDF.js ile yerel olarak çıkarılır ve karşılaştırılır — hiçbir şey yüklenmez.",
    title: "PDF karşılaştır",
    subtitle:
      "Metin katmanını yan yana karşılaştırmak için iki PDF yükleyin. PDF.js ile tarayıcıda yerel çalışır.",
    privacyNote:
      "Dosyalarınız bu tarayıcıdan çıkmaz. PDF.js worker ilk karşılaştırmada bir CDN’den yüklenir.",
    firstPdf: "Birinci PDF",
    secondPdf: "İkinci PDF",
    chooseFile: "Dosya seç",
    removeFile: "Kaldır",
    clearAll: "Tümünü temizle",
    extracting: "Metin çıkarılıyor…",
    comparisonLabel: "Metin farkı",
    emptyState: "Eklemeleri ve silmeleri yan yana görmek için iki PDF seçin.",
    truncatedWarning: "İlk {max} satır gösteriliyor.",
    limitExceeded: "Çıkarılan metin dosya başına {max} karakterle sınırlıdır.",
    noTextHint: "Bir veya her iki PDF’de az veya hiç metin yok (taranmış sayfalarda yaygın).",
    mobileTabFiles: "PDF’ler",
    mobileTabDiff: "Fark",
  },
  uk: {
    nav: "Порівняти PDF",
    dashTitle: "Порівняти PDF",
    dashDesc:
      "Легко покажіть відмінності між двома схожими файлами. Текст витягується за допомогою PDF.js і порівнюється локально — нічого не завантажується.",
    title: "Порівняти PDF",
    subtitle:
      "Завантажте два PDF, щоб порівняти текстовий шар поруч. Працює локально в браузері з PDF.js.",
    privacyNote:
      "Ваші файли не залишають цей браузер. Worker PDF.js завантажується з CDN під час першого порівняння.",
    firstPdf: "Перший PDF",
    secondPdf: "Другий PDF",
    chooseFile: "Вибрати файл",
    removeFile: "Прибрати",
    clearAll: "Очистити все",
    extracting: "Витяг тексту…",
    comparisonLabel: "Текстові відмінності",
    emptyState: "Оберіть два PDF, щоб побачити додавання й вилучення поруч.",
    truncatedWarning: "Показано перші {max} рядків.",
    limitExceeded: "Витягнутий текст обмежений {max} символами на файл.",
    noTextHint: "Мало або немає тексту в одному або обох PDF (часто для відсканованих сторінок).",
    mobileTabFiles: "PDF",
    mobileTabDiff: "Відмінності",
  },
  vi: {
    nav: "So sánh PDF",
    dashTitle: "So sánh PDF",
    dashDesc:
      "Dễ dàng hiển thị khác biệt giữa hai tệp tương tự. Văn bản được trích xuất bằng PDF.js và so sánh cục bộ — không tải lên máy chủ.",
    title: "So sánh PDF",
    subtitle:
      "Tải lên hai PDF để so sánh lớp văn bản cạnh nhau. Chạy cục bộ trong trình duyệt với PDF.js.",
    privacyNote:
      "Tệp của bạn không rời khỏi trình duyệt này. Worker PDF.js được tải từ CDN lần đầu so sánh.",
    firstPdf: "PDF thứ nhất",
    secondPdf: "PDF thứ hai",
    chooseFile: "Chọn tệp",
    removeFile: "Gỡ",
    clearAll: "Xóa tất cả",
    extracting: "Đang trích xuất văn bản…",
    comparisonLabel: "Khác biệt văn bản",
    emptyState: "Chọn hai PDF để xem phần thêm và phần xóa cạnh nhau.",
    truncatedWarning: "Hiển thị {max} dòng đầu tiên.",
    limitExceeded: "Văn bản trích xuất giới hạn {max} ký tự mỗi tệp.",
    noTextHint: "Ít hoặc không có văn bản trong một hoặc cả hai PDF (thường gặp với trang quét).",
    mobileTabFiles: "PDF",
    mobileTabDiff: "Khác biệt",
  },
  zh: {
    nav: "比较 PDF",
    dashTitle: "比较 PDF",
    dashDesc:
      "轻松展示两个相似文件之间的差异。使用 PDF.js 在本地提取并比较文本 — 不会上传任何内容。",
    title: "比较 PDF",
    subtitle: "上传两个 PDF，并排比较文本层。在浏览器中通过 PDF.js 本地运行。",
    privacyNote: "您的文件不会离开本浏览器。首次比较时从 CDN 加载 PDF.js 工作线程。",
    firstPdf: "第一个 PDF",
    secondPdf: "第二个 PDF",
    chooseFile: "选择文件",
    removeFile: "移除",
    clearAll: "全部清除",
    extracting: "正在提取文本…",
    comparisonLabel: "文本差异",
    emptyState: "选择两个 PDF 以并排查看新增与删除。",
    truncatedWarning: "仅显示前 {max} 行。",
    limitExceeded: "每个文件提取的文本最多 {max} 个字符。",
    noTextHint: "其中一个或两个 PDF 几乎没有可提取文本（扫描件常见）。",
    mobileTabFiles: "PDF",
    mobileTabDiff: "差异",
  },
};

const enFallback = T.en;

const PDF_ERR_FALLBACK_EN = {
  invalidPdf: "Could not read this file as a PDF.",
  passwordRequired:
    "This PDF needs a password. Unlock it with PDF Unlocker first, then try again.",
  genericError: "Could not process this PDF. Try a different file.",
};

function buildPdfCompare(locale, messages) {
  const tr = T[locale] || enFallback;
  const ptj = messages.PdfToJpg || {};
  return {
    title: tr.title,
    subtitle: tr.subtitle,
    privacyNote: tr.privacyNote,
    firstPdf: tr.firstPdf,
    secondPdf: tr.secondPdf,
    chooseFile: tr.chooseFile,
    removeFile: tr.removeFile,
    clearAll: tr.clearAll,
    extracting: tr.extracting,
    comparisonLabel: tr.comparisonLabel,
    emptyState: tr.emptyState,
    truncatedWarning: tr.truncatedWarning,
    limitExceeded: tr.limitExceeded,
    noTextHint: tr.noTextHint,
    mobileTabFiles: tr.mobileTabFiles,
    mobileTabDiff: tr.mobileTabDiff,
    invalidPdf: ptj.invalidPdf || PDF_ERR_FALLBACK_EN.invalidPdf,
    passwordRequired: ptj.passwordRequired || PDF_ERR_FALLBACK_EN.passwordRequired,
    genericError: ptj.genericError || PDF_ERR_FALLBACK_EN.genericError,
  };
}

for (const file of fs.readdirSync(MESSAGES_DIR).filter((f) => f.endsWith(".json"))) {
  const fp = path.join(MESSAGES_DIR, file);
  const locale = file.replace(/\.json$/i, "");
  const j = JSON.parse(fs.readFileSync(fp, "utf8"));
  const tr = T[locale] || enFallback;

  if (!j.Navigation) j.Navigation = {};
  j.Navigation.pdfCompare = tr.nav;

  if (!j.Dashboard) j.Dashboard = {};
  if (!j.Dashboard.tools) j.Dashboard.tools = {};
  j.Dashboard.tools.pdfCompare = {
    title: tr.dashTitle,
    description: tr.dashDesc,
  };

  j.PdfCompare = buildPdfCompare(locale, j);

  fs.writeFileSync(fp, JSON.stringify(j, null, 2) + "\n");
}

console.log("Updated PdfCompare strings in", fs.readdirSync(MESSAGES_DIR).filter((f) => f.endsWith(".json")).length, "locale files.");

