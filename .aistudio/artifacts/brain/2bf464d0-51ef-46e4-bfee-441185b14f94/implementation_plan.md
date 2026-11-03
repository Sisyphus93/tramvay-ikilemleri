# Absürt Tramvay İkilemleri (Absurd Trolley Problems — Türkiye Edisyonu)

Neal.fun'ın dünyaca ünlü "Absurd Trolley Problems" oyununun Türk internet, yayıncı (Twitch/Kick/YouTube TR) ve oyun kültürüne özel olarak yeniden tasarlanmış, mizahi ve derinlikli interaktif web uyarlaması.

### User Review & Critical Decisions

> [!IMPORTANT]
> Aşağıdaki tercihler kullanıcının yanıtlarıyla netleştirilmiş ve plana dahil edilmiştir:
> - **Kültürel Ton**: Twitch TR, Türk oyun topluluğu ve internet meme kültürünü harmanlayan dengeli bir mizah dili.
> - **İçerik Uzunluğu**: 15 seviyeli tam senaryo + oyun sonu ahlak & sicil karnesi (Summary / Scorecard).
> - **Ses Tasarımı**: Web Audio API ile sıfır harici bağımlılık gerektiren dinamik tramvay rayı, kol çekme klik sesi, çan zili ve duruma özel meme ses efektleri.

---

## 1. Genel Bakış ve Temel Konsept

- **Nedir?**: Kontrolden çıkmış bir tramvay raylar boyunca hızla ilerliyor. Oyuncunun önünde iki seçenek var: *"Hiçbir Şey Yapma"* (tramvay ana yoldan devam eder) veya *"Kolu Çek"* (makası değiştirip yan yola saptırır).
- **Kültürel Uyarlama**: Birebir çeviri yerine; Steam dolar kuru, 144Hz ekran ve RTX kasa, Hatay soslu döner & açık ayran, rank maçında 0/15 giden kolsuz takım arkadaşı, Kurtlar Vadisi ilk 97 bölümün tek master kaseti, sokak kedisinin dokunulmazlığı gibi Türk internet ve yayıncı kültürünün en ikonik absürtlükleri işlenir.
- **Topluluk İstatistikleri & Tepkiler**: Her karardan sonra tıpkı Neal.fun'daki gibi gerçekçi simüle edilmiş yüzdelik oran ("Oyuncuların %74'ü kolu çekti") ve Twitch chat'i / Ekşi Sözlük tarzı tek cümlelik esprili yorum gösterilir.
- **Hedef Kitle**: Türk oyun ve yayıncı izleyicileri, felsefe ve karar oyunlarını sevenler, sosyal medyada sonuçlarını paylaşmak isteyenler.

---

## 2. Kullanıcı Deneyimi & Görsel Tasarım

### Temel Akışlar
1. **Giriş Ekranı (Başlangıç)**:
   - Başlık: *"Absürt Tramvay İkilemleri"*
   - Retro-minimalist Neal.fun estetiğinde çizilmiş hareketli tramvay illüstrasyonu.
   - Kolay başlangıç: "İkilemlere Başla" butonu ve ses açma/kapama kontrolü.
2. **Aktif İkilem Ekranı (1 - 15 Seviyeleri)**:
   - Üst Bar: İlerleme göstergesi (`İkilem 3 / 15`), ses durumu ikonu, anlık toplam "Kayıp / Zayiat" sayacı.
   - Ray & Tramvay Sahnesi (Etkileşimli Vektör Görsel):
     - Üst ve alt yola ayrılan raylar, üzerindeki kurbanlar/nesneler (çöp adamlar, kedi, RTX kasa, döner tezgahı vb. özel çizilmiş şirin vektörler).
     - Makas mekanizması (kol çekildiğinde yön değiştiren hareketli ray parçası).
   - Karar Kontrolleri:
     - "Hiçbir Şey Yapma" (Kırmızı vurgulu minimalist buton)
     - Gerçekçi tıklanabilir 3D/2D Makas Kolu (Lever) veya "Kolu Çek" butonu.
