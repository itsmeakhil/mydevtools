/**
 * One-off: add SettingsPage.dangerZone (factory data reset) to all 27 locales.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const messagesDir = path.join(__dirname, "..", "messages");

const T = {
  en: {
    title: "Danger zone",
    description: "Irreversible actions that erase this app's data.",
    resetButton: "Factory data reset",
    dialogTitle: "Factory data reset",
    dialogWarning:
      "This permanently deletes everything stored in the app — vault entries, notes, tasks, bookmarks, and preferences, along with the encryption key. This cannot be undone. The app will restart and take you through onboarding again.",
    exportHint:
      "Optional: download an encrypted backup first. Choose a backup passphrase of at least 8 characters — you will need it to restore.",
    passphrasePlaceholder: "Backup passphrase",
    passphraseTooShort: "Backup passphrase must be at least 8 characters",
    exportButton: "Export backup",
    exportSuccess: "Backup downloaded",
    exportError: "Backup export failed",
    confirmCheckbox: "I understand all my data will be permanently deleted",
    confirmButton: "Erase everything and restart",
    resetting: "Erasing…",
    cancel: "Cancel",
    resetError: "Factory reset failed — please try again",
  },
  af: {
    title: "Gevaarsone",
    description: "Onomkeerbare aksies wat hierdie app se data uitvee.",
    resetButton: "Fabriekterugstelling",
    dialogTitle: "Fabriekterugstelling",
    dialogWarning:
      "Dit vee alles wat in die app gestoor is permanent uit — kluisinskrywings, notas, take, boekmerke en voorkeure, saam met die enkripsiesleutel. Dit kan nie ongedaan gemaak word nie. Die app sal herbegin en jou weer deur die aanboording neem.",
    exportHint:
      "Opsioneel: laai eers 'n geënkripteerde rugsteun af. Kies 'n rugsteunwagfrase van minstens 8 karakters — jy sal dit nodig hê om te herstel.",
    passphrasePlaceholder: "Rugsteunwagfrase",
    passphraseTooShort: "Rugsteunwagfrase moet minstens 8 karakters wees",
    exportButton: "Voer rugsteun uit",
    exportSuccess: "Rugsteun afgelaai",
    exportError: "Rugsteunuitvoer het misluk",
    confirmCheckbox: "Ek verstaan dat al my data permanent uitgevee sal word",
    confirmButton: "Vee alles uit en herbegin",
    resetting: "Vee tans uit…",
    cancel: "Kanselleer",
    resetError: "Fabriekterugstelling het misluk — probeer asseblief weer",
  },
  ar: {
    title: "منطقة الخطر",
    description: "إجراءات لا رجعة فيها تمحو بيانات هذا التطبيق.",
    resetButton: "إعادة ضبط المصنع",
    dialogTitle: "إعادة ضبط المصنع",
    dialogWarning:
      "سيؤدي هذا إلى حذف كل ما هو مخزَّن في التطبيق نهائيًا — عناصر الخزنة والملاحظات والمهام والإشارات المرجعية والتفضيلات، إضافة إلى مفتاح التشفير. لا يمكن التراجع عن هذا الإجراء. سيُعاد تشغيل التطبيق وستمر بخطوات الإعداد من جديد.",
    exportHint:
      "اختياري: نزِّل نسخة احتياطية مشفّرة أولًا. اختر عبارة مرور للنسخة الاحتياطية من 8 أحرف على الأقل — ستحتاجها للاستعادة.",
    passphrasePlaceholder: "عبارة مرور النسخة الاحتياطية",
    passphraseTooShort: "يجب أن تتكوّن عبارة مرور النسخة الاحتياطية من 8 أحرف على الأقل",
    exportButton: "تصدير نسخة احتياطية",
    exportSuccess: "تم تنزيل النسخة الاحتياطية",
    exportError: "فشل تصدير النسخة الاحتياطية",
    confirmCheckbox: "أفهم أن جميع بياناتي ستُحذف نهائيًا",
    confirmButton: "امحُ كل شيء وأعد التشغيل",
    resetting: "جارٍ المحو…",
    cancel: "إلغاء",
    resetError: "فشلت إعادة ضبط المصنع — يرجى المحاولة مرة أخرى",
  },
  ca: {
    title: "Zona de perill",
    description: "Accions irreversibles que esborren les dades d'aquesta aplicació.",
    resetButton: "Restabliment de fàbrica",
    dialogTitle: "Restabliment de fàbrica",
    dialogWarning:
      "Això suprimeix permanentment tot el que hi ha desat a l'aplicació — entrades de la caixa forta, notes, tasques, adreces d'interès i preferències, juntament amb la clau de xifratge. No es pot desfer. L'aplicació es reiniciarà i tornaràs a passar per la configuració inicial.",
    exportHint:
      "Opcional: baixa primer una còpia de seguretat xifrada. Tria una contrasenya de còpia de seguretat d'almenys 8 caràcters — la necessitaràs per restaurar.",
    passphrasePlaceholder: "Contrasenya de la còpia de seguretat",
    passphraseTooShort: "La contrasenya de la còpia de seguretat ha de tenir almenys 8 caràcters",
    exportButton: "Exporta la còpia de seguretat",
    exportSuccess: "Còpia de seguretat baixada",
    exportError: "L'exportació de la còpia de seguretat ha fallat",
    confirmCheckbox: "Entenc que totes les meves dades se suprimiran permanentment",
    confirmButton: "Esborra-ho tot i reinicia",
    resetting: "S'està esborrant…",
    cancel: "Cancel·la",
    resetError: "El restabliment de fàbrica ha fallat — torna-ho a provar",
  },
  cs: {
    title: "Nebezpečná zóna",
    description: "Nevratné akce, které vymažou data této aplikace.",
    resetButton: "Obnovení továrního nastavení",
    dialogTitle: "Obnovení továrního nastavení",
    dialogWarning:
      "Tímto trvale smažete vše, co je v aplikaci uloženo — položky trezoru, poznámky, úkoly, záložky a předvolby, včetně šifrovacího klíče. Tuto akci nelze vrátit zpět. Aplikace se restartuje a znovu vás provede úvodním nastavením.",
    exportHint:
      "Volitelné: nejprve si stáhněte šifrovanou zálohu. Zvolte heslo zálohy o délce alespoň 8 znaků — budete ho potřebovat k obnovení.",
    passphrasePlaceholder: "Heslo zálohy",
    passphraseTooShort: "Heslo zálohy musí mít alespoň 8 znaků",
    exportButton: "Exportovat zálohu",
    exportSuccess: "Záloha stažena",
    exportError: "Export zálohy se nezdařil",
    confirmCheckbox: "Rozumím, že všechna má data budou trvale smazána",
    confirmButton: "Vymazat vše a restartovat",
    resetting: "Mazání…",
    cancel: "Zrušit",
    resetError: "Obnovení továrního nastavení se nezdařilo — zkuste to prosím znovu",
  },
  da: {
    title: "Farezone",
    description: "Uigenkaldelige handlinger, der sletter denne apps data.",
    resetButton: "Fabriksnulstilling",
    dialogTitle: "Fabriksnulstilling",
    dialogWarning:
      "Dette sletter permanent alt, der er gemt i appen — boksposter, noter, opgaver, bogmærker og præferencer samt krypteringsnøglen. Det kan ikke fortrydes. Appen genstarter og fører dig gennem opsætningen igen.",
    exportHint:
      "Valgfrit: download først en krypteret sikkerhedskopi. Vælg en adgangssætning på mindst 8 tegn — du skal bruge den til at gendanne.",
    passphrasePlaceholder: "Adgangssætning til sikkerhedskopi",
    passphraseTooShort: "Adgangssætningen til sikkerhedskopien skal være på mindst 8 tegn",
    exportButton: "Eksportér sikkerhedskopi",
    exportSuccess: "Sikkerhedskopi downloadet",
    exportError: "Eksport af sikkerhedskopi mislykkedes",
    confirmCheckbox: "Jeg forstår, at alle mine data slettes permanent",
    confirmButton: "Slet alt og genstart",
    resetting: "Sletter…",
    cancel: "Annuller",
    resetError: "Fabriksnulstilling mislykkedes — prøv igen",
  },
  de: {
    title: "Gefahrenzone",
    description: "Unumkehrbare Aktionen, die die Daten dieser App löschen.",
    resetButton: "Auf Werkseinstellungen zurücksetzen",
    dialogTitle: "Auf Werkseinstellungen zurücksetzen",
    dialogWarning:
      "Dadurch wird alles in der App Gespeicherte dauerhaft gelöscht — Tresoreinträge, Notizen, Aufgaben, Lesezeichen und Einstellungen sowie der Verschlüsselungsschlüssel. Dies kann nicht rückgängig gemacht werden. Die App startet neu und führt dich erneut durch die Einrichtung.",
    exportHint:
      "Optional: Lade zuerst ein verschlüsseltes Backup herunter. Wähle eine Backup-Passphrase mit mindestens 8 Zeichen — du brauchst sie zur Wiederherstellung.",
    passphrasePlaceholder: "Backup-Passphrase",
    passphraseTooShort: "Die Backup-Passphrase muss mindestens 8 Zeichen lang sein",
    exportButton: "Backup exportieren",
    exportSuccess: "Backup heruntergeladen",
    exportError: "Backup-Export fehlgeschlagen",
    confirmCheckbox: "Ich verstehe, dass alle meine Daten dauerhaft gelöscht werden",
    confirmButton: "Alles löschen und neu starten",
    resetting: "Wird gelöscht…",
    cancel: "Abbrechen",
    resetError: "Zurücksetzen fehlgeschlagen — bitte erneut versuchen",
  },
  el: {
    title: "Επικίνδυνη ζώνη",
    description: "Μη αναστρέψιμες ενέργειες που διαγράφουν τα δεδομένα της εφαρμογής.",
    resetButton: "Επαναφορά εργοστασιακών ρυθμίσεων",
    dialogTitle: "Επαναφορά εργοστασιακών ρυθμίσεων",
    dialogWarning:
      "Αυτό διαγράφει οριστικά ό,τι είναι αποθηκευμένο στην εφαρμογή — καταχωρίσεις θησαυροφυλακίου, σημειώσεις, εργασίες, σελιδοδείκτες και προτιμήσεις, μαζί με το κλειδί κρυπτογράφησης. Δεν μπορεί να αναιρεθεί. Η εφαρμογή θα επανεκκινήσει και θα περάσετε ξανά από την αρχική ρύθμιση.",
    exportHint:
      "Προαιρετικό: κατεβάστε πρώτα ένα κρυπτογραφημένο αντίγραφο ασφαλείας. Επιλέξτε μια φράση πρόσβασης τουλάχιστον 8 χαρακτήρων — θα τη χρειαστείτε για την επαναφορά.",
    passphrasePlaceholder: "Φράση πρόσβασης αντιγράφου ασφαλείας",
    passphraseTooShort: "Η φράση πρόσβασης πρέπει να έχει τουλάχιστον 8 χαρακτήρες",
    exportButton: "Εξαγωγή αντιγράφου ασφαλείας",
    exportSuccess: "Το αντίγραφο ασφαλείας λήφθηκε",
    exportError: "Η εξαγωγή του αντιγράφου ασφαλείας απέτυχε",
    confirmCheckbox: "Κατανοώ ότι όλα τα δεδομένα μου θα διαγραφούν οριστικά",
    confirmButton: "Διαγραφή όλων και επανεκκίνηση",
    resetting: "Γίνεται διαγραφή…",
    cancel: "Ακύρωση",
    resetError: "Η επαναφορά εργοστασιακών ρυθμίσεων απέτυχε — δοκιμάστε ξανά",
  },
  es: {
    title: "Zona de peligro",
    description: "Acciones irreversibles que borran los datos de esta aplicación.",
    resetButton: "Restablecimiento de fábrica",
    dialogTitle: "Restablecimiento de fábrica",
    dialogWarning:
      "Esto elimina permanentemente todo lo almacenado en la aplicación — entradas de la bóveda, notas, tareas, marcadores y preferencias, junto con la clave de cifrado. No se puede deshacer. La aplicación se reiniciará y volverás a pasar por la configuración inicial.",
    exportHint:
      "Opcional: descarga primero una copia de seguridad cifrada. Elige una frase de contraseña de al menos 8 caracteres — la necesitarás para restaurar.",
    passphrasePlaceholder: "Frase de contraseña de la copia",
    passphraseTooShort: "La frase de contraseña debe tener al menos 8 caracteres",
    exportButton: "Exportar copia de seguridad",
    exportSuccess: "Copia de seguridad descargada",
    exportError: "Error al exportar la copia de seguridad",
    confirmCheckbox: "Entiendo que todos mis datos se eliminarán permanentemente",
    confirmButton: "Borrar todo y reiniciar",
    resetting: "Borrando…",
    cancel: "Cancelar",
    resetError: "El restablecimiento de fábrica falló — inténtalo de nuevo",
  },
  fa: {
    title: "منطقه خطر",
    description: "اقدامات برگشت‌ناپذیری که داده‌های این برنامه را پاک می‌کنند.",
    resetButton: "بازنشانی کارخانه‌ای",
    dialogTitle: "بازنشانی کارخانه‌ای",
    dialogWarning:
      "این کار همه چیزهایی را که در برنامه ذخیره شده برای همیشه حذف می‌کند — موارد گاوصندوق، یادداشت‌ها، وظایف، نشانک‌ها و تنظیمات برگزیده، همراه با کلید رمزنگاری. این کار قابل بازگشت نیست. برنامه دوباره راه‌اندازی می‌شود و شما را دوباره از مراحل راه‌اندازی اولیه عبور می‌دهد.",
    exportHint:
      "اختیاری: ابتدا یک نسخه پشتیبان رمزنگاری‌شده دانلود کنید. یک عبارت عبور پشتیبان با حداقل ۸ نویسه انتخاب کنید — برای بازیابی به آن نیاز خواهید داشت.",
    passphrasePlaceholder: "عبارت عبور نسخه پشتیبان",
    passphraseTooShort: "عبارت عبور نسخه پشتیبان باید حداقل ۸ نویسه باشد",
    exportButton: "برون‌بری نسخه پشتیبان",
    exportSuccess: "نسخه پشتیبان دانلود شد",
    exportError: "برون‌بری نسخه پشتیبان ناموفق بود",
    confirmCheckbox: "می‌دانم که همه داده‌های من برای همیشه حذف خواهند شد",
    confirmButton: "پاک کردن همه چیز و راه‌اندازی مجدد",
    resetting: "در حال پاک کردن…",
    cancel: "لغو",
    resetError: "بازنشانی کارخانه‌ای ناموفق بود — لطفاً دوباره تلاش کنید",
  },
  fr: {
    title: "Zone de danger",
    description: "Actions irréversibles qui effacent les données de cette application.",
    resetButton: "Réinitialisation d'usine",
    dialogTitle: "Réinitialisation d'usine",
    dialogWarning:
      "Cette action supprime définitivement tout ce qui est stocké dans l'application — entrées du coffre-fort, notes, tâches, favoris et préférences, ainsi que la clé de chiffrement. Elle est irréversible. L'application redémarrera et vous repasserez par la configuration initiale.",
    exportHint:
      "Facultatif : téléchargez d'abord une sauvegarde chiffrée. Choisissez une phrase secrète d'au moins 8 caractères — elle sera nécessaire pour la restauration.",
    passphrasePlaceholder: "Phrase secrète de sauvegarde",
    passphraseTooShort: "La phrase secrète doit comporter au moins 8 caractères",
    exportButton: "Exporter la sauvegarde",
    exportSuccess: "Sauvegarde téléchargée",
    exportError: "Échec de l'export de la sauvegarde",
    confirmCheckbox: "Je comprends que toutes mes données seront définitivement supprimées",
    confirmButton: "Tout effacer et redémarrer",
    resetting: "Effacement…",
    cancel: "Annuler",
    resetError: "La réinitialisation d'usine a échoué — veuillez réessayer",
  },
  id: {
    title: "Zona berbahaya",
    description: "Tindakan permanen yang menghapus data aplikasi ini.",
    resetButton: "Reset data pabrik",
    dialogTitle: "Reset data pabrik",
    dialogWarning:
      "Tindakan ini menghapus secara permanen semua yang tersimpan di aplikasi — entri brankas, catatan, tugas, markah, dan preferensi, beserta kunci enkripsi. Tidak dapat dibatalkan. Aplikasi akan dimulai ulang dan membawa Anda melalui proses orientasi lagi.",
    exportHint:
      "Opsional: unduh cadangan terenkripsi terlebih dahulu. Pilih frasa sandi cadangan minimal 8 karakter — Anda akan membutuhkannya untuk memulihkan.",
    passphrasePlaceholder: "Frasa sandi cadangan",
    passphraseTooShort: "Frasa sandi cadangan minimal 8 karakter",
    exportButton: "Ekspor cadangan",
    exportSuccess: "Cadangan diunduh",
    exportError: "Ekspor cadangan gagal",
    confirmCheckbox: "Saya mengerti semua data saya akan dihapus secara permanen",
    confirmButton: "Hapus semua dan mulai ulang",
    resetting: "Menghapus…",
    cancel: "Batal",
    resetError: "Reset data pabrik gagal — silakan coba lagi",
  },
  it: {
    title: "Zona di pericolo",
    description: "Azioni irreversibili che cancellano i dati di questa app.",
    resetButton: "Ripristino dati di fabbrica",
    dialogTitle: "Ripristino dati di fabbrica",
    dialogWarning:
      "Questa operazione elimina definitivamente tutto ciò che è memorizzato nell'app — voci della cassaforte, note, attività, segnalibri e preferenze, insieme alla chiave di crittografia. Non può essere annullata. L'app si riavvierà e ripeterai la configurazione iniziale.",
    exportHint:
      "Facoltativo: scarica prima un backup crittografato. Scegli una passphrase di backup di almeno 8 caratteri — ti servirà per il ripristino.",
    passphrasePlaceholder: "Passphrase del backup",
    passphraseTooShort: "La passphrase del backup deve avere almeno 8 caratteri",
    exportButton: "Esporta backup",
    exportSuccess: "Backup scaricato",
    exportError: "Esportazione del backup non riuscita",
    confirmCheckbox: "Capisco che tutti i miei dati verranno eliminati definitivamente",
    confirmButton: "Cancella tutto e riavvia",
    resetting: "Cancellazione…",
    cancel: "Annulla",
    resetError: "Ripristino di fabbrica non riuscito — riprova",
  },
  ja: {
    title: "危険ゾーン",
    description: "このアプリのデータを消去する、取り消せない操作です。",
    resetButton: "工場出荷時リセット",
    dialogTitle: "工場出荷時リセット",
    dialogWarning:
      "アプリに保存されているすべてのデータ — 保管庫の項目、メモ、タスク、ブックマーク、設定、そして暗号化キー — が完全に削除されます。この操作は取り消せません。アプリが再起動し、初期セットアップを最初からやり直します。",
    exportHint:
      "任意: 先に暗号化バックアップをダウンロードしてください。8文字以上のバックアップ用パスフレーズを設定します — 復元時に必要です。",
    passphrasePlaceholder: "バックアップ用パスフレーズ",
    passphraseTooShort: "バックアップ用パスフレーズは8文字以上にしてください",
    exportButton: "バックアップを書き出す",
    exportSuccess: "バックアップをダウンロードしました",
    exportError: "バックアップの書き出しに失敗しました",
    confirmCheckbox: "すべてのデータが完全に削除されることを理解しました",
    confirmButton: "すべて消去して再起動",
    resetting: "消去中…",
    cancel: "キャンセル",
    resetError: "工場出荷時リセットに失敗しました — もう一度お試しください",
  },
  ko: {
    title: "위험 구역",
    description: "이 앱의 데이터를 지우는 되돌릴 수 없는 작업입니다.",
    resetButton: "공장 초기화",
    dialogTitle: "공장 초기화",
    dialogWarning:
      "앱에 저장된 모든 것 — 금고 항목, 메모, 작업, 북마크, 환경설정과 암호화 키 — 이 영구적으로 삭제됩니다. 되돌릴 수 없습니다. 앱이 다시 시작되며 온보딩 과정을 처음부터 다시 진행하게 됩니다.",
    exportHint:
      "선택 사항: 먼저 암호화된 백업을 다운로드하세요. 8자 이상의 백업 암호 문구를 정하세요 — 복원할 때 필요합니다.",
    passphrasePlaceholder: "백업 암호 문구",
    passphraseTooShort: "백업 암호 문구는 8자 이상이어야 합니다",
    exportButton: "백업 내보내기",
    exportSuccess: "백업이 다운로드되었습니다",
    exportError: "백업 내보내기에 실패했습니다",
    confirmCheckbox: "모든 데이터가 영구적으로 삭제된다는 것을 이해합니다",
    confirmButton: "모두 지우고 다시 시작",
    resetting: "지우는 중…",
    cancel: "취소",
    resetError: "공장 초기화에 실패했습니다 — 다시 시도해 주세요",
  },
  ms: {
    title: "Zon bahaya",
    description: "Tindakan kekal yang memadamkan data aplikasi ini.",
    resetButton: "Tetapan semula kilang",
    dialogTitle: "Tetapan semula kilang",
    dialogWarning:
      "Tindakan ini memadamkan secara kekal semua yang disimpan dalam aplikasi — entri bilik kebal, nota, tugasan, penanda halaman dan keutamaan, bersama kunci penyulitan. Ia tidak boleh dibuat asal. Aplikasi akan dimulakan semula dan membawa anda melalui proses permulaan sekali lagi.",
    exportHint:
      "Pilihan: muat turun sandaran tersulit dahulu. Pilih frasa laluan sandaran sekurang-kurangnya 8 aksara — anda memerlukannya untuk memulihkan.",
    passphrasePlaceholder: "Frasa laluan sandaran",
    passphraseTooShort: "Frasa laluan sandaran mestilah sekurang-kurangnya 8 aksara",
    exportButton: "Eksport sandaran",
    exportSuccess: "Sandaran dimuat turun",
    exportError: "Eksport sandaran gagal",
    confirmCheckbox: "Saya faham semua data saya akan dipadamkan secara kekal",
    confirmButton: "Padam semuanya dan mulakan semula",
    resetting: "Memadam…",
    cancel: "Batal",
    resetError: "Tetapan semula kilang gagal — sila cuba lagi",
  },
  nb: {
    title: "Faresone",
    description: "Ugjenkallelige handlinger som sletter denne appens data.",
    resetButton: "Tilbakestilling til fabrikkinnstillinger",
    dialogTitle: "Tilbakestilling til fabrikkinnstillinger",
    dialogWarning:
      "Dette sletter permanent alt som er lagret i appen — hvelvoppføringer, notater, oppgaver, bokmerker og innstillinger, sammen med krypteringsnøkkelen. Det kan ikke angres. Appen starter på nytt og tar deg gjennom oppsettet igjen.",
    exportHint:
      "Valgfritt: last ned en kryptert sikkerhetskopi først. Velg en passfrase på minst 8 tegn — du trenger den for å gjenopprette.",
    passphrasePlaceholder: "Passfrase for sikkerhetskopi",
    passphraseTooShort: "Passfrasen for sikkerhetskopien må være på minst 8 tegn",
    exportButton: "Eksporter sikkerhetskopi",
    exportSuccess: "Sikkerhetskopi lastet ned",
    exportError: "Eksport av sikkerhetskopi mislyktes",
    confirmCheckbox: "Jeg forstår at alle dataene mine blir slettet permanent",
    confirmButton: "Slett alt og start på nytt",
    resetting: "Sletter…",
    cancel: "Avbryt",
    resetError: "Fabrikktilbakestilling mislyktes — prøv igjen",
  },
  nl: {
    title: "Gevarenzone",
    description: "Onomkeerbare acties die de gegevens van deze app wissen.",
    resetButton: "Fabrieksinstellingen herstellen",
    dialogTitle: "Fabrieksinstellingen herstellen",
    dialogWarning:
      "Hiermee wordt alles wat in de app is opgeslagen permanent verwijderd — kluisitems, notities, taken, bladwijzers en voorkeuren, samen met de versleutelingssleutel. Dit kan niet ongedaan worden gemaakt. De app start opnieuw op en doorloopt de eerste installatie opnieuw.",
    exportHint:
      "Optioneel: download eerst een versleutelde back-up. Kies een back-upwachtwoordzin van minimaal 8 tekens — je hebt deze nodig om te herstellen.",
    passphrasePlaceholder: "Back-upwachtwoordzin",
    passphraseTooShort: "De back-upwachtwoordzin moet minimaal 8 tekens bevatten",
    exportButton: "Back-up exporteren",
    exportSuccess: "Back-up gedownload",
    exportError: "Exporteren van back-up mislukt",
    confirmCheckbox: "Ik begrijp dat al mijn gegevens permanent worden verwijderd",
    confirmButton: "Alles wissen en opnieuw starten",
    resetting: "Wissen…",
    cancel: "Annuleren",
    resetError: "Fabrieksherstel mislukt — probeer het opnieuw",
  },
  pl: {
    title: "Strefa niebezpieczna",
    description: "Nieodwracalne działania, które usuwają dane tej aplikacji.",
    resetButton: "Przywracanie ustawień fabrycznych",
    dialogTitle: "Przywracanie ustawień fabrycznych",
    dialogWarning:
      "Ta operacja trwale usuwa wszystko, co jest zapisane w aplikacji — wpisy sejfu, notatki, zadania, zakładki i preferencje, wraz z kluczem szyfrowania. Nie można jej cofnąć. Aplikacja uruchomi się ponownie i przeprowadzi Cię przez konfigurację od nowa.",
    exportHint:
      "Opcjonalnie: najpierw pobierz zaszyfrowaną kopię zapasową. Wybierz hasło kopii zapasowej o długości co najmniej 8 znaków — będzie potrzebne do przywrócenia.",
    passphrasePlaceholder: "Hasło kopii zapasowej",
    passphraseTooShort: "Hasło kopii zapasowej musi mieć co najmniej 8 znaków",
    exportButton: "Eksportuj kopię zapasową",
    exportSuccess: "Kopia zapasowa pobrana",
    exportError: "Eksport kopii zapasowej nie powiódł się",
    confirmCheckbox: "Rozumiem, że wszystkie moje dane zostaną trwale usunięte",
    confirmButton: "Usuń wszystko i uruchom ponownie",
    resetting: "Usuwanie…",
    cancel: "Anuluj",
    resetError: "Przywracanie ustawień fabrycznych nie powiodło się — spróbuj ponownie",
  },
  pt: {
    title: "Zona de perigo",
    description: "Ações irreversíveis que apagam os dados desta aplicação.",
    resetButton: "Reposição de fábrica",
    dialogTitle: "Reposição de fábrica",
    dialogWarning:
      "Isto elimina permanentemente tudo o que está guardado na aplicação — entradas do cofre, notas, tarefas, marcadores e preferências, juntamente com a chave de encriptação. Não pode ser anulado. A aplicação será reiniciada e passará novamente pela configuração inicial.",
    exportHint:
      "Opcional: transfira primeiro uma cópia de segurança encriptada. Escolha uma frase de acesso com pelo menos 8 caracteres — vai precisar dela para restaurar.",
    passphrasePlaceholder: "Frase de acesso da cópia de segurança",
    passphraseTooShort: "A frase de acesso deve ter pelo menos 8 caracteres",
    exportButton: "Exportar cópia de segurança",
    exportSuccess: "Cópia de segurança transferida",
    exportError: "Falha ao exportar a cópia de segurança",
    confirmCheckbox: "Compreendo que todos os meus dados serão eliminados permanentemente",
    confirmButton: "Apagar tudo e reiniciar",
    resetting: "A apagar…",
    cancel: "Cancelar",
    resetError: "A reposição de fábrica falhou — tente novamente",
  },
  "pt-BR": {
    title: "Zona de perigo",
    description: "Ações irreversíveis que apagam os dados deste aplicativo.",
    resetButton: "Restauração de fábrica",
    dialogTitle: "Restauração de fábrica",
    dialogWarning:
      "Isso exclui permanentemente tudo o que está armazenado no aplicativo — itens do cofre, notas, tarefas, favoritos e preferências, junto com a chave de criptografia. Não é possível desfazer. O aplicativo será reiniciado e você passará pela configuração inicial novamente.",
    exportHint:
      "Opcional: baixe primeiro um backup criptografado. Escolha uma senha de backup com pelo menos 8 caracteres — você precisará dela para restaurar.",
    passphrasePlaceholder: "Senha do backup",
    passphraseTooShort: "A senha do backup deve ter pelo menos 8 caracteres",
    exportButton: "Exportar backup",
    exportSuccess: "Backup baixado",
    exportError: "Falha ao exportar o backup",
    confirmCheckbox: "Entendo que todos os meus dados serão excluídos permanentemente",
    confirmButton: "Apagar tudo e reiniciar",
    resetting: "Apagando…",
    cancel: "Cancelar",
    resetError: "A restauração de fábrica falhou — tente novamente",
  },
  ru: {
    title: "Опасная зона",
    description: "Необратимые действия, стирающие данные этого приложения.",
    resetButton: "Сброс к заводским настройкам",
    dialogTitle: "Сброс к заводским настройкам",
    dialogWarning:
      "Это навсегда удалит всё, что хранится в приложении — записи хранилища, заметки, задачи, закладки и настройки, а также ключ шифрования. Действие нельзя отменить. Приложение перезапустится, и вы снова пройдёте начальную настройку.",
    exportHint:
      "Необязательно: сначала скачайте зашифрованную резервную копию. Придумайте парольную фразу не короче 8 символов — она понадобится для восстановления.",
    passphrasePlaceholder: "Парольная фраза резервной копии",
    passphraseTooShort: "Парольная фраза должна содержать не менее 8 символов",
    exportButton: "Экспортировать резервную копию",
    exportSuccess: "Резервная копия скачана",
    exportError: "Не удалось экспортировать резервную копию",
    confirmCheckbox: "Я понимаю, что все мои данные будут удалены безвозвратно",
    confirmButton: "Стереть всё и перезапустить",
    resetting: "Удаление…",
    cancel: "Отмена",
    resetError: "Сброс к заводским настройкам не удался — попробуйте ещё раз",
  },
  sv: {
    title: "Riskzon",
    description: "Oåterkalleliga åtgärder som raderar appens data.",
    resetButton: "Fabriksåterställning",
    dialogTitle: "Fabriksåterställning",
    dialogWarning:
      "Detta raderar permanent allt som är lagrat i appen — valvposter, anteckningar, uppgifter, bokmärken och inställningar, tillsammans med krypteringsnyckeln. Det kan inte ångras. Appen startar om och tar dig genom introduktionen igen.",
    exportHint:
      "Valfritt: ladda först ner en krypterad säkerhetskopia. Välj en lösenfras på minst 8 tecken — du behöver den för att återställa.",
    passphrasePlaceholder: "Lösenfras för säkerhetskopia",
    passphraseTooShort: "Lösenfrasen måste vara minst 8 tecken",
    exportButton: "Exportera säkerhetskopia",
    exportSuccess: "Säkerhetskopia nedladdad",
    exportError: "Export av säkerhetskopia misslyckades",
    confirmCheckbox: "Jag förstår att alla mina data raderas permanent",
    confirmButton: "Radera allt och starta om",
    resetting: "Raderar…",
    cancel: "Avbryt",
    resetError: "Fabriksåterställningen misslyckades — försök igen",
  },
  tr: {
    title: "Tehlikeli bölge",
    description: "Bu uygulamanın verilerini silen geri alınamaz işlemler.",
    resetButton: "Fabrika verilerine sıfırlama",
    dialogTitle: "Fabrika verilerine sıfırlama",
    dialogWarning:
      "Bu işlem, uygulamada saklanan her şeyi — kasa kayıtları, notlar, görevler, yer imleri ve tercihlerle birlikte şifreleme anahtarını — kalıcı olarak siler. Geri alınamaz. Uygulama yeniden başlayacak ve kurulum sürecini yeniden geçireceksiniz.",
    exportHint:
      "İsteğe bağlı: önce şifreli bir yedek indirin. En az 8 karakterlik bir yedek parolası seçin — geri yüklemek için gerekecek.",
    passphrasePlaceholder: "Yedek parolası",
    passphraseTooShort: "Yedek parolası en az 8 karakter olmalıdır",
    exportButton: "Yedeği dışa aktar",
    exportSuccess: "Yedek indirildi",
    exportError: "Yedek dışa aktarımı başarısız oldu",
    confirmCheckbox: "Tüm verilerimin kalıcı olarak silineceğini anlıyorum",
    confirmButton: "Her şeyi sil ve yeniden başlat",
    resetting: "Siliniyor…",
    cancel: "İptal",
    resetError: "Fabrika sıfırlaması başarısız oldu — lütfen tekrar deneyin",
  },
  uk: {
    title: "Небезпечна зона",
    description: "Незворотні дії, що стирають дані цього застосунку.",
    resetButton: "Скидання до заводських налаштувань",
    dialogTitle: "Скидання до заводських налаштувань",
    dialogWarning:
      "Це назавжди видалить усе, що зберігається в застосунку — записи сховища, нотатки, завдання, закладки й налаштування, а також ключ шифрування. Дію не можна скасувати. Застосунок перезапуститься, і ви знову пройдете початкове налаштування.",
    exportHint:
      "Необов'язково: спершу завантажте зашифровану резервну копію. Оберіть парольну фразу щонайменше з 8 символів — вона знадобиться для відновлення.",
    passphrasePlaceholder: "Парольна фраза резервної копії",
    passphraseTooShort: "Парольна фраза має містити щонайменше 8 символів",
    exportButton: "Експортувати резервну копію",
    exportSuccess: "Резервну копію завантажено",
    exportError: "Не вдалося експортувати резервну копію",
    confirmCheckbox: "Я розумію, що всі мої дані буде видалено назавжди",
    confirmButton: "Стерти все й перезапустити",
    resetting: "Видалення…",
    cancel: "Скасувати",
    resetError: "Скидання до заводських налаштувань не вдалося — спробуйте ще раз",
  },
  vi: {
    title: "Vùng nguy hiểm",
    description: "Các hành động không thể hoàn tác sẽ xóa dữ liệu của ứng dụng này.",
    resetButton: "Khôi phục cài đặt gốc",
    dialogTitle: "Khôi phục cài đặt gốc",
    dialogWarning:
      "Thao tác này xóa vĩnh viễn mọi thứ được lưu trong ứng dụng — các mục trong kho lưu trữ, ghi chú, công việc, dấu trang và tùy chọn, cùng với khóa mã hóa. Không thể hoàn tác. Ứng dụng sẽ khởi động lại và đưa bạn qua quy trình thiết lập ban đầu một lần nữa.",
    exportHint:
      "Tùy chọn: tải xuống bản sao lưu đã mã hóa trước. Chọn cụm mật khẩu sao lưu ít nhất 8 ký tự — bạn sẽ cần nó để khôi phục.",
    passphrasePlaceholder: "Cụm mật khẩu sao lưu",
    passphraseTooShort: "Cụm mật khẩu sao lưu phải có ít nhất 8 ký tự",
    exportButton: "Xuất bản sao lưu",
    exportSuccess: "Đã tải xuống bản sao lưu",
    exportError: "Xuất bản sao lưu thất bại",
    confirmCheckbox: "Tôi hiểu rằng toàn bộ dữ liệu của tôi sẽ bị xóa vĩnh viễn",
    confirmButton: "Xóa tất cả và khởi động lại",
    resetting: "Đang xóa…",
    cancel: "Hủy",
    resetError: "Khôi phục cài đặt gốc thất bại — vui lòng thử lại",
  },
  zh: {
    title: "危险区域",
    description: "将抹除此应用数据的不可逆操作。",
    resetButton: "恢复出厂设置",
    dialogTitle: "恢复出厂设置",
    dialogWarning:
      "此操作将永久删除应用中存储的所有内容 — 保险库条目、笔记、任务、书签和偏好设置，以及加密密钥。此操作无法撤销。应用将重新启动，并再次引导你完成初始设置。",
    exportHint:
      "可选：请先下载加密备份。设置一个至少 8 个字符的备份口令 — 恢复时需要用到它。",
    passphrasePlaceholder: "备份口令",
    passphraseTooShort: "备份口令至少需要 8 个字符",
    exportButton: "导出备份",
    exportSuccess: "备份已下载",
    exportError: "备份导出失败",
    confirmCheckbox: "我了解我的所有数据将被永久删除",
    confirmButton: "抹掉所有内容并重启",
    resetting: "正在抹除…",
    cancel: "取消",
    resetError: "恢复出厂设置失败 — 请重试",
  },
};

const expected = Object.keys(T.en).sort().join(",");
for (const [loc, obj] of Object.entries(T)) {
  if (Object.keys(obj).sort().join(",") !== expected) {
    console.error(`Locale ${loc} has mismatched keys`);
    process.exit(1);
  }
}

for (const f of fs.readdirSync(messagesDir)) {
  if (!f.endsWith(".json")) continue;
  const loc = f.replace(/\.json$/, "");
  const strings = T[loc];
  if (!strings) {
    console.error(`No translations for locale ${loc}`);
    process.exit(1);
  }
  const p = path.join(messagesDir, f);
  const j = JSON.parse(fs.readFileSync(p, "utf8"));
  j.SettingsPage = j.SettingsPage || {};
  j.SettingsPage.dangerZone = { ...strings };
  fs.writeFileSync(p, JSON.stringify(j, null, 2) + "\n");
  console.log(`${f}: dangerZone written`);
}
