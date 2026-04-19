/**
 * Applies localized JPG→PDF strings to messages/*.json (all locales except en).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const messagesDir = path.join(__dirname, "../messages");

/** @typedef {{ nav: string, dashTitle: string, dashDesc: string, panel: Record<string, string> }} Bundle */

/** @type {Record<string, Bundle>} */
const BUNDLES = {
  fr: {
    nav: "JPG vers PDF",
    dashTitle: "JPG vers PDF",
    dashDesc:
      "Convertissez des images JPG en PDF en quelques secondes. Ajustez facilement l'orientation et les marges.",
    panel: {
      intro:
        "Convertissez des images JPG en PDF en quelques secondes. Ajustez facilement l'orientation et les marges.",
      privacyNote: "Vos fichiers ne quittent jamais ce navigateur.",
      orderHint:
        "Les fichiers en haut deviennent les premières pages du PDF. Utilisez les flèches pour réordonner.",
      rotationLabel: "Rotation (toutes les pages)",
      rotation0: "0°",
      rotation90: "90°",
      rotation180: "180°",
      rotation270: "270°",
      marginLabel: "Marge uniforme",
      marginValue: "{mm} mm",
      addImages: "Ajouter des JPEG",
      clearAll: "Effacer la liste",
      downloadPdf: "Créer le PDF et télécharger",
      building: "Création du PDF…",
      moveUpAria: "Monter",
      moveDownAria: "Descendre",
      removeFileAria: "Retirer de la liste",
      minOneJpeg: "Ajoutez au moins un fichier JPEG.",
      invalidJpeg: "Ce fichier n'est pas un JPEG (JPG) valide.",
      buildFailed:
        "Impossible de créer le PDF. Retirez les fichiers non pris en charge et réessayez.",
    },
  },
  es: {
    nav: "JPG a PDF",
    dashTitle: "JPG a PDF",
    dashDesc:
      "Convierte imágenes JPG a PDF en segundos. Ajusta fácilmente la orientación y los márgenes.",
    panel: {
      intro:
        "Convierte imágenes JPG a PDF en segundos. Ajusta fácilmente la orientación y los márgenes.",
      privacyNote: "Tus archivos nunca salen de este navegador.",
      orderHint:
        "Los archivos de arriba serán las primeras páginas del PDF. Usa las flechas para reordenar.",
      rotationLabel: "Rotación (todas las páginas)",
      rotation0: "0°",
      rotation90: "90°",
      rotation180: "180°",
      rotation270: "270°",
      marginLabel: "Margen uniforme",
      marginValue: "{mm} mm",
      addImages: "Añadir JPEG",
      clearAll: "Vaciar lista",
      downloadPdf: "Crear PDF y descargar",
      building: "Creando el PDF…",
      moveUpAria: "Subir",
      moveDownAria: "Bajar",
      removeFileAria: "Quitar de la lista",
      minOneJpeg: "Añade al menos un archivo JPEG.",
      invalidJpeg: "Este archivo no es un JPEG (JPG) válido.",
      buildFailed:
        "No se pudo crear el PDF. Quita archivos no compatibles e inténtalo de nuevo.",
    },
  },
  de: {
    nav: "JPG zu PDF",
    dashTitle: "JPG zu PDF",
    dashDesc:
      "Wandeln Sie JPG-Bilder in Sekunden in PDF um. Ausrichtung und Ränder lassen sich einfach anpassen.",
    panel: {
      intro:
        "Wandeln Sie JPG-Bilder in Sekunden in PDF um. Ausrichtung und Ränder lassen sich einfach anpassen.",
      privacyNote: "Ihre Dateien verlassen diesen Browser nie.",
      orderHint:
        "Dateien oben werden die ersten Seiten im PDF. Mit den Pfeilen sortieren.",
      rotationLabel: "Drehung (alle Seiten)",
      rotation0: "0°",
      rotation90: "90°",
      rotation180: "180°",
      rotation270: "270°",
      marginLabel: "Einheitlicher Rand",
      marginValue: "{mm} mm",
      addImages: "JPEGs hinzufügen",
      clearAll: "Liste leeren",
      downloadPdf: "PDF erstellen & herunterladen",
      building: "PDF wird erstellt…",
      moveUpAria: "Nach oben",
      moveDownAria: "Nach unten",
      removeFileAria: "Aus Liste entfernen",
      minOneJpeg: "Fügen Sie mindestens eine JPEG-Datei hinzu.",
      invalidJpeg: "Diese Datei ist kein gültiges JPEG (JPG).",
      buildFailed:
        "PDF konnte nicht erstellt werden. Nicht unterstützte Dateien entfernen und erneut versuchen.",
    },
  },
  it: {
    nav: "JPG in PDF",
    dashTitle: "JPG in PDF",
    dashDesc:
      "Converti immagini JPG in PDF in pochi secondi. Regola facilmente orientazione e margini.",
    panel: {
      intro:
        "Converti immagini JPG in PDF in pochi secondi. Regola facilmente orientazione e margini.",
      privacyNote: "I tuoi file non lasciano mai questo browser.",
      orderHint:
        "I file in alto diventano le prime pagine del PDF. Usa le frecce per riordinare.",
      rotationLabel: "Rotazione (tutte le pagine)",
      rotation0: "0°",
      rotation90: "90°",
      rotation180: "180°",
      rotation270: "270°",
      marginLabel: "Margine uniforme",
      marginValue: "{mm} mm",
      addImages: "Aggiungi JPEG",
      clearAll: "Svuota elenco",
      downloadPdf: "Crea PDF e scarica",
      building: "Creazione PDF…",
      moveUpAria: "Sposta su",
      moveDownAria: "Sposta giù",
      removeFileAria: "Rimuovi dall'elenco",
      minOneJpeg: "Aggiungi almeno un file JPEG.",
      invalidJpeg: "Questo file non è un JPEG (JPG) valido.",
      buildFailed:
        "Impossibile creare il PDF. Rimuovi i file non supportati e riprova.",
    },
  },
  pt: {
    nav: "JPG para PDF",
    dashTitle: "JPG para PDF",
    dashDesc:
      "Converta imagens JPG em PDF em segundos. Ajuste facilmente a orientação e as margens.",
    panel: {
      intro:
        "Converta imagens JPG em PDF em segundos. Ajuste facilmente a orientação e as margens.",
      privacyNote: "Os seus ficheiros nunca saem deste navegador.",
      orderHint:
        "Os ficheiros no topo passam a ser as primeiras páginas do PDF. Use as setas para reordenar.",
      rotationLabel: "Rotação (todas as páginas)",
      rotation0: "0°",
      rotation90: "90°",
      rotation180: "180°",
      rotation270: "270°",
      marginLabel: "Margem uniforme",
      marginValue: "{mm} mm",
      addImages: "Adicionar JPEG",
      clearAll: "Limpar lista",
      downloadPdf: "Criar PDF e transferir",
      building: "A criar o PDF…",
      moveUpAria: "Mover para cima",
      moveDownAria: "Mover para baixo",
      removeFileAria: "Remover da lista",
      minOneJpeg: "Adicione pelo menos um ficheiro JPEG.",
      invalidJpeg: "Este ficheiro não é um JPEG (JPG) válido.",
      buildFailed:
        "Não foi possível criar o PDF. Remova ficheiros não suportados e tente novamente.",
    },
  },
  "pt-BR": {
    nav: "JPG para PDF",
    dashTitle: "JPG para PDF",
    dashDesc:
      "Converta imagens JPG para PDF em segundos. Ajuste facilmente a orientação e as margens.",
    panel: {
      intro:
        "Converta imagens JPG para PDF em segundos. Ajuste facilmente a orientação e as margens.",
      privacyNote: "Seus arquivos nunca saem deste navegador.",
      orderHint:
        "Os arquivos no topo viram as primeiras páginas do PDF. Use as setas para reordenar.",
      rotationLabel: "Rotação (todas as páginas)",
      rotation0: "0°",
      rotation90: "90°",
      rotation180: "180°",
      rotation270: "270°",
      marginLabel: "Margem uniforme",
      marginValue: "{mm} mm",
      addImages: "Adicionar JPEG",
      clearAll: "Limpar lista",
      downloadPdf: "Criar PDF e baixar",
      building: "Gerando o PDF…",
      moveUpAria: "Mover para cima",
      moveDownAria: "Mover para baixo",
      removeFileAria: "Remover da lista",
      minOneJpeg: "Adicione pelo menos um arquivo JPEG.",
      invalidJpeg: "Este arquivo não é um JPEG (JPG) válido.",
      buildFailed:
        "Não foi possível criar o PDF. Remova arquivos não suportados e tente novamente.",
    },
  },
  nl: {
    nav: "JPG naar PDF",
    dashTitle: "JPG naar PDF",
    dashDesc:
      "Zet JPG-afbeeldingen in enkele seconden om naar PDF. Pas eenvoudig oriëntatie en marges aan.",
    panel: {
      intro:
        "Zet JPG-afbeeldingen in enkele seconden om naar PDF. Pas eenvoudig oriëntatie en marges aan.",
      privacyNote: "Uw bestanden verlaten deze browser nooit.",
      orderHint:
        "Bestanden bovenaan worden de eerste pagina's van de PDF. Gebruik de pijlen om te herschikken.",
      rotationLabel: "Rotatie (alle pagina's)",
      rotation0: "0°",
      rotation90: "90°",
      rotation180: "180°",
      rotation270: "270°",
      marginLabel: "Uniforme marge",
      marginValue: "{mm} mm",
      addImages: "JPEG's toevoegen",
      clearAll: "Lijst wissen",
      downloadPdf: "PDF maken en downloaden",
      building: "PDF wordt gemaakt…",
      moveUpAria: "Omhoog",
      moveDownAria: "Omlaag",
      removeFileAria: "Uit lijst verwijderen",
      minOneJpeg: "Voeg minstens één JPEG-bestand toe.",
      invalidJpeg: "Dit bestand is geen geldige JPEG (JPG).",
      buildFailed:
        "Kan de PDF niet maken. Verwijder niet-ondersteunde bestanden en probeer opnieuw.",
    },
  },
  pl: {
    nav: "JPG do PDF",
    dashTitle: "JPG do PDF",
    dashDesc:
      "Konwertuj obrazy JPG na PDF w kilka sekund. Łatwo dostosuj orientację i marginesy.",
    panel: {
      intro:
        "Konwertuj obrazy JPG na PDF w kilka sekund. Łatwo dostosuj orientację i marginesy.",
      privacyNote: "Twoje pliki nigdy nie opuszczają tej przeglądarki.",
      orderHint:
        "Pliki u góry stają się pierwszymi stronami PDF. Strzałkami zmienisz kolejność.",
      rotationLabel: "Obrót (wszystkie strony)",
      rotation0: "0°",
      rotation90: "90°",
      rotation180: "180°",
      rotation270: "270°",
      marginLabel: "Jednolity margines",
      marginValue: "{mm} mm",
      addImages: "Dodaj pliki JPEG",
      clearAll: "Wyczyść listę",
      downloadPdf: "Utwórz PDF i pobierz",
      building: "Tworzenie PDF…",
      moveUpAria: "W górę",
      moveDownAria: "W dół",
      removeFileAria: "Usuń z listy",
      minOneJpeg: "Dodaj co najmniej jeden plik JPEG.",
      invalidJpeg: "Ten plik nie jest prawidłowym JPEG (JPG).",
      buildFailed:
        "Nie można utworzyć PDF. Usuń nieobsługiwane pliki i spróbuj ponownie.",
    },
  },
  cs: {
    nav: "JPG do PDF",
    dashTitle: "JPG do PDF",
    dashDesc:
      "Převádějte obrázky JPG do PDF během několika sekund. Snadno upravíte orientaci a okraje.",
    panel: {
      intro:
        "Převádějte obrázky JPG do PDF během několika sekund. Snadno upravíte orientaci a okraje.",
      privacyNote: "Vaše soubory tento prohlížeč nikdy neopustí.",
      orderHint:
        "Soubory nahoře se stanou prvními stránkami PDF. Šipkami je přeuspořádejte.",
      rotationLabel: "Otočení (všechny stránky)",
      rotation0: "0°",
      rotation90: "90°",
      rotation180: "180°",
      rotation270: "270°",
      marginLabel: "Stejné okraje",
      marginValue: "{mm} mm",
      addImages: "Přidat JPEG",
      clearAll: "Vymazat seznam",
      downloadPdf: "Vytvořit PDF a stáhnout",
      building: "Vytváření PDF…",
      moveUpAria: "Nahoru",
      moveDownAria: "Dolů",
      removeFileAria: "Odebrat ze seznamu",
      minOneJpeg: "Přidejte alespoň jeden soubor JPEG.",
      invalidJpeg: "Tento soubor není platný JPEG (JPG).",
      buildFailed:
        "PDF se nepodařilo vytvořit. Odstraňte nepodporované soubory a zkuste to znovu.",
    },
  },
  sv: {
    nav: "JPG till PDF",
    dashTitle: "JPG till PDF",
    dashDesc:
      "Konvertera JPG-bilder till PDF på några sekunder. Justera enkelt orientering och marginaler.",
    panel: {
      intro:
        "Konvertera JPG-bilder till PDF på några sekunder. Justera enkelt orientering och marginaler.",
      privacyNote: "Dina filer lämnar aldrig den här webbläsaren.",
      orderHint:
        "Filer högst upp blir de första sidorna i PDF:en. Använd pilarna för att ändra ordning.",
      rotationLabel: "Rotation (alla sidor)",
      rotation0: "0°",
      rotation90: "90°",
      rotation180: "180°",
      rotation270: "270°",
      marginLabel: "Enhetlig marginal",
      marginValue: "{mm} mm",
      addImages: "Lägg till JPEG-filer",
      clearAll: "Rensa listan",
      downloadPdf: "Skapa PDF och ladda ner",
      building: "Skapar PDF…",
      moveUpAria: "Flytta upp",
      moveDownAria: "Flytta ned",
      removeFileAria: "Ta bort från listan",
      minOneJpeg: "Lägg till minst en JPEG-fil.",
      invalidJpeg: "Den här filen är inte en giltig JPEG (JPG).",
      buildFailed:
        "Det gick inte att skapa PDF:en. Ta bort filer som inte stöds och försök igen.",
    },
  },
  da: {
    nav: "JPG til PDF",
    dashTitle: "JPG til PDF",
    dashDesc:
      "Konverter JPG-billeder til PDF på få sekunder. Juster nemt orientering og margener.",
    panel: {
      intro:
        "Konverter JPG-billeder til PDF på få sekunder. Juster nemt orientering og margener.",
      privacyNote: "Dine filer forlader aldrig denne browser.",
      orderHint:
        "Filer øverst bliver de første sider i PDF'en. Brug pilene til at omarrangere.",
      rotationLabel: "Rotation (alle sider)",
      rotation0: "0°",
      rotation90: "90°",
      rotation180: "180°",
      rotation270: "270°",
      marginLabel: "Ensartet margin",
      marginValue: "{mm} mm",
      addImages: "Tilføj JPEG-filer",
      clearAll: "Ryd listen",
      downloadPdf: "Opret PDF og download",
      building: "Opretter PDF…",
      moveUpAria: "Flyt op",
      moveDownAria: "Flyt ned",
      removeFileAria: "Fjern fra listen",
      minOneJpeg: "Tilføj mindst én JPEG-fil.",
      invalidJpeg: "Denne fil er ikke en gyldig JPEG (JPG).",
      buildFailed:
        "PDF'en kunne ikke oprettes. Fjern filer, der ikke understøttes, og prøv igen.",
    },
  },
  nb: {
    nav: "JPG til PDF",
    dashTitle: "JPG til PDF",
    dashDesc:
      "Konverter JPG-bilder til PDF på noen sekunder. Juster retning og marginer enkelt.",
    panel: {
      intro:
        "Konverter JPG-bilder til PDF på noen sekunder. Juster retning og marginer enkelt.",
      privacyNote: "Filene dine forlater aldri denne nettleseren.",
      orderHint:
        "Filer øverst blir de første sidene i PDF-en. Bruk pilene for å sortere om.",
      rotationLabel: "Rotasjon (alle sider)",
      rotation0: "0°",
      rotation90: "90°",
      rotation180: "180°",
      rotation270: "270°",
      marginLabel: "Lik margin",
      marginValue: "{mm} mm",
      addImages: "Legg til JPEG-filer",
      clearAll: "Tøm listen",
      downloadPdf: "Lag PDF og last ned",
      building: "Lager PDF…",
      moveUpAria: "Flytt opp",
      moveDownAria: "Flytt ned",
      removeFileAria: "Fjern fra listen",
      minOneJpeg: "Legg til minst én JPEG-fil.",
      invalidJpeg: "Denne filen er ikke en gyldig JPEG (JPG).",
      buildFailed:
        "Kunne ikke lage PDF-en. Fjern filer som ikke støttes, og prøv igjen.",
    },
  },
  tr: {
    nav: "JPG'den PDF'e",
    dashTitle: "JPG'den PDF'e",
    dashDesc:
      "JPG görsellerini saniyeler içinde PDF'ye dönüştürün. Yönelimi ve kenar boşluklarını kolayca ayarlayın.",
    panel: {
      intro:
        "JPG görsellerini saniyeler içinde PDF'ye dönüştürün. Yönelimi ve kenar boşluklarını kolayca ayarlayın.",
      privacyNote: "Dosyalarınız bu tarayıcıdan hiç çıkmaz.",
      orderHint:
        "Üstteki dosyalar PDF'teki ilk sayfalar olur. Sıralamayı değiştirmek için okları kullanın.",
      rotationLabel: "Döndürme (tüm sayfalar)",
      rotation0: "0°",
      rotation90: "90°",
      rotation180: "180°",
      rotation270: "270°",
      marginLabel: "Tek tip kenar boşluğu",
      marginValue: "{mm} mm",
      addImages: "JPEG ekle",
      clearAll: "Listeyi temizle",
      downloadPdf: "PDF oluştur ve indir",
      building: "PDF oluşturuluyor…",
      moveUpAria: "Yukarı taşı",
      moveDownAria: "Aşağı taşı",
      removeFileAria: "Listeden kaldır",
      minOneJpeg: "En az bir JPEG dosyası ekleyin.",
      invalidJpeg: "Bu dosya geçerli bir JPEG (JPG) değil.",
      buildFailed:
        "PDF oluşturulamadı. Desteklenmeyen dosyaları kaldırıp yeniden deneyin.",
    },
  },
  ru: {
    nav: "JPG в PDF",
    dashTitle: "JPG в PDF",
    dashDesc:
      "Конвертируйте изображения JPG в PDF за секунды. Легко настройте ориентацию и поля.",
    panel: {
      intro:
        "Конвертируйте изображения JPG в PDF за секунды. Легко настройте ориентацию и поля.",
      privacyNote: "Ваши файлы не покидают этот браузер.",
      orderHint:
        "Файлы сверху станут первыми страницами PDF. Стрелками меняйте порядок.",
      rotationLabel: "Поворот (все страницы)",
      rotation0: "0°",
      rotation90: "90°",
      rotation180: "180°",
      rotation270: "270°",
      marginLabel: "Одинаковые поля",
      marginValue: "{mm} мм",
      addImages: "Добавить JPEG",
      clearAll: "Очистить список",
      downloadPdf: "Создать PDF и скачать",
      building: "Создание PDF…",
      moveUpAria: "Вверх",
      moveDownAria: "Вниз",
      removeFileAria: "Удалить из списка",
      minOneJpeg: "Добавьте хотя бы один файл JPEG.",
      invalidJpeg: "Этот файл не является допустимым JPEG (JPG).",
      buildFailed:
        "Не удалось создать PDF. Удалите неподдерживаемые файлы и повторите попытку.",
    },
  },
  uk: {
    nav: "JPG у PDF",
    dashTitle: "JPG у PDF",
    dashDesc:
      "Конвертуйте зображення JPG у PDF за секунди. Легко налаштуйте орієнтацію та поля.",
    panel: {
      intro:
        "Конвертуйте зображення JPG у PDF за секунди. Легко налаштуйте орієнтацію та поля.",
      privacyNote: "Ваші файли ніколи не залишають цей браузер.",
      orderHint:
        "Файли зверху стануть першими сторінками PDF. Стрілками змінюйте порядок.",
      rotationLabel: "Поворот (усі сторінки)",
      rotation0: "0°",
      rotation90: "90°",
      rotation180: "180°",
      rotation270: "270°",
      marginLabel: "Однакові поля",
      marginValue: "{mm} мм",
      addImages: "Додати JPEG",
      clearAll: "Очистити список",
      downloadPdf: "Створити PDF і завантажити",
      building: "Створення PDF…",
      moveUpAria: "Вгору",
      moveDownAria: "Вниз",
      removeFileAria: "Прибрати зі списку",
      minOneJpeg: "Додайте принаймні один файл JPEG.",
      invalidJpeg: "Цей файл не є дійсним JPEG (JPG).",
      buildFailed:
        "Не вдалося створити PDF. Приберіть непідтримувані файли й спробуйте знову.",
    },
  },
  el: {
    nav: "JPG σε PDF",
    dashTitle: "JPG σε PDF",
    dashDesc:
      "Μετατρέψτε εικόνες JPG σε PDF σε δευτερόλεπτα. Προσαρμόστε εύκολα προσανατολισμό και περιθώρια.",
    panel: {
      intro:
        "Μετατρέψτε εικόνες JPG σε PDF σε δευτερόλεπτα. Προσαρμόστε εύκολα προσανατολισμό και περιθώρια.",
      privacyNote: "Τα αρχεία σας δεν φεύγουν ποτέ από αυτόν τον περιηγητή.",
      orderHint:
        "Τα αρχεία στην κορυφή γίνονται οι πρώτες σελίδες του PDF. Χρησιμοποιήστε τα βέλη για αναδιάταξη.",
      rotationLabel: "Περιστροφή (όλες οι σελίδες)",
      rotation0: "0°",
      rotation90: "90°",
      rotation180: "180°",
      rotation270: "270°",
      marginLabel: "Ομοιόμορφα περιθώρια",
      marginValue: "{mm} mm",
      addImages: "Προσθήκη JPEG",
      clearAll: "Εκκαθάριση λίστας",
      downloadPdf: "Δημιουργία PDF και λήψη",
      building: "Δημιουργία PDF…",
      moveUpAria: "Μετακίνηση πάνω",
      moveDownAria: "Μετακίνηση κάτω",
      removeFileAria: "Αφαίρεση από τη λίστα",
      minOneJpeg: "Προσθέστε τουλάχιστον ένα αρχείο JPEG.",
      invalidJpeg: "Αυτό το αρχείο δεν είναι έγκυρο JPEG (JPG).",
      buildFailed:
        "Δεν ήταν δυνατή η δημιουργία PDF. Αφαιρέστε μη υποστηριζόμενα αρχεία και δοκιμάστε ξανά.",
    },
  },
  vi: {
    nav: "JPG sang PDF",
    dashTitle: "JPG sang PDF",
    dashDesc:
      "Chuyển ảnh JPG sang PDF trong vài giây. Điều chỉnh hướng và lề dễ dàng.",
    panel: {
      intro:
        "Chuyển ảnh JPG sang PDF trong vài giây. Điều chỉnh hướng và lề dễ dàng.",
      privacyNote: "Tệp của bạn không bao giờ rời khỏi trình duyệt này.",
      orderHint:
        "Tệp ở trên cùng sẽ thành các trang đầu của PDF. Dùng mũi tên để sắp xếp lại.",
      rotationLabel: "Xoay (mọi trang)",
      rotation0: "0°",
      rotation90: "90°",
      rotation180: "180°",
      rotation270: "270°",
      marginLabel: "Lề đều",
      marginValue: "{mm} mm",
      addImages: "Thêm JPEG",
      clearAll: "Xóa danh sách",
      downloadPdf: "Tạo PDF và tải xuống",
      building: "Đang tạo PDF…",
      moveUpAria: "Lên trên",
      moveDownAria: "Xuống dưới",
      removeFileAria: "Xóa khỏi danh sách",
      minOneJpeg: "Thêm ít nhất một tệp JPEG.",
      invalidJpeg: "Tệp này không phải JPEG (JPG) hợp lệ.",
      buildFailed:
        "Không thể tạo PDF. Hãy bỏ các tệp không được hỗ trợ và thử lại.",
    },
  },
  id: {
    nav: "JPG ke PDF",
    dashTitle: "JPG ke PDF",
    dashDesc:
      "Ubah gambar JPG menjadi PDF dalam hitungan detik. Atur orientasi dan margin dengan mudah.",
    panel: {
      intro:
        "Ubah gambar JPG menjadi PDF dalam hitungan detik. Atur orientasi dan margin dengan mudah.",
      privacyNote: "Berkas Anda tidak pernah meninggalkan browser ini.",
      orderHint:
        "Berkas di atas menjadi halaman pertama PDF. Gunakan panah untuk mengurutkan ulang.",
      rotationLabel: "Rotasi (semua halaman)",
      rotation0: "0°",
      rotation90: "90°",
      rotation180: "180°",
      rotation270: "270°",
      marginLabel: "Margin seragam",
      marginValue: "{mm} mm",
      addImages: "Tambah JPEG",
      clearAll: "Kosongkan daftar",
      downloadPdf: "Buat PDF & unduh",
      building: "Membuat PDF…",
      moveUpAria: "Pindah ke atas",
      moveDownAria: "Pindah ke bawah",
      removeFileAria: "Hapus dari daftar",
      minOneJpeg: "Tambahkan setidaknya satu berkas JPEG.",
      invalidJpeg: "Berkas ini bukan JPEG (JPG) yang valid.",
      buildFailed:
        "Tidak dapat membuat PDF. Hapus berkas yang tidak didukung dan coba lagi.",
    },
  },
  ms: {
    nav: "JPG ke PDF",
    dashTitle: "JPG ke PDF",
    dashDesc:
      "Tukar imej JPG kepada PDF dalam beberapa saat. Laraskan orientasi dan margin dengan mudah.",
    panel: {
      intro:
        "Tukar imej JPG kepada PDF dalam beberapa saat. Laraskan orientasi dan margin dengan mudah.",
      privacyNote: "Fail anda tidak pernah meninggalkan pelayar ini.",
      orderHint:
        "Fail di atas menjadi halaman pertama PDF. Gunakan anak panah untuk menyusun semula.",
      rotationLabel: "Putaran (semua halaman)",
      rotation0: "0°",
      rotation90: "90°",
      rotation180: "180°",
      rotation270: "270°",
      marginLabel: "Margin sekata",
      marginValue: "{mm} mm",
      addImages: "Tambah JPEG",
      clearAll: "Kosongkan senarai",
      downloadPdf: "Cipta PDF & muat turun",
      building: "Mencipta PDF…",
      moveUpAria: "Alih ke atas",
      moveDownAria: "Alih ke bawah",
      removeFileAria: "Buang daripada senarai",
      minOneJpeg: "Tambah sekurang-kurangnya satu fail JPEG.",
      invalidJpeg: "Fail ini bukan JPEG (JPG) yang sah.",
      buildFailed:
        "Tidak dapat mencipta PDF. Buang fail yang tidak disokong dan cuba lagi.",
    },
  },
  ja: {
    nav: "JPGをPDFへ",
    dashTitle: "JPGをPDFへ",
    dashDesc:
      "JPG画像を数秒でPDFに変換。向きと余白を簡単に調整できます。",
    panel: {
      intro:
        "JPG画像を数秒でPDFに変換。向きと余白を簡単に調整できます。",
      privacyNote: "ファイルがこのブラウザの外に出ることはありません。",
      orderHint:
        "上にあるファイルがPDFの先頭ページになります。矢印で並べ替えられます。",
      rotationLabel: "回転（すべてのページ）",
      rotation0: "0°",
      rotation90: "90°",
      rotation180: "180°",
      rotation270: "270°",
      marginLabel: "四辺の余白（同一）",
      marginValue: "{mm} mm",
      addImages: "JPEGを追加",
      clearAll: "一覧をクリア",
      downloadPdf: "PDFを作成してダウンロード",
      building: "PDFを作成中…",
      moveUpAria: "上へ",
      moveDownAria: "下へ",
      removeFileAria: "一覧から削除",
      minOneJpeg: "JPEGファイルを1つ以上追加してください。",
      invalidJpeg: "有効なJPEG（JPG）ではありません。",
      buildFailed:
        "PDFを作成できませんでした。対応していないファイルを外して再度お試しください。",
    },
  },
  ko: {
    nav: "JPG를 PDF로",
    dashTitle: "JPG를 PDF로",
    dashDesc:
      "JPG 이미지를 몇 초 만에 PDF로 변환합니다. 방향과 여백을 쉽게 조정하세요.",
    panel: {
      intro:
        "JPG 이미지를 몇 초 만에 PDF로 변환합니다. 방향과 여백을 쉽게 조정하세요.",
      privacyNote: "파일은 이 브라우저를 벗어나지 않습니다.",
      orderHint:
        "맨 위 파일이 PDF의 앞쪽 페이지가 됩니다. 화살표로 순서를 바꿀 수 있습니다.",
      rotationLabel: "회전(모든 페이지)",
      rotation0: "0°",
      rotation90: "90°",
      rotation180: "180°",
      rotation270: "270°",
      marginLabel: "동일 여백",
      marginValue: "{mm} mm",
      addImages: "JPEG 추가",
      clearAll: "목록 지우기",
      downloadPdf: "PDF 만들기 및 다운로드",
      building: "PDF 만드는 중…",
      moveUpAria: "위로 이동",
      moveDownAria: "아래로 이동",
      removeFileAria: "목록에서 제거",
      minOneJpeg: "JPEG 파일을 하나 이상 추가하세요.",
      invalidJpeg: "올바른 JPEG(JPG) 파일이 아닙니다.",
      buildFailed:
        "PDF를 만들 수 없습니다. 지원되지 않는 파일을 제거한 뒤 다시 시도하세요.",
    },
  },
  zh: {
    nav: "JPG 转 PDF",
    dashTitle: "JPG 转 PDF",
    dashDesc: "几秒内将 JPG 图片转为 PDF。轻松调整方向和页边距。",
    panel: {
      intro: "几秒内将 JPG 图片转为 PDF。轻松调整方向和页边距。",
      privacyNote: "您的文件不会离开本浏览器。",
      orderHint: "列表顶部的文件将成为 PDF 的前几页。使用箭头可调整顺序。",
      rotationLabel: "旋转（应用于所有页面）",
      rotation0: "0°",
      rotation90: "90°",
      rotation180: "180°",
      rotation270: "270°",
      marginLabel: "统一页边距",
      marginValue: "{mm} mm",
      addImages: "添加 JPEG",
      clearAll: "清空列表",
      downloadPdf: "生成 PDF 并下载",
      building: "正在生成 PDF…",
      moveUpAria: "上移",
      moveDownAria: "下移",
      removeFileAria: "从列表移除",
      minOneJpeg: "请至少添加一个 JPEG 文件。",
      invalidJpeg: "该文件不是有效的 JPEG（JPG）。",
      buildFailed: "无法生成 PDF。请移除不支持的文件后重试。",
    },
  },
  ar: {
    nav: "من JPG إلى PDF",
    dashTitle: "من JPG إلى PDF",
    dashDesc:
      "حوّل صور JPG إلى PDF في ثوانٍ. اضبط الاتجاه والهوامش بسهولة.",
    panel: {
      intro:
        "حوّل صور JPG إلى PDF في ثوانٍ. اضبط الاتجاه والهوامش بسهولة.",
      privacyNote: "ملفاتك لا تغادر هذا المتصفح أبدًا.",
      orderHint:
        "الملفات في الأعلى تصبح الصفحات الأولى في ملف PDF. استخدم الأسهم لإعادة الترتيب.",
      rotationLabel: "الاستدارة (كل الصفحات)",
      rotation0: "0°",
      rotation90: "90°",
      rotation180: "180°",
      rotation270: "270°",
      marginLabel: "هامش موحّد",
      marginValue: "{mm} مم",
      addImages: "إضافة ملفات JPEG",
      clearAll: "مسح القائمة",
      downloadPdf: "إنشاء PDF وتنزيله",
      building: "جارٍ إنشاء PDF…",
      moveUpAria: "تحريك لأعلى",
      moveDownAria: "تحريك لأسفل",
      removeFileAria: "إزالة من القائمة",
      minOneJpeg: "أضف ملف JPEG واحدًا على الأقل.",
      invalidJpeg: "هذا الملف ليس JPEG (JPG) صالحًا.",
      buildFailed:
        "تعذّر إنشاء ملف PDF. أزل الملفات غير المدعومة وحاول مرة أخرى.",
    },
  },
  fa: {
    nav: "JPG به PDF",
    dashTitle: "JPG به PDF",
    dashDesc:
      "تصاویر JPG را در چند ثانیه به PDF تبدیل کنید. جهت‌گیری و حاشیه را به‌راحتی تنظیم کنید.",
    panel: {
      intro:
        "تصاویر JPG را در چند ثانیه به PDF تبدیل کنید. جهت‌گیری و حاشیه را به‌راحتی تنظیم کنید.",
      privacyNote: "فایل‌های شما هرگز این مرورگر را ترک نمی‌کنند.",
      orderHint:
        "فایل‌های بالای فهرست، صفحات اول PDF می‌شوند. با فلش‌ها ترتیب را عوض کنید.",
      rotationLabel: "چرخش (همهٔ صفحات)",
      rotation0: "0°",
      rotation90: "90°",
      rotation180: "180°",
      rotation270: "270°",
      marginLabel: "حاشیه یکنواخت",
      marginValue: "{mm} mm",
      addImages: "افزودن JPEG",
      clearAll: "پاک‌کردن فهرست",
      downloadPdf: "ایجاد PDF و بارگیری",
      building: "در حال ساخت PDF…",
      moveUpAria: "بالا بردن",
      moveDownAria: "پایین بردن",
      removeFileAria: "حذف از فهرست",
      minOneJpeg: "حداقل یک فایل JPEG اضافه کنید.",
      invalidJpeg: "این فایل JPEG (JPG) معتبری نیست.",
      buildFailed:
        "ساخت PDF ممکن نشد. فایل‌های پشتیبانی‌نشده را بردارید و دوباره امتحان کنید.",
    },
  },
  ca: {
    nav: "JPG a PDF",
    dashTitle: "JPG a PDF",
    dashDesc:
      "Converteix imatges JPG a PDF en segons. Ajusta fàcilment l'orientació i els marges.",
    panel: {
      intro:
        "Converteix imatges JPG a PDF en segons. Ajusta fàcilment l'orientació i els marges.",
      privacyNote: "Els teus fitxers no surten mai d'aquest navegador.",
      orderHint:
        "Els fitxers de dalt es converteixen en les primeres pàgines del PDF. Fletxes per reordenar.",
      rotationLabel: "Rotació (totes les pàgines)",
      rotation0: "0°",
      rotation90: "90°",
      rotation180: "180°",
      rotation270: "270°",
      marginLabel: "Marge uniforme",
      marginValue: "{mm} mm",
      addImages: "Afegeix JPEG",
      clearAll: "Buida la llista",
      downloadPdf: "Crea el PDF i descarrega",
      building: "S'està creant el PDF…",
      moveUpAria: "Puja",
      moveDownAria: "Baixa",
      removeFileAria: "Treu de la llista",
      minOneJpeg: "Afegeix com a mínim un fitxer JPEG.",
      invalidJpeg: "Aquest fitxer no és un JPEG (JPG) vàlid.",
      buildFailed:
        "No s'ha pogut crear el PDF. Elimina fitxers no compatibles i torna-ho a provar.",
    },
  },
  af: {
    nav: "JPG na PDF",
    dashTitle: "JPG na PDF",
    dashDesc:
      "Skakel JPG-beelde na PDF in sekondes. Pas oriëntasie en kante maklik aan.",
    panel: {
      intro:
        "Skakel JPG-beelde na PDF in sekondes. Pas oriëntasie en kante maklik aan.",
      privacyNote: "Jou lêers verlaat nooit hierdie blaaier nie.",
      orderHint:
        "Lêers bo word die eerste bladsye in die PDF. Gebruik pyle om te herskik.",
      rotationLabel: "Rotasie (alle bladsye)",
      rotation0: "0°",
      rotation90: "90°",
      rotation180: "180°",
      rotation270: "270°",
      marginLabel: "Eenvormige kant",
      marginValue: "{mm} mm",
      addImages: "Voeg JPEG's by",
      clearAll: "Maak lys skoon",
      downloadPdf: "Skep PDF en laai af",
      building: "Skep PDF…",
      moveUpAria: "Skuif op",
      moveDownAria: "Skuif af",
      removeFileAria: "Verwyder uit lys",
      minOneJpeg: "Voeg minstens een JPEG-lêer by.",
      invalidJpeg: "Hierdie lêer is nie 'n geldige JPEG (JPG) nie.",
      buildFailed:
        "Kon nie die PDF skep nie. Verwyder nie-ondersteunde lêers en probeer weer.",
    },
  },
};

for (const [locale, bundle] of Object.entries(BUNDLES)) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  if (!fs.existsSync(filePath)) {
    console.warn("skip missing", locale);
    continue;
  }
  const raw = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(raw);
  if (!data.Navigation) data.Navigation = {};
  if (!data.Dashboard?.tools) {
    console.warn("skip bad shape", locale);
    continue;
  }
  data.Navigation.jpgToPdf = bundle.nav;
  data.Dashboard.tools.jpgToPdf = {
    title: bundle.dashTitle,
    description: bundle.dashDesc,
  };
  data.JpgToPdf = { ...bundle.panel };
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
  console.log("updated", locale);
}

console.log("Done. en.json unchanged.");