3. **Karar & Animasyon Fazı**:
   - Seçim yapıldığında tramvay teker sesleri ve çan ziliyle hızlanır, seçilen raya girer.
   - Çarpma anında çizgi film tarzı hafif ekran sarsıntısı ve komik ses efekti.
   - Sonuç Kartı açılır:
     - Seçilen karar vurgusu.
     - "Oyuncuların %X'i senin gibi düşündü."
     - Mizahi internet yorumu (Örn: *"Steam kütüphaneni kurtardın ama insanlığını kaybettin."*).
     - "Sonraki İkilem ➔" butonu.
4. **Oyun Sonu Raporu (Ahlaki Sicil Karnesi)**:
   - "Felsefeyi Çözdün! (Ya da İçinden Geçtin)"
   - Toplam Verilen Can Kaybı (Zayiat).
   - Verilen Maddi Hasar (TL / Dolar cinsinden).
   - Oyuncunun Ahlak Unvanı (Örn: *"Kati Faydacı Sigma"*, *"Kaos İlahı"*, *"Merhametli Kolsuz"*, *"Twitch Modu"*).
   - 15 ikilemin tümündeki tercihlerin dökümü ve topluluk ortalamasıyla karşılaştırma grafiği.
   - "Sonucumu Kopyala / Paylaş" (panoya kopyalanabilir hazır metin formatı).
   - "Yeniden Oyna" (Sayfayı yenilemeden temiz state sıfırlama).

### Görsel Kimlik & Renk Paleti
- **Aesthetic**: Neal.fun tarzı minimalist, sıcak, elle çizilmiş hissi veren modern flat-line vektör sanatı. Göz yormayan açık/koyu mod uyumlu kağıt dokusu.
- **Arka Plan**: `#FAF8F5` (sıcak krem kağıt tonu) / Dark modda `#12161A`.
- **Raylar & Hatlar**: `#2D3748` koyu grafit çizgiler.
- **Tramvay**: Klasik kırmızı nostaljik tramvay (İstiklal Caddesi tramvayı esintili kırmızı `#E53E3E` ve krem detaylar).
- **Tipografi**: Display için `Plus Jakarta Sans` / `Outfit`, gövde için okunabilir `DM Sans`, yüzdelik ve istatistiklerde `tabular-nums`.

---

## 3. İkilemler Listesi (15 Seviyelik Senaryo)

| # | İsim | Ana Yol (Hiçbir Şey Yapma) | Yan Yol (Kolu Çek) | Tematik Özellik |
|---|---|---|---|---|
| 1 | Klasik Tramvay | Rayda bağlı 5 kişi | Yan rayda 1 kişi | Felsefeye giriş, etik temel |
| 2 | Steam Kütüphanesi | 4 masum insan | 800 oyunlu 15 yıllık Steam hesabı | Steam dolar kuru acısı |
| 3 | Twitch Chat'i | 5.000 kişilik yayın izleyicisi | Yayının tek fedakar modaratörü | Yayıncı & chat dinamikleri |
| 4 | Hatay Döner Ustası | 2 rastgele yaya | Mahallenin son gerçek Hatay dönercisi & yayık ayranı | Sokak lezzeti kırmızı çizgisi |
| 5 | RTX 5090 Oyun Kasası | 3 kişi | 36 ay taksitle yeni alınmış canavar PC | Oyuncu donanım trajedisi |
| 6 | Nostaljik Discord Sunucusu | 5 kişi | 2016'dan kalma 10 yıllık ses arşivi olan sunucu diski | Gamer dostlukları & anılar |
| 7 | Sarı Taksi vs Martı TAG | Yolcu almayan 1 sarı taksi | 5 Martı TAG kullanıcısı | İstanbul ulaşım kaosu |
| 8 | Tombiş Sokak Kedisi | 1 sıradan insan | Kaldırımda güneşlenen tombul sokak kedisi | Türk halkının kedi hassasiyeti |
| 9 | Kurtlar Vadisi Arşivi | 4 kişi | Kurtlar Vadisi ilk 97 bölümün 4K tek orijinal kaseti | Kült dizi mirası |
| 10 | Final Gecesi Not Çıkaranı | Sınavdan kalacak 5 hayta öğrenci | Tüm sınıfı geçiren o tek çalışkan notçu | Üniversite vize/final dramı |
| 11 | Bizzat Kendin | 5 yabancı insan | Kolu tutan sen (kendi fedakarlığın) | Saf fedakarlık testi |
| 12 | Kolsuz Takım Arkadaşı | 3 kişi | Rank maçında 0/15 giden kolsuz kanka | Dereceli maç öfkesi |
| 13 | 100 Milyon TL Rüşvet | Raydaki zengin baron | 1 masum öğrenci (Baron sana 100M TL teklif eder) | Para vs vicdan |
| 14 | Zaman Yolculuğu | Şu an rayda olan 1 kişi | 50 yıl sonra doğacak 10 kişi | Gelecek nesil etik paradoksu |
| 15 | Simülasyon & Kod Satırı | 5 kişi (hepsi birer kod satırı) | 1 NPC kodu (Özgür irade illüzyonu) | Meta-felsefi final |

