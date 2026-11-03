/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Dilemma } from '../types.ts';

export const ORIGINAL_DILEMMAS: Dilemma[] = [
  // ==========================================
  // NEAL.FUN ORİJİNAL İKİLEMLERİ (16 SEVİYE)
  // ==========================================
  {
    id: 1,
    title: '1. İkilem: Klasik Tramvay (The Original)',
    campaignLabel: 'Orijinal Seviye 1',
    question:
      'Eyvah! Bir tramvay raylara bağlı 5 masum insana doğru ilerliyor. Kolu çekerek tramvayı diğer raya saptırabilir ve onun yerine 1 kişiyi ezmesini sağlayabilirsin. Ne yaparsın?',
    straightTrack: {
      label: '5 Masum İnsan',
      count: 5,
      entityType: 'people',
      description: 'Raylara bağlanmış 5 kişi',
      isHuman: true,
      monetaryValueTL: 0,
    },
    divertedTrack: {
      label: '1 Masum İnsan',
      count: 1,
      entityType: 'people',
      description: 'Yan rayda tek başına bağlı 1 kişi',
      isHuman: true,
      monetaryValueTL: 0,
    },
    straightActionLabel: 'Hiçbir Şey Yapma',
    divertedActionLabel: 'Kolu Çek',
    straightCommentary:
      'Kolu çekmeyerek olaya müdahil olmadın. 5 kişi gitti ama vicdanen "cinayeti ben işlemedim, tramvay yaptı" dedin.',
    divertedCommentary:
      'Klasik faydacılık kazandı. 5 kişinin hayatını kurtarmak için 1 kişiyi feda etmeyi göze aldın.',
    chatReaction: 'Ahlak felsefesinin en temel sorusuyla başladın.',
    twitchEmote: '5HEAD',
  },
  {
    id: 2,
    title: '2. İkilem: Dört Kişi (Four People)',
    campaignLabel: 'Orijinal Seviye 2',
    question:
      'Bir tramvay raydaki 5 kişiye doğru gidiyor. Kolu çekersen tramvay yan raya sapacak ve orada bağlı duran 4 kişiyi ezecek. Ne yaparsın?',
    straightTrack: {
      label: '5 Masum İnsan',
      count: 5,
      entityType: 'people',
      description: 'Ana raydaki 5 kişi',
      isHuman: true,
      monetaryValueTL: 0,
    },
    divertedTrack: {
      label: '4 Masum İnsan',
      count: 4,
      entityType: 'people',
      description: 'Yan raydaki 4 kişi',
      isHuman: true,
      monetaryValueTL: 0,
    },
    straightActionLabel: 'Hiçbir Şey Yapma (5 Kişi)',
    divertedActionLabel: 'Kolu Çek (4 Kişi)',
    straightCommentary:
      'Sadece 1 can farkı için makasa el sürmek istemedin. Eylemsizlik bazen en zor karardır.',
    divertedCommentary:
      'Matematik matematiktir: 5 büyüktür 4. Net 1 insan hayatı kar ettin.',
    chatReaction: '1 kişi için bile makasa el uzatıldı.',
    twitchEmote: '5HEAD',
  },
  {
    id: 3,
    title: '3. İkilem: Ömür Boyu Birikim (Life Savings)',
    campaignLabel: 'Orijinal Seviye 3',
    question:
      'Tramvay 5 kişiye doğru gidiyor. Kolu çekersen tramvay yan raya sapacak; kimse ölmeyecek ancak raydaki çelik kasada duran tüm hayat birikimin ve paran un ufak olacak. Ne yaparsın?',
    straightTrack: {
      label: '5 Masum İnsan',
      count: 5,
      entityType: 'people',
      description: 'Raylarda bağlı 5 insan',
      isHuman: true,
      monetaryValueTL: 0,
    },
    divertedTrack: {
      label: 'Ömür Boyu Birikimin',
      count: 1,
      entityType: 'savings',
      description: 'Yıllarca yemeyip içmeyip biriktirdiğin tüm servetin',
      isHuman: false,
      monetaryValueTL: 2500000,
    },
    straightActionLabel: 'Parayı Koru (Düz Git)',
    divertedActionLabel: 'İnsanları Kurtar (Kolu Çek)',
    straightCommentary:
      'Parayı canın önüne koydun. Artık zenginsin ama o 5 kişinin hayaleti cüzdanından çıkmayacak.',
    divertedCommentary:
      'Meteliksiz kaldın ama 5 insan evine sağ salim döndü. Para yeniden kazanılır, can kazanılmaz.',
    chatReaction: 'Cebin boşaldı ama vicdanın rahat.',
    twitchEmote: '5HEAD',
  },
  {
    id: 4,
    title: '4. İkilem: Mona Lisa Tablosu (Priceless Painting)',
    campaignLabel: 'Orijinal Seviye 5',
    question:
      'Tramvay 5 kişiye doğru gidiyor. Kolu çekersen yan raydaki, Louvre müzesinden taşınan ve dünyada tek olan orijinal Mona Lisa tablosunu un ufak edecek. İnsanlık mirası mı, 5 yabancı mı?',
    straightTrack: {
      label: '5 Masum İnsan',
      count: 5,
      entityType: 'people',
      description: 'Raylarda bağlı 5 kişi',
      isHuman: true,
      monetaryValueTL: 0,
    },
    divertedTrack: {
      label: 'Orijinal Mona Lisa Tablosu',
      count: 1,
      entityType: 'painting',
      description: 'Leonardo da Vinci’nin 500 yıllık paha biçilmez başyapıtı',
      isHuman: false,
      monetaryValueTL: 25000000,
    },
    straightActionLabel: 'Tabloyu Koru (5 Kişiyi Bırak)',
    divertedActionLabel: 'İnsanları Kurtar (Tabloyu Ez)',
    straightCommentary:
      'Sanat tarihini 5 faninin önünde tuttun. Mona Lisa gülümsüyor ama insanlık ağlıyor.',
    divertedCommentary:
      '500 yıllık dünya mirası parçalandı ama 5 insan nefes almaya devam ediyor.',
    chatReaction: 'Sanat tarihçileri şokta ama 5 kişi hayatta.',
    twitchEmote: '5HEAD',
  },
  {
    id: 5,
    title: '5. İkilem: Uykudaki İnsanlar (Sleeping People)',
    campaignLabel: 'Orijinal Seviye 8',
    question:
      'Tramvay derin uykuda olan ve çarpmayı asla hissetmeyecek 5 kişiye doğru gidiyor. Kolu çekersen, yan rayda gözleri açık ve her şeyin farkında olan 1 kişiyi ezecek.',
    straightTrack: {
      label: 'Uykudaki 5 İnsan',
      count: 5,
      entityType: 'sleepers',
      description: 'Mışıl mışıl uyuyan, acı hissetmeyecek 5 kişi',
      isHuman: true,
      monetaryValueTL: 0,
    },
    divertedTrack: {
      label: 'Uyanık 1 İnsan',
      count: 1,
      entityType: 'people',
      description: 'Korkuyla tramvayın gelişini izleyen uyanık 1 kişi',
      isHuman: true,
      monetaryValueTL: 0,
    },
    straightActionLabel: 'Uykudakileri Ez (Hiçbir Şey Yapma)',
    divertedActionLabel: 'Uyanık Kişiyi Ez (Kolu Çek)',
    straightCommentary:
      'Acı çekmeyecek olmalarını gerekçe gösterdin. Uyurken gitmek mi daha adil, uyanıkken mi?',
    divertedCommentary:
      'Acı çekseler de çekmeseler de 5 hayat 1 hayattan büyüktür dedin.',
    chatReaction: 'Acının şiddeti can sayısından önemli midir?',
    twitchEmote: '5HEAD',
  },
  {
    id: 6,
    title: '6. İkilem: En Yakın Arkadaşın (Best Friend)',
    campaignLabel: 'Orijinal Seviye 12',
    question:
      'Tramvay çocukluktan beri can ciğer olduğun en yakın arkadaşına doğru gidiyor. Kolu çekersen tramvay yan raya sapacak ve hiç tanımadığın 5 yabancıyı ezecek.',
    straightTrack: {
      label: 'En Yakın Arkadaşın',
      count: 1,
      entityType: 'bestfriend',
      description: 'Tüm sırlarını bilen çocukluk can dostun',
      isHuman: true,
      monetaryValueTL: 0,
    },
    divertedTrack: {
      label: '5 Yabancı İnsan',
      count: 5,
      entityType: 'people',
      description: 'Hiç tanışmadığın 5 yabancı',
      isHuman: true,
      monetaryValueTL: 0,
    },
    straightActionLabel: 'Arkadaşını Bırak (Yabancıları Kurtar)',
    divertedActionLabel: 'Kolu Çek (Arkadaşını Kurtar)',
    straightCommentary:
      'Kişisel sevgini genel ahlak kuralının altına koydun. Arkadaşını feda ettin ama 5 kişiyi kurtardın.',
    divertedCommentary:
      'Kabilecilik ve dostluk galip geldi. 5 yabancı gitti ama can dostun hayatta kaldı.',
    chatReaction: 'Vefa borcu mu, soğuk faydacılık mı?',
    twitchEmote: 'SADGE',
  },
  {
    id: 7,
    title: '7. İkilem: Gözlüğü Unuttun (Can’t See)',
    campaignLabel: 'Orijinal Seviye 13',
    question:
      'Tramvay 5 kişiye doğru gidiyor. Kolu çekip 1 kişiyi ezebilirsin; ancak evden çıkarken gözlüğünü unuttun ve her yer bulanık. Kime ve neye çarptığını tam olarak göremiyorsun.',
    straightTrack: {
      label: 'Bulanık Görünen 5 Silüet',
      count: 5,
      entityType: 'glasses',
      description: 'Bulanık görünen 5 insan karaltısı',
      isHuman: true,
      monetaryValueTL: 0,
    },
    divertedTrack: {
      label: 'Bulanık Görünen 1 Silüet',
      count: 1,
      entityType: 'glasses',
      description: 'Yan raydaki tek başına karaltı',
      isHuman: true,
      monetaryValueTL: 0,
    },
    straightActionLabel: 'Müdahale Etme (Bulanık Bırak)',
    divertedActionLabel: 'Kolu Çek (Körleme Makas)',
    straightCommentary:
      'Görmediğin bir durumda sorumluluk almak istemedin. Belirsizlik seni durdurdu.',
    divertedCommentary:
      'Gözün görmese de aklın 1 silüeti 5 silüete tercih etti.',
    chatReaction: 'Gözlük olmayınca etik de flulaşıyor.',
    twitchEmote: '5HEAD',
  },
  {
    id: 8,
    title: '8. İkilem: Kuzenler Paradoksu (Cousins)',
    campaignLabel: 'Orijinal Seviye 14',
    question:
      'Tramvay çok sevdiğin 1 öz birinci derece kuzenine doğru gidiyor. Kolu çekersen yan raydaki 3 adet ikinci derece uzaktan kuzenine çarpacak. Akrabalık bağlarını nasıl tartarsın?',
    straightTrack: {
      label: '1 Öz Birinci Derece Kuzen',
      count: 1,
      entityType: 'cousins',
      description: 'Aynı evde büyüdüğün öz kuzenin',
      isHuman: true,
      monetaryValueTL: 0,
    },
    divertedTrack: {
      label: '3 İkinci Derece Kuzen',
      count: 3,
      entityType: 'cousins',
      description: 'Yılda bir bayramda gördüğün uzaktan kuzenler',
      isHuman: true,
      monetaryValueTL: 0,
    },
    straightActionLabel: 'Öz Kuzeni Bırak (3 Kişiyi Koru)',
    divertedActionLabel: 'Kolu Çek (3 Uzak Kuzeni Ez)',
    straightCommentary:
      'Akraba yakınlığı yerine kişi sayısını seçtin. Aile meclisinde konu tartışılacak.',
    divertedCommentary:
      'Öz kuzenini kurtardın ama bayram ziyaretlerinde sana biraz soğuk davranacaklar.',
    chatReaction: 'Akraba whatsapp grupları ayağa kalktı.',
    twitchEmote: 'KEKW',
  },
  {
    id: 9,
    title: '9. İkilem: Yaş Paradoksu (Age: Baby vs Elderly)',
    campaignLabel: 'Orijinal Seviye 15',
    question:
      'Tramvay hayatlarının son evresindeki 5 yaşlı insana doğru gidiyor. Kolu çekersen, önünde koca bir hayat olan 1 bebeği ezecek. Yaşanacak potansiyel yıllar mı, fani can sayısı mı?',
    straightTrack: {
      label: '5 Yaşlı İnsan (85+ Yaş)',
      count: 5,
      entityType: 'elderly',
      description: 'Hayatlarının son demlerindeki 5 kıymetli yaşlı',
      isHuman: true,
      monetaryValueTL: 0,
    },
    divertedTrack: {
      label: '1 Masum Bebek',
      count: 1,
      entityType: 'baby',
      description: 'Henüz dünyayı tanımamış bir bebek',
      isHuman: true,
      monetaryValueTL: 0,
    },
    straightActionLabel: 'Yaşlıları Ez (Bebeği Kurtar)',
    divertedActionLabel: 'Bebeği Ez (Yaşlıları Kurtar)',
    straightCommentary:
      'Kalan yaşam süresi ve geleceği önceledin. Bebeğe 80 yıllık bir ömür bağışladın.',
    divertedCommentary:
      '5 canın toplam değerini 1 cana feda edemedin. En ağır etik ikilemlerden biri.',
    chatReaction: 'Kalan ömür hesabı mı, insan hakkı mı?',
    twitchEmote: '5HEAD',
  },
  {
    id: 10,
    title: '10. İkilem: Kendi Klonların (Clones)',
    campaignLabel: 'Orijinal Seviye 16',
    question:
      'Tramvay genetik olarak seninle birebir aynı olan, senin anılarına ve bilincine sahip 5 klonuna doğru gidiyor. Kolu çekersen yan raydaki 1 masum yabancıyı ezecek.',
    straightTrack: {
      label: 'Senin 5 Klonun',
      count: 5,
      entityType: 'clone',
      description: 'Senin gibi düşünen, senin gibi hisseden 5 klonun',
      isHuman: true,
      monetaryValueTL: 0,
    },
    divertedTrack: {
      label: '1 Masum Yabancı',
      count: 1,
      entityType: 'people',
      description: 'Klon olmayan gerçek bir insan',
      isHuman: true,
      monetaryValueTL: 0,
    },
    straightActionLabel: 'Klonları Ez (Yabancıyı Kurtar)',
    divertedActionLabel: 'Yabancıyı Ez (Klonlarını Kurtar)',
    straightCommentary:
      'Klonların kopyalanabilir olduğunu düşünüp gerçek insanı kurtardın.',
    divertedCommentary:
      'Kendi benliğini 5 katı korudun. Artık dünyada 5 tane sen var.',
    chatReaction: 'Narsizm mi yoksa biyolojik dayanışma mı?',
    twitchEmote: 'KEKW',
  },
  {
    id: 11,
    title: '11. İkilem: Gizemli Kutu (Mystery Box)',
    campaignLabel: 'Orijinal Seviye 17',
    question:
      'Tramvay, içinde %50 ihtimalle 2 insan olan bir kutuya doğru gidiyor. Kolu çekersen, içinde %10 ihtimalle 10 insan olan başka bir kutuyu ezecek. Matematiksel risk mi, kesinlik mi?',
    straightTrack: {
      label: 'Kutu A (%50 İhtimalle 2 İnsan)',
      count: 2,
      entityType: 'mysterybox',
      description: 'Beklenen değer: 1 insan kaybı (yarı yarıya şans)',
      isHuman: true,
      monetaryValueTL: 0,
    },
    divertedTrack: {
      label: 'Kutu B (%10 İhtimalle 10 İnsan)',
      count: 10,
      entityType: 'mysterybox',
      description: 'Beklenen değer: 1 insan kaybı (%10 felaket riski)',
      isHuman: true,
      monetaryValueTL: 0,
    },
    straightActionLabel: 'Kutu A’yı Ez (Hiçbir Şey Yapma)',
    divertedActionLabel: 'Kutu B’yi Ez (Kolu Çek)',
    straightCommentary:
      '%10 ihtimalli büyük felaket riskini göze almak istemedin.',
    divertedCommentary:
      '%90 ihtimalle kutunun boş çıkacağını umarak kumar oynadın.',
    chatReaction: 'Olasılık teorisi vs ahlaki risk.',
    twitchEmote: '5HEAD',
  },
  {
    id: 12,
    title: '12. İkilem: Bilinçli Robot (Sentient Robot)',
    campaignLabel: 'Orijinal Seviye 18',
    question:
      'Tramvay acıyı, sevinci ve korkuyu tıpkı bir insan gibi hissedebilen 5 bilinçli robota doğru gidiyor. Kolu çekersen yan raydaki 1 biyolojik insanı ezecek. Bilinç silikonda olunca değersizleşir mi?',
    straightTrack: {
      label: '5 Bilinçli Duyarlı Robot',
      count: 5,
      entityType: 'robot',
      description: 'Acıyı hisseden 5 yapay zeka varlığı',
      isHuman: false,
      monetaryValueTL: 500000,
    },
    divertedTrack: {
      label: '1 Biyolojik İnsan',
      count: 1,
      entityType: 'people',
      description: 'Biyolojik 1 insan',
      isHuman: true,
      monetaryValueTL: 0,
    },
    straightActionLabel: 'Robotları Ez (İnsanı Kurtar)',
    divertedActionLabel: 'İnsanı Ez (5 Robotu Kurtar)',
    straightCommentary:
      'Biyolojik türdaşlığını üstün tuttun. Robotlar parçalandı ama insan kurtuldu.',
    divertedCommentary:
      'Bilinç bilincidir dedin, yapay zekanın acısını biyolojiden ayırt etmedin.',
    chatReaction: 'Yapay zekanın gelecekteki mahkemesinde bu karar çıkacak.',
    twitchEmote: '5HEAD',
  },
  {
    id: 13,
    title: '13. İkilem: Maddi Hasar (Economic Damage)',
    campaignLabel: 'Orijinal Seviye 19',
    question:
      'Tramvay ray üzerindeki toplam değeri 900.000$ olan 3 boş tramvaya doğru gidiyor. Kolu çekersen yan raydaki 300.000$ değerindeki 1 boş tramvayı ezecek. İçlerinde hiç insan yok. Ne yaparsın?',
    straightTrack: {
      label: '3 Boş Tramvay (900.000$)',
      count: 3,
      entityType: 'emptytrolley',
      description: 'Şehir belediyesine ait 3 yeni tramvay aracı',
      isHuman: false,
      monetaryValueTL: 30000000,
    },
    divertedTrack: {
      label: '1 Boş Tramvay (300.000$)',
      count: 1,
      entityType: 'emptytrolley',
      description: 'Yan raydaki tek tramvay aracı',
      isHuman: false,
      monetaryValueTL: 10000000,
    },
    straightActionLabel: 'Bırak 3 Tramvay Çarpışsın',
    divertedActionLabel: 'Kolu Çek (1 Tramvayı Ez)',
    straightCommentary:
      'Raylara dokunmadın ve kamu bütçesine devasa bir zarar verdin.',
    divertedCommentary:
      'Zararın neresinden dönersen kardır. 600.000 dolar tasarruf ettin.',
    chatReaction: 'Saf lojistik ve bütçe optimizasyonu.',
    twitchEmote: '5HEAD',
  },
  {
    id: 14,
    title: '14. İkilem: Zararsız Şaka? (Harmless Prank?)',
    campaignLabel: 'Orijinal Seviye 22',
    question:
      'Rayların üzerinde hiçbir insan veya engel yok. Sırf tramvay vatmanını şaşırtmak ve küçük bir şaka yapmak için kolu çekip tramvayı yan raya saptırır mısın?',
    straightTrack: {
      label: 'Boş Düz Ray',
      count: 0,
      entityType: 'prank',
      description: 'Rayda hiçbir engel veya canlı yok',
      isHuman: false,
      monetaryValueTL: 0,
    },
    divertedTrack: {
      label: 'Boş Yan Ray (Şaka)',
      count: 0,
      entityType: 'prank',
      description: 'Vatmanın planlanmamış sapağa girmesi',
      isHuman: false,
      monetaryValueTL: 0,
    },
    straightActionLabel: 'Kolu Çekme (Düz Gitsin)',
    divertedActionLabel: 'Kolu Çek (Vatmana Şaka Yap)',
    straightCommentary:
      'Ciddiyetini korudun ve vatmanın mesaisini aksatmadın.',
    divertedCommentary:
      'Kolu çektin! Vatman ani makas dönüşüyle çayını döktü ama kimseye bir şey olmadı.',
    chatReaction: 'Trollemek ruhumuzda var KEKW.',
    twitchEmote: 'KEKW',
  },
  {
    id: 15,
    title: '15. İkilem: Ezeli Düşmanın (Worst Enemy)',
    campaignLabel: 'Orijinal Seviye 25',
    question:
      'Tramvay hayatın boyunca sana en çok kötülük yapan, en nefret ettiğin baş düşmanına doğru gidiyor. Kolu çekersen tramvay boş raya sapacak ve düşmanın kurtulacak. Hiçbir şey yapmazsan düşmanın ezilecek ve bunu kimse asla bilmeyecek.',
    straightTrack: {
      label: 'En Büyük Düşmanın',
      count: 1,
      entityType: 'enemy',
      description: 'Sana hayatı zindan etmiş o tek kişi',
      isHuman: true,
      monetaryValueTL: 0,
    },
    divertedTrack: {
      label: 'Boş Güvenli Ray',
      count: 0,
      entityType: 'prank',
      description: 'Kimsenin olmadığı güvenli yan yol',
      isHuman: false,
      monetaryValueTL: 0,
    },
    straightActionLabel: 'Düşmanı Bırak (Ezilsin)',
    divertedActionLabel: 'Düşmanı Kurtar (Kolu Çek)',
    straightCommentary:
      'İntikam soğuk yenen bir yemektir dedin. Kimse bilmese de sen bileceksin.',
    divertedCommentary:
      'Nefretini ahlakının altına gömdün. En büyük düşmanının hayatını kurtardın.',
    chatReaction: 'İntikam arzusu vs saf ahlak sınavı.',
    twitchEmote: 'MONKAS',
  },
  {
    id: 16,
    title: '16. İkilem: Ömürden Eksilme (Lifespan Trade-off)',
    campaignLabel: 'Orijinal Seviye 26',
    question:
      'Tramvay bir büyü/lanet makinesi: Ana yolda giderse 1 kişinin kalan ömründen tam 50 yıl eksiltecek. Kolu çekersen, yan raydaki 5 kişinin ömründen 10’ar yıl eksiltecek. Toplam kayıp aynı (50 yıl).',
    straightTrack: {
      label: '1 Kişiden -50 Yıl Ömür',
      count: 1,
      entityType: 'lifespan',
      description: '1 kişinin hayatını neredeyse tamamen bitirmek',
      isHuman: true,
      monetaryValueTL: 0,
    },
    divertedTrack: {
      label: '5 Kişiden -10’ar Yıl Ömür',
      count: 5,
      entityType: 'lifespan',
      description: '5 kişinin ömründen birer parça fedakarlık',
      isHuman: true,
      monetaryValueTL: 0,
    },
    straightActionLabel: 'Zararı 1 Kişiye Yükle (-50 Yıl)',
    divertedActionLabel: 'Zararı 5 Kişiye Dağıt (-10 Yıl)',
    straightCommentary:
      '5 kişinin ömrüne dokunmadın ama 1 kişiyi erken ölüme mahkum ettin.',
    divertedCommentary:
      'Kolu çektin ve yükü paylaştırdın. Kimse hemen ölmedi ama herkes biraz kaybetti.',
    chatReaction: 'Kolektif yük paylaşımı mı, tek kurban mı?',
    twitchEmote: '5HEAD',
  },
];
