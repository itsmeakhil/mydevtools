/**
 * One-off: add SettingsPage.backup (backup & restore card) to all 27 locales.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const messagesDir = path.join(__dirname, "..", "messages");

const T = {
  en: {
    title: "Backup & restore",
    description: "Export an encrypted backup of your data, or restore one.",
    exportHint:
      "Encrypts everything with a backup passphrase of at least 8 characters — you will need it to restore.",
    passphrasePlaceholder: "Backup passphrase",
    passphraseTooShort: "Backup passphrase must be at least 8 characters",
    exportButton: "Export backup",
    exportSuccess: "Backup downloaded",
    exportError: "Backup export failed",
    restoreHint:
      "Restoring merges the backup into this app. Vault entries unlock with the master password you used when the backup was made.",
    chooseFile: "Choose backup file",
    restoreButton: "Restore backup",
    restoring: "Restoring…",
    restoreSuccess: "Backup restored",
    restoreError: "Restore failed — wrong passphrase or invalid backup file",
  },
  af: {
    title: "Rugsteun en herstel",
    description: "Voer 'n geënkripteerde rugsteun van jou data uit, of herstel een.",
    exportHint:
      "Enkripteer alles met 'n rugsteunwagfrase van minstens 8 karakters — jy sal dit nodig hê om te herstel.",
    passphrasePlaceholder: "Rugsteunwagfrase",
    passphraseTooShort: "Rugsteunwagfrase moet minstens 8 karakters wees",
    exportButton: "Voer rugsteun uit",
    exportSuccess: "Rugsteun afgelaai",
    exportError: "Rugsteunuitvoer het misluk",
    restoreHint:
      "Herstel voeg die rugsteun by hierdie app. Kluisinskrywings word ontsluit met die meesterwagwoord wat jy gebruik het toe die rugsteun gemaak is.",
    chooseFile: "Kies rugsteunlêer",
    restoreButton: "Herstel rugsteun",
    restoring: "Herstel tans…",
    restoreSuccess: "Rugsteun herstel",
    restoreError: "Herstel het misluk — verkeerde wagfrase of ongeldige rugsteunlêer",
  },
  ar: {
    title: "النسخ الاحتياطي والاستعادة",
    description: "صدِّر نسخة احتياطية مشفّرة من بياناتك، أو استعد واحدة.",
    exportHint:
      "يشفّر كل شيء بعبارة مرور للنسخة الاحتياطية من 8 أحرف على الأقل — ستحتاجها للاستعادة.",
    passphrasePlaceholder: "عبارة مرور النسخة الاحتياطية",
    passphraseTooShort: "يجب أن تتكوّن عبارة مرور النسخة الاحتياطية من 8 أحرف على الأقل",
    exportButton: "تصدير نسخة احتياطية",
    exportSuccess: "تم تنزيل النسخة الاحتياطية",
    exportError: "فشل تصدير النسخة الاحتياطية",
    restoreHint:
      "تدمج الاستعادة النسخة الاحتياطية في هذا التطبيق. تُفتح عناصر الخزنة بكلمة المرور الرئيسية التي كنت تستخدمها عند إنشاء النسخة الاحتياطية.",
    chooseFile: "اختر ملف النسخة الاحتياطية",
    restoreButton: "استعادة النسخة الاحتياطية",
    restoring: "جارٍ الاستعادة…",
    restoreSuccess: "تمت استعادة النسخة الاحتياطية",
    restoreError: "فشلت الاستعادة — عبارة مرور خاطئة أو ملف نسخة احتياطية غير صالح",
  },
  ca: {
    title: "Còpia de seguretat i restauració",
    description: "Exporta una còpia de seguretat xifrada de les teves dades, o restaura'n una.",
    exportHint:
      "Ho xifra tot amb una contrasenya de còpia de seguretat d'almenys 8 caràcters — la necessitaràs per restaurar.",
    passphrasePlaceholder: "Contrasenya de la còpia de seguretat",
    passphraseTooShort: "La contrasenya de la còpia de seguretat ha de tenir almenys 8 caràcters",
    exportButton: "Exporta la còpia de seguretat",
    exportSuccess: "Còpia de seguretat baixada",
    exportError: "L'exportació de la còpia de seguretat ha fallat",
    restoreHint:
      "La restauració fusiona la còpia de seguretat amb aquesta aplicació. Les entrades de la caixa forta es desbloquegen amb la contrasenya mestra que feies servir quan es va crear la còpia.",
    chooseFile: "Tria el fitxer de còpia de seguretat",
    restoreButton: "Restaura la còpia de seguretat",
    restoring: "S'està restaurant…",
    restoreSuccess: "Còpia de seguretat restaurada",
    restoreError: "La restauració ha fallat — contrasenya incorrecta o fitxer de còpia no vàlid",
  },
  cs: {
    title: "Zálohování a obnovení",
    description: "Exportujte šifrovanou zálohu svých dat, nebo ji obnovte.",
    exportHint:
      "Vše zašifruje heslem zálohy o délce alespoň 8 znaků — budete ho potřebovat k obnovení.",
    passphrasePlaceholder: "Heslo zálohy",
    passphraseTooShort: "Heslo zálohy musí mít alespoň 8 znaků",
    exportButton: "Exportovat zálohu",
    exportSuccess: "Záloha stažena",
    exportError: "Export zálohy se nezdařil",
    restoreHint:
      "Obnovení sloučí zálohu do této aplikace. Položky trezoru se odemknou hlavním heslem, které jste používali v době vytvoření zálohy.",
    chooseFile: "Vybrat soubor zálohy",
    restoreButton: "Obnovit zálohu",
    restoring: "Obnovování…",
    restoreSuccess: "Záloha obnovena",
    restoreError: "Obnovení se nezdařilo — špatné heslo nebo neplatný soubor zálohy",
  },
  da: {
    title: "Sikkerhedskopiering og gendannelse",
    description: "Eksportér en krypteret sikkerhedskopi af dine data, eller gendan en.",
    exportHint:
      "Krypterer alt med en adgangssætning på mindst 8 tegn — du skal bruge den til at gendanne.",
    passphrasePlaceholder: "Adgangssætning til sikkerhedskopi",
    passphraseTooShort: "Adgangssætningen til sikkerhedskopien skal være på mindst 8 tegn",
    exportButton: "Eksportér sikkerhedskopi",
    exportSuccess: "Sikkerhedskopi downloadet",
    exportError: "Eksport af sikkerhedskopi mislykkedes",
    restoreHint:
      "Gendannelse fletter sikkerhedskopien ind i denne app. Boksposter låses op med den hovedadgangskode, du brugte, da sikkerhedskopien blev lavet.",
    chooseFile: "Vælg sikkerhedskopifil",
    restoreButton: "Gendan sikkerhedskopi",
    restoring: "Gendanner…",
    restoreSuccess: "Sikkerhedskopi gendannet",
    restoreError: "Gendannelse mislykkedes — forkert adgangssætning eller ugyldig fil",
  },
  de: {
    title: "Sichern und Wiederherstellen",
    description: "Exportiere ein verschlüsseltes Backup deiner Daten oder stelle eines wieder her.",
    exportHint:
      "Verschlüsselt alles mit einer Backup-Passphrase von mindestens 8 Zeichen — du brauchst sie zur Wiederherstellung.",
    passphrasePlaceholder: "Backup-Passphrase",
    passphraseTooShort: "Die Backup-Passphrase muss mindestens 8 Zeichen lang sein",
    exportButton: "Backup exportieren",
    exportSuccess: "Backup heruntergeladen",
    exportError: "Backup-Export fehlgeschlagen",
    restoreHint:
      "Die Wiederherstellung führt das Backup mit dieser App zusammen. Tresoreinträge werden mit dem Master-Passwort entsperrt, das du zum Zeitpunkt des Backups verwendet hast.",
    chooseFile: "Backup-Datei auswählen",
    restoreButton: "Backup wiederherstellen",
    restoring: "Wird wiederhergestellt…",
    restoreSuccess: "Backup wiederhergestellt",
    restoreError: "Wiederherstellung fehlgeschlagen — falsche Passphrase oder ungültige Backup-Datei",
  },
  el: {
    title: "Αντίγραφο ασφαλείας και επαναφορά",
    description: "Εξαγάγετε ένα κρυπτογραφημένο αντίγραφο ασφαλείας των δεδομένων σας ή επαναφέρετε ένα.",
    exportHint:
      "Κρυπτογραφεί τα πάντα με μια φράση πρόσβασης τουλάχιστον 8 χαρακτήρων — θα τη χρειαστείτε για την επαναφορά.",
    passphrasePlaceholder: "Φράση πρόσβασης αντιγράφου ασφαλείας",
    passphraseTooShort: "Η φράση πρόσβασης πρέπει να έχει τουλάχιστον 8 χαρακτήρες",
    exportButton: "Εξαγωγή αντιγράφου ασφαλείας",
    exportSuccess: "Το αντίγραφο ασφαλείας λήφθηκε",
    exportError: "Η εξαγωγή του αντιγράφου ασφαλείας απέτυχε",
    restoreHint:
      "Η επαναφορά συγχωνεύει το αντίγραφο ασφαλείας σε αυτήν την εφαρμογή. Οι καταχωρίσεις του θησαυροφυλακίου ξεκλειδώνουν με τον κύριο κωδικό που χρησιμοποιούσατε όταν δημιουργήθηκε το αντίγραφο.",
    chooseFile: "Επιλογή αρχείου αντιγράφου ασφαλείας",
    restoreButton: "Επαναφορά αντιγράφου ασφαλείας",
    restoring: "Γίνεται επαναφορά…",
    restoreSuccess: "Το αντίγραφο ασφαλείας επαναφέρθηκε",
    restoreError: "Η επαναφορά απέτυχε — λάθος φράση πρόσβασης ή μη έγκυρο αρχείο",
  },
  es: {
    title: "Copia de seguridad y restauración",
    description: "Exporta una copia de seguridad cifrada de tus datos, o restaura una.",
    exportHint:
      "Cifra todo con una frase de contraseña de al menos 8 caracteres — la necesitarás para restaurar.",
    passphrasePlaceholder: "Frase de contraseña de la copia",
    passphraseTooShort: "La frase de contraseña debe tener al menos 8 caracteres",
    exportButton: "Exportar copia de seguridad",
    exportSuccess: "Copia de seguridad descargada",
    exportError: "Error al exportar la copia de seguridad",
    restoreHint:
      "La restauración fusiona la copia de seguridad con esta aplicación. Las entradas de la bóveda se desbloquean con la contraseña maestra que usabas cuando se creó la copia.",
    chooseFile: "Elegir archivo de copia",
    restoreButton: "Restaurar copia de seguridad",
    restoring: "Restaurando…",
    restoreSuccess: "Copia de seguridad restaurada",
    restoreError: "La restauración falló — frase incorrecta o archivo de copia no válido",
  },
  fa: {
    title: "پشتیبان‌گیری و بازیابی",
    description: "یک نسخه پشتیبان رمزنگاری‌شده از داده‌های خود برون‌بری کنید، یا یکی را بازیابی کنید.",
    exportHint:
      "همه چیز را با یک عبارت عبور پشتیبان با حداقل ۸ نویسه رمزنگاری می‌کند — برای بازیابی به آن نیاز خواهید داشت.",
    passphrasePlaceholder: "عبارت عبور نسخه پشتیبان",
    passphraseTooShort: "عبارت عبور نسخه پشتیبان باید حداقل ۸ نویسه باشد",
    exportButton: "برون‌بری نسخه پشتیبان",
    exportSuccess: "نسخه پشتیبان دانلود شد",
    exportError: "برون‌بری نسخه پشتیبان ناموفق بود",
    restoreHint:
      "بازیابی، نسخه پشتیبان را با این برنامه ادغام می‌کند. موارد گاوصندوق با گذرواژه اصلی‌ای باز می‌شوند که هنگام ساخت نسخه پشتیبان استفاده می‌کردید.",
    chooseFile: "انتخاب فایل پشتیبان",
    restoreButton: "بازیابی نسخه پشتیبان",
    restoring: "در حال بازیابی…",
    restoreSuccess: "نسخه پشتیبان بازیابی شد",
    restoreError: "بازیابی ناموفق بود — عبارت عبور اشتباه یا فایل پشتیبان نامعتبر",
  },
  fr: {
    title: "Sauvegarde et restauration",
    description: "Exportez une sauvegarde chiffrée de vos données, ou restaurez-en une.",
    exportHint:
      "Chiffre tout avec une phrase secrète d'au moins 8 caractères — elle sera nécessaire pour la restauration.",
    passphrasePlaceholder: "Phrase secrète de sauvegarde",
    passphraseTooShort: "La phrase secrète doit comporter au moins 8 caractères",
    exportButton: "Exporter la sauvegarde",
    exportSuccess: "Sauvegarde téléchargée",
    exportError: "Échec de l'export de la sauvegarde",
    restoreHint:
      "La restauration fusionne la sauvegarde avec cette application. Les entrées du coffre-fort se déverrouillent avec le mot de passe principal utilisé au moment de la sauvegarde.",
    chooseFile: "Choisir le fichier de sauvegarde",
    restoreButton: "Restaurer la sauvegarde",
    restoring: "Restauration…",
    restoreSuccess: "Sauvegarde restaurée",
    restoreError: "Échec de la restauration — phrase secrète incorrecte ou fichier non valide",
  },
  id: {
    title: "Cadangkan dan pulihkan",
    description: "Ekspor cadangan terenkripsi dari data Anda, atau pulihkan satu.",
    exportHint:
      "Mengenkripsi semuanya dengan frasa sandi cadangan minimal 8 karakter — Anda akan membutuhkannya untuk memulihkan.",
    passphrasePlaceholder: "Frasa sandi cadangan",
    passphraseTooShort: "Frasa sandi cadangan minimal 8 karakter",
    exportButton: "Ekspor cadangan",
    exportSuccess: "Cadangan diunduh",
    exportError: "Ekspor cadangan gagal",
    restoreHint:
      "Pemulihan menggabungkan cadangan ke dalam aplikasi ini. Entri brankas dibuka dengan kata sandi utama yang Anda gunakan saat cadangan dibuat.",
    chooseFile: "Pilih file cadangan",
    restoreButton: "Pulihkan cadangan",
    restoring: "Memulihkan…",
    restoreSuccess: "Cadangan dipulihkan",
    restoreError: "Pemulihan gagal — frasa sandi salah atau file cadangan tidak valid",
  },
  it: {
    title: "Backup e ripristino",
    description: "Esporta un backup crittografato dei tuoi dati, o ripristinane uno.",
    exportHint:
      "Crittografa tutto con una passphrase di backup di almeno 8 caratteri — ti servirà per il ripristino.",
    passphrasePlaceholder: "Passphrase del backup",
    passphraseTooShort: "La passphrase del backup deve avere almeno 8 caratteri",
    exportButton: "Esporta backup",
    exportSuccess: "Backup scaricato",
    exportError: "Esportazione del backup non riuscita",
    restoreHint:
      "Il ripristino unisce il backup a questa app. Le voci della cassaforte si sbloccano con la password principale in uso quando è stato creato il backup.",
    chooseFile: "Scegli file di backup",
    restoreButton: "Ripristina backup",
    restoring: "Ripristino…",
    restoreSuccess: "Backup ripristinato",
    restoreError: "Ripristino non riuscito — passphrase errata o file di backup non valido",
  },
  ja: {
    title: "バックアップと復元",
    description: "データの暗号化バックアップを書き出すか、復元します。",
    exportHint:
      "8文字以上のバックアップ用パスフレーズですべてを暗号化します — 復元時に必要です。",
    passphrasePlaceholder: "バックアップ用パスフレーズ",
    passphraseTooShort: "バックアップ用パスフレーズは8文字以上にしてください",
    exportButton: "バックアップを書き出す",
    exportSuccess: "バックアップをダウンロードしました",
    exportError: "バックアップの書き出しに失敗しました",
    restoreHint:
      "復元するとバックアップがこのアプリに統合されます。保管庫の項目は、バックアップ作成時に使っていたマスターパスワードで解錠されます。",
    chooseFile: "バックアップファイルを選択",
    restoreButton: "バックアップを復元",
    restoring: "復元中…",
    restoreSuccess: "バックアップを復元しました",
    restoreError: "復元に失敗しました — パスフレーズが違うか、無効なバックアップファイルです",
  },
  ko: {
    title: "백업 및 복원",
    description: "데이터의 암호화된 백업을 내보내거나 복원합니다.",
    exportHint:
      "8자 이상의 백업 암호 문구로 모든 것을 암호화합니다 — 복원할 때 필요합니다.",
    passphrasePlaceholder: "백업 암호 문구",
    passphraseTooShort: "백업 암호 문구는 8자 이상이어야 합니다",
    exportButton: "백업 내보내기",
    exportSuccess: "백업이 다운로드되었습니다",
    exportError: "백업 내보내기에 실패했습니다",
    restoreHint:
      "복원하면 백업이 이 앱에 병합됩니다. 금고 항목은 백업을 만들 당시 사용하던 마스터 비밀번호로 잠금 해제됩니다.",
    chooseFile: "백업 파일 선택",
    restoreButton: "백업 복원",
    restoring: "복원 중…",
    restoreSuccess: "백업이 복원되었습니다",
    restoreError: "복원에 실패했습니다 — 잘못된 암호 문구이거나 유효하지 않은 백업 파일입니다",
  },
  ms: {
    title: "Sandaran dan pemulihan",
    description: "Eksport sandaran tersulit data anda, atau pulihkan satu.",
    exportHint:
      "Menyulitkan segalanya dengan frasa laluan sandaran sekurang-kurangnya 8 aksara — anda memerlukannya untuk memulihkan.",
    passphrasePlaceholder: "Frasa laluan sandaran",
    passphraseTooShort: "Frasa laluan sandaran mestilah sekurang-kurangnya 8 aksara",
    exportButton: "Eksport sandaran",
    exportSuccess: "Sandaran dimuat turun",
    exportError: "Eksport sandaran gagal",
    restoreHint:
      "Pemulihan menggabungkan sandaran ke dalam aplikasi ini. Entri bilik kebal dibuka dengan kata laluan induk yang anda gunakan semasa sandaran dibuat.",
    chooseFile: "Pilih fail sandaran",
    restoreButton: "Pulihkan sandaran",
    restoring: "Memulihkan…",
    restoreSuccess: "Sandaran dipulihkan",
    restoreError: "Pemulihan gagal — frasa laluan salah atau fail sandaran tidak sah",
  },
  nb: {
    title: "Sikkerhetskopiering og gjenoppretting",
    description: "Eksporter en kryptert sikkerhetskopi av dataene dine, eller gjenopprett en.",
    exportHint:
      "Krypterer alt med en passfrase på minst 8 tegn — du trenger den for å gjenopprette.",
    passphrasePlaceholder: "Passfrase for sikkerhetskopi",
    passphraseTooShort: "Passfrasen for sikkerhetskopien må være på minst 8 tegn",
    exportButton: "Eksporter sikkerhetskopi",
    exportSuccess: "Sikkerhetskopi lastet ned",
    exportError: "Eksport av sikkerhetskopi mislyktes",
    restoreHint:
      "Gjenoppretting fletter sikkerhetskopien inn i denne appen. Hvelvoppføringer låses opp med hovedpassordet du brukte da sikkerhetskopien ble laget.",
    chooseFile: "Velg sikkerhetskopifil",
    restoreButton: "Gjenopprett sikkerhetskopi",
    restoring: "Gjenoppretter…",
    restoreSuccess: "Sikkerhetskopi gjenopprettet",
    restoreError: "Gjenoppretting mislyktes — feil passfrase eller ugyldig fil",
  },
  nl: {
    title: "Back-up en herstel",
    description: "Exporteer een versleutelde back-up van je gegevens, of herstel er een.",
    exportHint:
      "Versleutelt alles met een back-upwachtwoordzin van minimaal 8 tekens — je hebt deze nodig om te herstellen.",
    passphrasePlaceholder: "Back-upwachtwoordzin",
    passphraseTooShort: "De back-upwachtwoordzin moet minimaal 8 tekens bevatten",
    exportButton: "Back-up exporteren",
    exportSuccess: "Back-up gedownload",
    exportError: "Exporteren van back-up mislukt",
    restoreHint:
      "Herstellen voegt de back-up samen met deze app. Kluisitems worden ontgrendeld met het hoofdwachtwoord dat je gebruikte toen de back-up werd gemaakt.",
    chooseFile: "Back-upbestand kiezen",
    restoreButton: "Back-up herstellen",
    restoring: "Herstellen…",
    restoreSuccess: "Back-up hersteld",
    restoreError: "Herstellen mislukt — verkeerde wachtwoordzin of ongeldig back-upbestand",
  },
  pl: {
    title: "Kopia zapasowa i przywracanie",
    description: "Wyeksportuj zaszyfrowaną kopię zapasową swoich danych lub przywróć ją.",
    exportHint:
      "Szyfruje wszystko hasłem kopii zapasowej o długości co najmniej 8 znaków — będzie potrzebne do przywrócenia.",
    passphrasePlaceholder: "Hasło kopii zapasowej",
    passphraseTooShort: "Hasło kopii zapasowej musi mieć co najmniej 8 znaków",
    exportButton: "Eksportuj kopię zapasową",
    exportSuccess: "Kopia zapasowa pobrana",
    exportError: "Eksport kopii zapasowej nie powiódł się",
    restoreHint:
      "Przywracanie scala kopię zapasową z tą aplikacją. Wpisy sejfu odblokowuje hasło główne używane w chwili tworzenia kopii.",
    chooseFile: "Wybierz plik kopii zapasowej",
    restoreButton: "Przywróć kopię zapasową",
    restoring: "Przywracanie…",
    restoreSuccess: "Kopia zapasowa przywrócona",
    restoreError: "Przywracanie nie powiodło się — błędne hasło lub nieprawidłowy plik kopii",
  },
  pt: {
    title: "Cópia de segurança e restauro",
    description: "Exporte uma cópia de segurança encriptada dos seus dados, ou restaure uma.",
    exportHint:
      "Encripta tudo com uma frase de acesso com pelo menos 8 caracteres — vai precisar dela para restaurar.",
    passphrasePlaceholder: "Frase de acesso da cópia de segurança",
    passphraseTooShort: "A frase de acesso deve ter pelo menos 8 caracteres",
    exportButton: "Exportar cópia de segurança",
    exportSuccess: "Cópia de segurança transferida",
    exportError: "Falha ao exportar a cópia de segurança",
    restoreHint:
      "O restauro funde a cópia de segurança com esta aplicação. As entradas do cofre desbloqueiam-se com a palavra-passe mestra que usava quando a cópia foi criada.",
    chooseFile: "Escolher ficheiro de cópia de segurança",
    restoreButton: "Restaurar cópia de segurança",
    restoring: "A restaurar…",
    restoreSuccess: "Cópia de segurança restaurada",
    restoreError: "O restauro falhou — frase de acesso errada ou ficheiro inválido",
  },
  "pt-BR": {
    title: "Backup e restauração",
    description: "Exporte um backup criptografado dos seus dados, ou restaure um.",
    exportHint:
      "Criptografa tudo com uma senha de backup de pelo menos 8 caracteres — você precisará dela para restaurar.",
    passphrasePlaceholder: "Senha do backup",
    passphraseTooShort: "A senha do backup deve ter pelo menos 8 caracteres",
    exportButton: "Exportar backup",
    exportSuccess: "Backup baixado",
    exportError: "Falha ao exportar o backup",
    restoreHint:
      "A restauração mescla o backup neste aplicativo. Os itens do cofre são desbloqueados com a senha mestra que você usava quando o backup foi criado.",
    chooseFile: "Escolher arquivo de backup",
    restoreButton: "Restaurar backup",
    restoring: "Restaurando…",
    restoreSuccess: "Backup restaurado",
    restoreError: "A restauração falhou — senha incorreta ou arquivo de backup inválido",
  },
  ru: {
    title: "Резервное копирование и восстановление",
    description: "Экспортируйте зашифрованную резервную копию своих данных или восстановите её.",
    exportHint:
      "Шифрует всё парольной фразой не короче 8 символов — она понадобится для восстановления.",
    passphrasePlaceholder: "Парольная фраза резервной копии",
    passphraseTooShort: "Парольная фраза должна содержать не менее 8 символов",
    exportButton: "Экспортировать резервную копию",
    exportSuccess: "Резервная копия скачана",
    exportError: "Не удалось экспортировать резервную копию",
    restoreHint:
      "Восстановление объединяет резервную копию с данными приложения. Записи хранилища открываются мастер-паролем, который использовался при создании копии.",
    chooseFile: "Выбрать файл резервной копии",
    restoreButton: "Восстановить резервную копию",
    restoring: "Восстановление…",
    restoreSuccess: "Резервная копия восстановлена",
    restoreError: "Восстановление не удалось — неверная фраза или повреждённый файл копии",
  },
  sv: {
    title: "Säkerhetskopiering och återställning",
    description: "Exportera en krypterad säkerhetskopia av dina data, eller återställ en.",
    exportHint:
      "Krypterar allt med en lösenfras på minst 8 tecken — du behöver den för att återställa.",
    passphrasePlaceholder: "Lösenfras för säkerhetskopia",
    passphraseTooShort: "Lösenfrasen måste vara minst 8 tecken",
    exportButton: "Exportera säkerhetskopia",
    exportSuccess: "Säkerhetskopia nedladdad",
    exportError: "Export av säkerhetskopia misslyckades",
    restoreHint:
      "Återställning sammanfogar säkerhetskopian med appen. Valvposter låses upp med huvudlösenordet du använde när kopian skapades.",
    chooseFile: "Välj säkerhetskopiefil",
    restoreButton: "Återställ säkerhetskopia",
    restoring: "Återställer…",
    restoreSuccess: "Säkerhetskopia återställd",
    restoreError: "Återställningen misslyckades — fel lösenfras eller ogiltig fil",
  },
  tr: {
    title: "Yedekleme ve geri yükleme",
    description: "Verilerinizin şifreli bir yedeğini dışa aktarın veya bir yedeği geri yükleyin.",
    exportHint:
      "Her şeyi en az 8 karakterlik bir yedek parolasıyla şifreler — geri yüklemek için gerekecek.",
    passphrasePlaceholder: "Yedek parolası",
    passphraseTooShort: "Yedek parolası en az 8 karakter olmalıdır",
    exportButton: "Yedeği dışa aktar",
    exportSuccess: "Yedek indirildi",
    exportError: "Yedek dışa aktarımı başarısız oldu",
    restoreHint:
      "Geri yükleme, yedeği bu uygulamayla birleştirir. Kasa kayıtları, yedek alındığı sırada kullandığınız ana parolayla açılır.",
    chooseFile: "Yedek dosyasını seç",
    restoreButton: "Yedeği geri yükle",
    restoring: "Geri yükleniyor…",
    restoreSuccess: "Yedek geri yüklendi",
    restoreError: "Geri yükleme başarısız — yanlış parola veya geçersiz yedek dosyası",
  },
  uk: {
    title: "Резервне копіювання та відновлення",
    description: "Експортуйте зашифровану резервну копію своїх даних або відновіть її.",
    exportHint:
      "Шифрує все парольною фразою щонайменше з 8 символів — вона знадобиться для відновлення.",
    passphrasePlaceholder: "Парольна фраза резервної копії",
    passphraseTooShort: "Парольна фраза має містити щонайменше 8 символів",
    exportButton: "Експортувати резервну копію",
    exportSuccess: "Резервну копію завантажено",
    exportError: "Не вдалося експортувати резервну копію",
    restoreHint:
      "Відновлення об'єднує резервну копію з даними застосунку. Записи сховища відкриваються майстер-паролем, який використовувався під час створення копії.",
    chooseFile: "Вибрати файл резервної копії",
    restoreButton: "Відновити резервну копію",
    restoring: "Відновлення…",
    restoreSuccess: "Резервну копію відновлено",
    restoreError: "Відновлення не вдалося — неправильна фраза або недійсний файл копії",
  },
  vi: {
    title: "Sao lưu và khôi phục",
    description: "Xuất bản sao lưu đã mã hóa của dữ liệu, hoặc khôi phục một bản.",
    exportHint:
      "Mã hóa mọi thứ bằng cụm mật khẩu sao lưu ít nhất 8 ký tự — bạn sẽ cần nó để khôi phục.",
    passphrasePlaceholder: "Cụm mật khẩu sao lưu",
    passphraseTooShort: "Cụm mật khẩu sao lưu phải có ít nhất 8 ký tự",
    exportButton: "Xuất bản sao lưu",
    exportSuccess: "Đã tải xuống bản sao lưu",
    exportError: "Xuất bản sao lưu thất bại",
    restoreHint:
      "Khôi phục sẽ gộp bản sao lưu vào ứng dụng này. Các mục trong kho lưu trữ được mở khóa bằng mật khẩu chính bạn dùng khi tạo bản sao lưu.",
    chooseFile: "Chọn tệp sao lưu",
    restoreButton: "Khôi phục bản sao lưu",
    restoring: "Đang khôi phục…",
    restoreSuccess: "Đã khôi phục bản sao lưu",
    restoreError: "Khôi phục thất bại — sai cụm mật khẩu hoặc tệp sao lưu không hợp lệ",
  },
  zh: {
    title: "备份与恢复",
    description: "导出数据的加密备份，或恢复一份备份。",
    exportHint: "使用至少 8 个字符的备份口令加密所有内容 — 恢复时需要用到它。",
    passphrasePlaceholder: "备份口令",
    passphraseTooShort: "备份口令至少需要 8 个字符",
    exportButton: "导出备份",
    exportSuccess: "备份已下载",
    exportError: "备份导出失败",
    restoreHint:
      "恢复会将备份合并到此应用中。保险库条目使用创建备份时所用的主密码解锁。",
    chooseFile: "选择备份文件",
    restoreButton: "恢复备份",
    restoring: "正在恢复…",
    restoreSuccess: "备份已恢复",
    restoreError: "恢复失败 — 口令错误或备份文件无效",
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
  j.SettingsPage.backup = { ...strings };
  fs.writeFileSync(p, JSON.stringify(j, null, 2) + "\n");
  console.log(`${f}: backup written`);
}
