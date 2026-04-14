#!/usr/bin/env python3
"""Patch SnippetManager + Dashboard.analytics codeSnippets strings in all locale JSON files."""

import json
from pathlib import Path

MESSAGES = Path(__file__).resolve().parent.parent / "messages"

# Subtitle: browser storage + optional account sync + same feature list as EN.
# Toasts: server load/sync errors.
# codeSnippets: dashboard metric label.
LOCALE_PATCHES: dict[str, dict[str, str]] = {
    "en": {
        "subtitle": "Store snippets in your browser, or sign in to sync them with your account. Switch between view and edit, copy in one click, pick a language or use auto-detect, and format JSON, SQL, or Monaco-supported code.",
        "toastLoadFailed": "Could not load snippets from the server.",
        "toastSyncFailed": "Could not sync with the server.",
        "codeSnippets": "Code snippets",
    },
    "fr": {
        "subtitle": "Enregistrez des extraits dans votre navigateur ou connectez-vous pour les synchroniser avec votre compte. Passez de la consultation à l’édition, copiez en un clic, choisissez un langage ou la détection automatique, et formatez JSON, SQL ou le code pris en charge par Monaco.",
        "toastLoadFailed": "Impossible de charger les extraits depuis le serveur.",
        "toastSyncFailed": "Impossible de synchroniser avec le serveur.",
        "codeSnippets": "Extraits de code",
    },
    "es": {
        "subtitle": "Guarda fragmentos en tu navegador o inicia sesión para sincronizarlos con tu cuenta. Cambia entre ver y editar, copia con un clic, elige idioma o detección automática y formatea JSON, SQL o código compatible con Monaco.",
        "toastLoadFailed": "No se pudieron cargar los fragmentos desde el servidor.",
        "toastSyncFailed": "No se pudo sincronizar con el servidor.",
        "codeSnippets": "Fragmentos de código",
    },
    "de": {
        "subtitle": "Speichern Sie Snippets im Browser oder melden Sie sich an, um sie mit Ihrem Konto zu synchronisieren. Wechseln Sie zwischen Ansicht und Bearbeitung, kopieren Sie mit einem Klick, wählen Sie eine Sprache oder Auto-Erkennung und formatieren Sie JSON, SQL oder von Monaco unterstützten Code.",
        "toastLoadFailed": "Snippets konnten nicht vom Server geladen werden.",
        "toastSyncFailed": "Synchronisation mit dem Server fehlgeschlagen.",
        "codeSnippets": "Code-Snippets",
    },
    "it": {
        "subtitle": "Conserva gli snippet nel browser o accedi per sincronizzarli con il tuo account. Passa da visualizzazione a modifica, copia con un clic, scegli la lingua o il rilevamento automatico e formatta JSON, SQL o codice supportato da Monaco.",
        "toastLoadFailed": "Impossibile caricare gli snippet dal server.",
        "toastSyncFailed": "Impossibile sincronizzare con il server.",
        "codeSnippets": "Snippet di codice",
    },
    "pt": {
        "subtitle": "Guarde excertos no navegador ou inicie sessão para os sincronizar com a sua conta. Alterne entre ver e editar, copie com um clique, escolha a linguagem ou deteção automática e formate JSON, SQL ou código suportado pelo Monaco.",
        "toastLoadFailed": "Não foi possível carregar os excertos do servidor.",
        "toastSyncFailed": "Não foi possível sincronizar com o servidor.",
        "codeSnippets": "Excertos de código",
    },
    "pt-BR": {
        "subtitle": "Armazene trechos no navegador ou entre para sincronizá-los com sua conta. Alterne entre ver e editar, copie com um clique, escolha a linguagem ou detecção automática e formate JSON, SQL ou código suportado pelo Monaco.",
        "toastLoadFailed": "Não foi possível carregar os trechos do servidor.",
        "toastSyncFailed": "Não foi possível sincronizar com o servidor.",
        "codeSnippets": "Trechos de código",
    },
    "nl": {
        "subtitle": "Bewaar snippets in je browser of log in om ze met je account te synchroniseren. Wissel tussen bekijken en bewerken, kopieer met één klik, kies een taal of automatische detectie en formatteer JSON, SQL of door Monaco ondersteunde code.",
        "toastLoadFailed": "Snippets konden niet van de server worden geladen.",
        "toastSyncFailed": "Synchroniseren met de server is mislukt.",
        "codeSnippets": "Codefragmenten",
    },
    "pl": {
        "subtitle": "Przechowuj fragmenty kodu w przeglądarce lub zaloguj się, aby synchronizować je z kontem. Przełączaj widok i edycję, kopiuj jednym kliknięciem, wybierz język lub autowykrywanie i formatuj JSON, SQL lub kod obsługiwany przez Monaco.",
        "toastLoadFailed": "Nie udało się wczytać fragmentów z serwera.",
        "toastSyncFailed": "Nie udało się zsynchronizować z serwerem.",
        "codeSnippets": "Fragmenty kodu",
    },
    "ru": {
        "subtitle": "Храните сниппеты в браузере или войдите, чтобы синхронизировать их с аккаунтом. Переключайтесь между просмотром и правкой, копируйте в один клик, выбирайте язык или автоопределение и форматируйте JSON, SQL или код, поддерживаемый Monaco.",
        "toastLoadFailed": "Не удалось загрузить сниппеты с сервера.",
        "toastSyncFailed": "Не удалось синхронизировать с сервером.",
        "codeSnippets": "Фрагменты кода",
    },
    "uk": {
        "subtitle": "Зберігайте фрагменти коду в браузері або увійдіть, щоб синхронізувати їх з обліковим записом. Перемикайте перегляд і редагування, копіюйте одним кліком, обирайте мову або авто-визначення та форматуйте JSON, SQL або код, який підтримує Monaco.",
        "toastLoadFailed": "Не вдалося завантажити фрагменти з сервера.",
        "toastSyncFailed": "Не вдалося синхронізувати з сервером.",
        "codeSnippets": "Фрагменти коду",
    },
    "tr": {
        "subtitle": "Parçacıkları tarayıcıda saklayın veya hesabınızla eşitlemek için oturum açın. Görüntüleme ve düzenleme arasında geçiş yapın, tek tıkla kopyalayın, dil seçin veya otomatik algılayın ve JSON, SQL veya Monaco destekli kodu biçimlendirin.",
        "toastLoadFailed": "Parçacıklar sunucudan yüklenemedi.",
        "toastSyncFailed": "Sunucu ile eşitleme başarısız oldu.",
        "codeSnippets": "Kod parçacıkları",
    },
    "ar": {
        "subtitle": "خزّن المقاطع في المتصفح أو سجّل الدخول لمزامنتها مع حسابك. بدّل بين العرض والتحرير، انسخ بنقرة واحدة، اختر لغة أو كشفًا تلقائيًا، ونسّق JSON أو SQL أو أكواد يدعمها Monaco.",
        "toastLoadFailed": "تعذّر تحميل المقاطع من الخادم.",
        "toastSyncFailed": "تعذّرت المزامنة مع الخادم.",
        "codeSnippets": "مقاطع برمجية",
    },
    "fa": {
        "subtitle": "قطعه‌کدها را در مرورگر نگه دارید یا برای همگام‌سازی با حساب وارد شوید. بین مشاهده و ویرایش جابه‌جا شوید، با یک کلیک کپی کنید، زبان را انتخاب یا خودکار تشخیص دهید و JSON، SQL یا کد پشتیبانی‌شده توسط Monaco را قالب‌بندی کنید.",
        "toastLoadFailed": "بارگیری قطعه‌کدها از سرور انجام نشد.",
        "toastSyncFailed": "همگام‌سازی با سرور انجام نشد.",
        "codeSnippets": "قطعه‌کدهای برنامه",
    },
    "zh": {
        "subtitle": "在浏览器中保存代码片段，或登录以同步到账户。在查看与编辑间切换、一键复制、选择语言或使用自动检测，并格式化 JSON、SQL 或 Monaco 支持的代码。",
        "toastLoadFailed": "无法从服务器加载代码片段。",
        "toastSyncFailed": "无法与服务器同步。",
        "codeSnippets": "代码片段",
    },
    "ja": {
        "subtitle": "ブラウザにスニペットを保存するか、サインインしてアカウントと同期します。表示と編集の切り替え、ワンクリックコピー、言語の選択または自動検出、JSON・SQL・Monaco 対応コードの整形ができます。",
        "toastLoadFailed": "サーバーからスニペットを読み込めませんでした。",
        "toastSyncFailed": "サーバーと同期できませんでした。",
        "codeSnippets": "コードスニペット",
    },
    "ko": {
        "subtitle": "브라우저에 스니펫을 저장하거나 로그인해 계정과 동기화하세요. 보기와 편집 전환, 한 번의 클릭으로 복사, 언어 선택 또는 자동 감지, JSON·SQL·Monaco 지원 코드 포맷을 사용할 수 있습니다.",
        "toastLoadFailed": "서버에서 스니펫을 불러오지 못했습니다.",
        "toastSyncFailed": "서버와 동기화하지 못했습니다.",
        "codeSnippets": "코드 스니펫",
    },
    "vi": {
        "subtitle": "Lưu đoạn mã trong trình duyệt hoặc đăng nhập để đồng bộ với tài khoản. Chuyển giữa xem và sửa, sao chép một cú nhấp, chọn ngôn ngữ hoặc tự động nhận diện, và định dạng JSON, SQL hoặc mã được Monaco hỗ trợ.",
        "toastLoadFailed": "Không thể tải đoạn mã từ máy chủ.",
        "toastSyncFailed": "Không thể đồng bộ với máy chủ.",
        "codeSnippets": "Đoạn mã",
    },
    "id": {
        "subtitle": "Simpan cuplikan di browser atau masuk untuk menyinkronkannya dengan akun Anda. Beralih antara lihat dan sunting, salin sekali klik, pilih bahasa atau deteksi otomatis, dan format JSON, SQL, atau kode yang didukung Monaco.",
        "toastLoadFailed": "Tidak dapat memuat cuplikan dari server.",
        "toastSyncFailed": "Tidak dapat menyinkronkan dengan server.",
        "codeSnippets": "Cuplikan kode",
    },
    "ms": {
        "subtitle": "Simpan petikan dalam pelayar atau log masuk untuk menyelaraskannya dengan akaun anda. Tukar antara lihat dan sunting, salin satu klik, pilih bahasa atau auto kesan, dan format JSON, SQL atau kod yang disokong Monaco.",
        "toastLoadFailed": "Tidak dapat memuatkan petikan dari pelayan.",
        "toastSyncFailed": "Tidak dapat menyelaraskan dengan pelayan.",
        "codeSnippets": "Petikan kod",
    },
    "cs": {
        "subtitle": "Ukládejte úryvky v prohlížeči nebo se přihlaste a synchronizujte je s účtem. Přepínejte zobrazení a úpravy, kopírujte jedním kliknutím, volte jazyk nebo automatickou detekci a formátujte JSON, SQL nebo kód podporovaný Monacem.",
        "toastLoadFailed": "Úryvky se nepodařilo načíst ze serveru.",
        "toastSyncFailed": "Synchronizace se serverem se nezdařila.",
        "codeSnippets": "Úryvky kódu",
    },
    "el": {
        "subtitle": "Αποθηκεύστε αποσπάσματα στον browser ή συνδεθείτε για συγχρονισμό με τον λογαριασμό σας. Εναλλαγή προβολής και επεξεργασίας, αντιγραφή με ένα κλικ, επιλογή γλώσσας ή αυτόματη ανίχνευση και μορφοποίηση JSON, SQL ή κώδικα που υποστηρίζει το Monaco.",
        "toastLoadFailed": "Δεν ήταν δυνατή η φόρτωση αποσπασμάτων από τον διακομιστή.",
        "toastSyncFailed": "Δεν ήταν δυνατός ο συγχρονισμός με τον διακομιστή.",
        "codeSnippets": "Αποσπάσματα κώδικα",
    },
    "da": {
        "subtitle": "Gem snippets i browseren eller log ind for at synkronisere med din konto. Skift mellem visning og redigering, kopiér med ét klik, vælg sprog eller autodetektér, og formatér JSON, SQL eller Monaco-understøttet kode.",
        "toastLoadFailed": "Kunne ikke indlæse snippets fra serveren.",
        "toastSyncFailed": "Kunne ikke synkronisere med serveren.",
        "codeSnippets": "Kode-snippets",
    },
    "nb": {
        "subtitle": "Lagre utdrag i nettleseren eller logg inn for å synkronisere med kontoen din. Bytt mellom visning og redigering, kopier med ett klikk, velg språk eller automatisk gjenkjenning, og formater JSON, SQL eller Monaco-støttet kode.",
        "toastLoadFailed": "Kunne ikke laste utdrag fra serveren.",
        "toastSyncFailed": "Kunne ikke synkronisere med serveren.",
        "codeSnippets": "Kodeutdrag",
    },
    "sv": {
        "subtitle": "Spara utdrag i webbläsaren eller logga in för att synka med ditt konto. Växla mellan visning och redigering, kopiera med ett klick, välj språk eller autoupptäckt, och formatera JSON, SQL eller Monaco-stödd kod.",
        "toastLoadFailed": "Kunde inte läsa in utdrag från servern.",
        "toastSyncFailed": "Kunde inte synkronisera med servern.",
        "codeSnippets": "Kodutdrag",
    },
    "af": {
        "subtitle": "Bewaar snippette in jou blaaier of meld aan om dit met jou rekening te sinkroniseer. Wissel tussen bekyk en wysig, kopieer met een klik, kies taal of outo-opsporing, en formatteer JSON, SQL of Monaco-ondersteunde kode.",
        "toastLoadFailed": "Kon nie snippette van die bediener laai nie.",
        "toastSyncFailed": "Kon nie met die bediener sinkroniseer nie.",
        "codeSnippets": "Kodesnippette",
    },
    "ca": {
        "subtitle": "Emmagatzema fragments al navegador o inicia sessió per sincronitzar-los amb el teu compte. Canvia entre veure i editar, copia amb un clic, tria idioma o detecció automàtica i formata JSON, SQL o codi compatible amb Monaco.",
        "toastLoadFailed": "No s'han pogut carregar els fragments des del servidor.",
        "toastSyncFailed": "No s'ha pogut sincronitzar amb el servidor.",
        "codeSnippets": "Fragments de codi",
    },
}


def main() -> None:
    for path in sorted(MESSAGES.glob("*.json")):
        stem = path.stem
        patch = LOCALE_PATCHES.get(stem, LOCALE_PATCHES["en"])
        data = json.loads(path.read_text(encoding="utf-8"))

        dash = data.setdefault("Dashboard", {}).setdefault("analytics", {})
        dash["codeSnippets"] = patch["codeSnippets"]

        sm = data.setdefault("SnippetManager", {})
        sm["subtitle"] = patch["subtitle"]
        sm["toastLoadFailed"] = patch["toastLoadFailed"]
        sm["toastSyncFailed"] = patch["toastSyncFailed"]

        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(path.name)


if __name__ == "__main__":
    main()