---

## 4. Teknik Mimari & Bileşen Yapısı

```
┌─────────────────────────────────────────────────────────────┐
│                          App.tsx                            │
│  (Theme, Sound Toggle, GameState, Active Question Index)   │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
┌──────────────▼──────────────┐ ┌──────────────▼──────────────┐
│        TrolleyHeader        │ │        TrolleyScene         │
│  - Progress (X/15)          │ │  - Canvas / SVG Vector Track│
│  - Kill Counter             │ │  - Moving Nostalgic Tram    │
│  - Audio Mute / Unmute      │ │  - Interactive Lever & Fork │
│  - Theme Mode Toggle        │ │  - Obstacle Sprites / Icons │
└─────────────────────────────┘ └──────────────┬──────────────┘
                                               │
                                ┌──────────────▼──────────────┐
                                │       TrolleyControls       │
                                │  - "Hiçbir Şey Yapma"       │
                                │  - "Kolu Çek"               │
                                │  - Lever Pull Animation     │
                                └──────────────┬──────────────┘
                                               │
                                ┌──────────────▼──────────────┐
                                │        ResultOverlay        │
                                │  - % Community Votes        │
                                │  - Turkish Meme Reaction    │
                                │  - Next Question Button     │
                                └──────────────┬──────────────┘
                                               │
                                ┌──────────────▼──────────────┐
                                │        SummaryReport        │
                                │  - Moral Archetype & Title  │
                                │  - Total Kills & Damage     │
                                │  - Detailed Breakdown       │
                                │  - Copy / Share to Chat     │
                                │  - Restart Game             │
                                └─────────────────────────────┘
```

### Ses Sentezi (Web Audio API)
Harici dosya indirme gecikmesini ve bozuk link riskini önlemek için yerel `AudioContext` kullanılarak:
- **Tekerlek & Ray Sesi**: Düşük frekanslı ritmik osilatör döngüsü.
- **Kolu Çekme Sesi**: Mekanik metalik klik ve mandal sesi.
- **Tramvay Zili**: Klasik nostaljik çift vuruşlu çan tınlaması ("çang çang").
- **Kaza / Çarpma Sesi**: Komik çizgi film bas darbesi ve tiz rezonans.
- **Sonuç Açılma Sesi**: Başarı / fanfar akoru.

---

## 5. Doğrulama ve Test Adımları

1. **İkilem Akışı**: 1'den 15'e kadar tüm aşamaların butonlar ve kol mekanizmasıyla eksiksiz ilerlemesi.
2. **Animasyon ve Fizik**: Kol çekildiğinde makas yönünün görsel olarak değişmesi, tramvayın belirlenen raya sapması ve durması.
3. **İstatistik ve Topluluk Karşılaştırması**: Her aşamada yüzdelerin doğru yansıtılması ve sonuç ekranında tutarlı toplam çıkarılması.
4. **Mobil ve Masaüstü Uyumu**: Dokunmatik cihazlarda ve geniş ekranlarda responsive SVG görünümü, minimum 44px dokunma alanları.
5. **Derleme Kontrolü**: `compile_applet` ile TypeScript ve CSS doğrulaması.
