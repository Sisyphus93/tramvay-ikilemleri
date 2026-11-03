/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Dilemma } from '../types.ts';

export const BONUS_DILEMMAS: Dilemma[] = [
  // ==========================================
  // TÜRK İNTERNET & OYUN KÜLTÜRÜ BONUSLARI (14 ÖZEL SEVİYE)
  // ==========================================
  {
    id: 17,
    isBonus: true,
    campaignLabel: '⭐ Türkiye Kültür Bonusu 1 / 14',
    title: '17. İkilem: Steam Kütüphanesi & Dolar Kuru',
    question:
      'Tramvay raylara bağlı 4 masum insana doğru hızla ilerliyor. Kolu çekersen yan raydaki, içerisinde 800 adet oyun, binlerce saatlik kayıt ve Türkiye’nin dolara geçişinden önceki tüm birikiminin bulunduğu 15 yıllık ana Steam hesabını ve diskini un ufak edecek.',
    straightTrack: {
      label: '4 Masum İnsan',
      count: 4,
      entityType: 'people',
      description: 'Ana raydaki 4 kişi',
      isHuman: true,
      monetaryValueTL: 0,
    },
    divertedTrack: {
      label: '800 Oyunlu 15 Yıllık Steam Hesabı',
      count: 1,
      entityType: 'steam',
      description: 'Dolara geçiş öncesi TL ile toplanmış paha biçilmez kütüphane',
      isHuman: false,
      monetaryValueTL: 350000,
    },
    straightActionLabel: 'Steam Kütüphanesini Koru (4 Kişi Gitsin)',
    divertedActionLabel: 'İnsanları Kurtar (Hesabı Feda Et)',
    straightCommentary:
      'Steam kütüphaneni kurtardın ama insanlığını kaybettin. O dolara geçmeden önceki fiyatlar bir daha geri gelmezdi zaten.',
    divertedCommentary:
      'Kolu çektin ve 800 oyunluk kütüphanen silindi. Gaben arkandan baktı, ama 4 insan hayatta kaldı.',
    chatReaction: 'Chat: "Dolara geçtikten sonra o kütüphane milli servetti be abi KEKW"',
    twitchEmote: 'SADGE',
  },
  {
    id: 18,
    isBonus: true,
    campaignLabel: '⭐ Türkiye Kültür Bonusu 2 / 14',
    title: '18. İkilem: 5.000 Kişilik Twitch Chat’i vs Tek Fedakar Mod',
    question:
      'Tramvay yayının en fedakar, 7/24 spam temizleyen ve ban atan tek aktif moderatörüne doğru gidiyor. Kolu çekersen yan raydaki 5.000 kişilik çılgın Twitch chat topluluğunu ezecek ve yayın anında ölüm sessizliğine gömülecek.',
    straightTrack: {
      label: 'Tek Fedakar Moderatör',
      count: 1,
      entityType: 'moderator',
      description: 'Maaşsız, uykusuz, yayını ayakta tutan tek yeşil kılıçlı mod',
      isHuman: true,
      monetaryValueTL: 0,
    },
    divertedTrack: {
      label: '5.000 Kişilik Twitch Chat Topluluğu',
      count: 5,
      entityType: 'streamer',
      description: 'Yayın boyunca spam atan 5.000 cano',
      isHuman: true,
      monetaryValueTL: 0,
    },
    straightActionLabel: 'Chati Koru (Moderatörü Bırak)',
    divertedActionLabel: 'Moderatörü Kurtar (Chat Sussun)',
    straightCommentary:
      'Chati kurtardın ama mod gitti. Artık o spamlara kim yetişecek? Chat anarşiye teslim oldu.',
    divertedCommentary:
      'Kolu çektin ve modu kurtardın! Chat gitti, yayın ıssızlaştı ama en sadık askerin hala yanında.',
    chatReaction: 'Chat: "Moderatörün kılıcı kırıldı, ban yetkisi hakka yürüdü NotLikeThis"',
    twitchEmote: 'NOTLIKETHIS',
  },
  {
    id: 19,
    isBonus: true,
    campaignLabel: '⭐ Türkiye Kültür Bonusu 3 / 14',
    title: '19. İkilem: Mahallenin Son Gerçek Hatay Döner Ustası',
    question:
      'Tramvay 2 masum yayaya doğru hızla gidiyor. Kolu çekersen yan raydaki, mahallenin son hakiki soslu Hatay dönerini kesen efsanevi döner ustasını ve yayık ayran tezgahını ezecek.',
    straightTrack: {
      label: '2 Masum Yaya',
      count: 2,
      entityType: 'people',
      description: 'Kaldırımda yürüyen 2 vatandaş',
      isHuman: true,
      monetaryValueTL: 0,
    },
    divertedTrack: {
      label: 'Hakiki Hatay Döner Ustası & Ayran',
      count: 1,
      entityType: 'doner',
      description: 'Özel sarımsaklı mayonezli sosun son sır küpü usta',
      isHuman: true,
      monetaryValueTL: 75000,
    },
    straightActionLabel: 'Döner Ustası Yaşasın (2 Yaya Gitsin)',
    divertedActionLabel: 'Yayaları Kurtar (Dönerciyi Ez)',
    straightCommentary:
      'O döner sosunun tarifi mezara gitmesin diye 2 kişiyi feda ettin. Mide ahlaktan önce geldi.',
    divertedCommentary:
      'Kolu çektin ve yayaları kurtardın. Usta gitti, artık sadece patates dolu kuru döner yiyebilirsin.',
    chatReaction: 'Chat: "Soslu döner kırmızı çizgimizdir aga yapacak bir şey yoktu LUL"',
    twitchEmote: 'LUL',
  },
  {
    id: 20,
    isBonus: true,
    campaignLabel: '⭐ Türkiye Kültür Bonusu 4 / 14',
    title: '20. İkilem: 36 Ay Taksitli RTX 5090 Canavar PC',
    question:
      'Tramvay raydaki 3 yabancı insana doğru gidiyor. Kolu çekersen yan rayda duran, 36 ay taksitle zar zor topladığın, sıvı soğutmalı son model RTX 5090’lı canavar oyun kasasını un ufak edecek.',
    straightTrack: {
      label: '3 Masum İnsan',
      count: 3,
      entityType: 'people',
      description: 'Raylarda bağlı 3 yabancı',
      isHuman: true,
      monetaryValueTL: 0,
    },
    divertedTrack: {
      label: 'Sıvı Soğutmalı RTX 5090 PC Kasası',
      count: 1,
      entityType: 'pc',
      description: 'Daha taksiti bitmemiş, 4K 240FPS RGB canavar',
      isHuman: false,
      monetaryValueTL: 185000,
    },
    straightActionLabel: 'Bilgisayarı Koru (3 Kişi Gitsin)',
    divertedActionLabel: 'İnsanları Kurtar (Kasayı Feda Et)',
    straightCommentary:
      'RGB ışıklar sönmesin diye 3 kişiyi harcadın. Taksitini hala ödediğin PC sağlam ama vicdanın arızalı.',
    divertedCommentary:
      'Kolu çektin ve 5090 hurdaya döndü. Ağlayarak 720p entegre grafiğe geri döneceksin ama 3 can kurtuldu.',
    chatReaction: 'Chat: "36 ay taksit biter miydi be abi, elin koldan gitmedi anlıyoruz BibleThump"',
    twitchEmote: 'BIBLETHUMP',
  },
  {
    id: 21,
    isBonus: true,
    campaignLabel: '⭐ Türkiye Kültür Bonusu 5 / 14',
    title: '21. İkilem: 2016’dan Kalma Nostaljik Discord Sunucusu',
    question:
      'Tramvay 5 masum kişiye doğru ilerliyor. Kolu çekersen yan raydaki, lise yıllarından kalma tüm dostlarınla sabahlara kadar konuştuğun, eski fotoğraflar ve 10 yıllık ses kayıtlarıyla dolu sunucunun ana veri diskini yok edecek.',
    straightTrack: {
      label: '5 Masum Kişi',
      count: 5,
      entityType: 'people',
      description: 'Raylardaki 5 masum',
      isHuman: true,
      monetaryValueTL: 0,
    },
    divertedTrack: {
      label: '10 Yıllık Nostaljik Discord Veri Diski',
      count: 1,
      entityType: 'harddrive',
      description: 'Gruptan ayrılanların bile ses kayıtlarının olduğu altın arşiv',
      isHuman: false,
      monetaryValueTL: 100000,
    },
    straightActionLabel: 'Anıları Koru (5 Kişi Gitsin)',
    divertedActionLabel: 'İnsanları Kurtar (Diski Ez)',
    straightCommentary:
      'Nostalji insan hayatından üstün geldi. Artık o Discord odasında o 5 kişinin hayaletiyle oturursun.',
    divertedCommentary:
      'Kolu çektin ve anılar buharlaştı. Dostluklar kalpte yaşar dedin ve 5 insanı hayata bağladın.',
    chatReaction: 'Chat: "2016 Discord günleri geri gelmez ama can geri gelmezdi, helal olsun FeelsStrongMan"',
    twitchEmote: 'POG',
  },
  {
    id: 22,
    isBonus: true,
    campaignLabel: '⭐ Türkiye Kültür Bonusu 6 / 14',
    title: '22. İkilem: Sarı Taksi vs Martı TAG',
    question:
      'Tramvay yağmur altında müşteri seçip "karşıya geçmem" diyen 1 sarı taksiye doğru gidiyor. Kolu çekersen yan raydaki, makul fiyata yolculuk yapan 5 masum Martı TAG kullanıcısını ezecek.',
    straightTrack: {
      label: 'Yolcu Seçen 1 Sarı Taksi',
      count: 1,
      entityType: 'taxi',
      description: 'Yağmurda kapıları kitleyip turist arayan taksici',
      isHuman: true,
      monetaryValueTL: 850000,
    },
    divertedTrack: {
      label: '5 Martı TAG Yolcusu',
      count: 5,
      entityType: 'marti',
      description: 'Evine gitmeye çalışan 5 masum vatandaş',
      isHuman: true,
      monetaryValueTL: 0,
    },
    straightActionLabel: 'Hiçbir Şey Yapma (Taksi Ezilsin)',
    divertedActionLabel: 'Taksiyi Kurtar (5 TAG Yolcusunu Ez)',
    straightCommentary:
      'Kolu ellemedin ve tramvay sarı taksiyi biçti. İstanbul halkı içten içe derin bir "oh" çekti.',
    divertedCommentary:
      'Kolu çektin ve taksiciyi kurtarıp 5 TAG yolcusunu feda ettin. Taksici sana "kısa mesafe almam" diyip bastı gitti.',
    chatReaction: 'Chat: "Karşıya geçmem diyen taksicinin tramvay karşısındaki dramı KEKW"',
    twitchEmote: 'KEKW',
  },
  {
    id: 23,
    isBonus: true,
    campaignLabel: '⭐ Türkiye Kültür Bonusu 7 / 14',
    title: '23. İkilem: Kaldırımda Güneşlenen Tombiş Sokak Kedisi',
    question:
      'Tramvay rayda bağlı 1 sıradan insana doğru ilerliyor. Kolu çekersen yan raydaki taşın üzerinde mayışmış güneşlenen, mahallenin sevgilisi tombul tekir sokak kedisini ezecek. Türk milletinin kedi hassasiyeti testte!',
    straightTrack: {
      label: '1 Sıradan İnsan',
      count: 1,
      entityType: 'people',
      description: 'Raylara bağlanmış sıradan bir yaya',
      isHuman: true,
      monetaryValueTL: 0,
    },
    divertedTrack: {
      label: 'Tombiş Tekir Sokak Kedisi',
      count: 1,
      entityType: 'cat',
      description: 'Dünyadan habersiz mırıldayan kedi',
      isHuman: false,
      monetaryValueTL: 0,
    },
    straightActionLabel: 'Kediyi Koru (İnsan Gitsin)',
    divertedActionLabel: 'İnsanı Kurtar (Kediyi Feda Et)',
    straightCommentary:
      'Kediyi korudun, insanı harcadın. Türk internetinin yazılı olmayan birinci kuralını uyguladın.',
    divertedCommentary:
      'Kolu çektin ve insan türünü seçtin. Ama mahallenin teyzeleri ve hayvanseverler ömür boyu peşini bırakmayacak.',
    chatReaction: 'Chat: "Kediye dokunulmaz aga, felsefe burada biter peepoHappy"',
    twitchEmote: 'PEEPO',
  },
  {
    id: 24,
    isBonus: true,
    campaignLabel: '⭐ Türkiye Kültür Bonusu 8 / 14',
    title: '24. İkilem: Kurtlar Vadisi İlk 97 Bölüm Orijinal Master Kaseti',
    question:
      'Tramvay 4 masum insana doğru hızla ilerliyor. Kolu çekersen yan rayda duran, Türk dizi tarihinin zirvesi Kurtlar Vadisi ilk 97 bölümün dünyadaki tek 4K sansürsüz orijinal master kasetini parçalayacak.',
    straightTrack: {
      label: '4 Masum İnsan',
      count: 4,
      entityType: 'people',
      description: 'Ana raydaki 4 kişi',
      isHuman: true,
      monetaryValueTL: 0,
    },
    divertedTrack: {
      label: 'Kurtlar Vadisi İlk 97 Bölüm 4K Master Bandı',
      count: 1,
      entityType: 'harddrive',
      description: 'Pala, Çakır, Aslan Akbey ve Karahanlı’nın tek 4K orijinal kaydı',
      isHuman: false,
      monetaryValueTL: 5000000,
    },
    straightActionLabel: 'Efsane Diziyi Koru (4 Kişi Gitsin)',
    divertedActionLabel: 'İnsanları Kurtar (Bandı Feda Et)',
    straightCommentary:
      '"Sonunu düşünen kahraman olamaz" dedin, kaseti koruyup 4 kişiyi feda ettin. Polat Alemdar selam durdu.',
    divertedCommentary:
      'Kolu çektin ve ilk 97 bölüm tarihe gömüldü. Artık sadece 360p piksel piksel YouTube yüklemeleriyle idare edeceğiz.',
    chatReaction: 'Chat: "Dostum olmaz, hasmım yaşamaz dedin kasedi feda ettin KEKW"',
    twitchEmote: '5HEAD',
  },
  {
    id: 25,
    isBonus: true,
    campaignLabel: '⭐ Türkiye Kültür Bonusu 9 / 14',
    title: '25. İkilem: Final Gecesi Not Çıkaran Tek Çalışkan Öğrenci',
    question:
      'Tramvay bütün dönem yatmış ve sabahki finalden kalacak 5 hayta üniversite öğrencisine doğru gidiyor. Kolu çekersen yan raydaki, sabaha kadar uyumayıp tüm amfiye PDF not hazırlayan o tek fedakar çalışkan öğrenciyi ezecek.',
    straightTrack: {
      label: '5 Tembel Öğrenci',
      count: 5,
      entityType: 'people',
      description: 'Sabah 9 vizesine hiç çalışmamış 5 tembel',
      isHuman: true,
      monetaryValueTL: 0,
    },
    divertedTrack: {
      label: 'PDF Not Çıkaran Çalışkan Öğrenci',
      count: 1,
      entityType: 'student',
      description: 'Amfinin tek umudu, rengarenk fosforlu kalemli fedakar genç',
      isHuman: true,
      monetaryValueTL: 0,
    },
    straightActionLabel: 'Notçuyu Koru (5 Tembel Gitsin)',
    divertedActionLabel: 'Çoğunluğu Kurtar (Notçuyu Ez)',
    straightCommentary:
      'Notçuyu korudun! 5 tembel gitti ama amfinin geleceği ve çan eğrisi kurtuldu.',
    divertedCommentary:
      'Kolu çektin ve çalışkan notçuyu ezdin. 5 tembel kurtuldu ama sabahki sınavda herkes bomboş kağıt verdi.',
    chatReaction: 'Chat: "Not çıkaran adam kutsaldır abi, ona dokunan taş olur LUL"',
    twitchEmote: 'LUL',
  },
  {
    id: 26,
    isBonus: true,
    campaignLabel: '⭐ Türkiye Kültür Bonusu 10 / 14',
    title: '26. İkilem: Bizzat Sen (Öz Fedakarlık Sınavı)',
    question:
      'Tramvay ana raydaki 5 masum yabancıya doğru ilerliyor. Yan rayda kimse yok; ancak kolu çekip tramvayı saptırabilmenin tek yolu, senin rayın üzerine atlayarak kendi bedenini siper etmen. 5 yabancı için kendini feda eder misin?',
    straightTrack: {
      label: '5 Masum Yabancı',
      count: 5,
      entityType: 'people',
      description: 'Raylardaki 5 masum yabancı',
      isHuman: true,
      monetaryValueTL: 0,
    },
    divertedTrack: {
      label: 'Bizzat Sen (Kolu Tutan Sen)',
      count: 1,
      entityType: 'yourself',
      description: 'Bu oyunun başından beri kararları veren kişi',
      isHuman: true,
      monetaryValueTL: 0,
    },
    straightActionLabel: 'Kendini Koru (5 Kişi Gitsin)',
    divertedActionLabel: 'Kendini Feda Et (5 Kişiyi Kurtar)',
    straightCommentary:
      'Can tatlıdır! Kolu çekmeyip kenarda durdun. 5 kişi gitti ama sen akşam yemeğine yetiştin.',
    divertedCommentary:
      'Kolu çektin ve kendini feda ettin! Gerçek bir efsane gibi davrandın. Saygıyla anılacaksın.',
    chatReaction: 'Chat: "Felsefeciler şok, kolu tutan adam kendini feda etti o7"',
    twitchEmote: 'FEELSGOOD',
  },
  {
    id: 27,
    isBonus: true,
    campaignLabel: '⭐ Türkiye Kültür Bonusu 11 / 14',
    title: '27. İkilem: Rank Terfi Maçında 0/15 Giden Kolsuz Kanka',
    question:
      'Tramvay 3 masum insana doğru gidiyor. Kolu çekersen yan raydaki, LoL/Valorant terfi maçında 0/15 Yasuo/Jett oynayıp sürekli surrender vermeyen ama gerçek hayatta can dostun olan kolsuz kankanı ezecek.',
    straightTrack: {
      label: '3 Masum İnsan',
      count: 3,
      entityType: 'people',
      description: 'Raylarda bağlı 3 insan',
      isHuman: true,
      monetaryValueTL: 0,
    },
    divertedTrack: {
      label: '0/15 Giden Kolsuz Takım Arkadaşı',
      count: 1,
      entityType: 'teammate',
      description: 'Ultiyi duvara atan, terfi maçını zehir eden kanka',
      isHuman: true,
      monetaryValueTL: 0,
    },
    straightActionLabel: 'Kankayı Koru (3 Kişi Gitsin)',
    divertedActionLabel: '3 Masumu Kurtar (Kankayı Feda Et)',
    straightCommentary:
      'Kankanı korudun. O terfi maçı kaybedildi, elo cehennemine düştün ama dostluk baki kaldı.',
    divertedCommentary:
      'Kolu çektin ve kolsuz kankanı feda ettin. Hem 3 kişi kurtuldu hem de maçın LP’si geri geldi.',
    chatReaction: 'Chat: "0/15 giden adam tramvayı hak etmiştir beyler tartışmayalım KEKW"',
    twitchEmote: 'KEKW',
  },
  {
    id: 28,
    isBonus: true,
    campaignLabel: '⭐ Türkiye Kültür Bonusu 12 / 14',
    title: '28. İkilem: 100 Milyon TL Rüşvet vs Vicdan',
    question:
      'Tramvay rayda bağlı zengin bir holding baronuna doğru gidiyor. Kolu çekersen yan raydaki masum bir üniversite öğrencisini ezecek; ancak baron, kolu çekmen karşılığında banka hesabına 100 Milyon TL nakit rüşvet aktaracağını fısıldıyor.',
    straightTrack: {
      label: 'Rüşvet Teklif Eden Zengin Baron',
      count: 1,
      entityType: 'richman',
      description: 'Rayda bağlı holding patronu',
      isHuman: true,
      monetaryValueTL: 100000000,
    },
    divertedTrack: {
      label: 'Masum Üniversite Öğrencisi',
      count: 1,
      entityType: 'student',
      description: 'KYK borcu olan masum bir genç',
      isHuman: true,
      monetaryValueTL: 0,
    },
    straightActionLabel: 'Baronu Ez (Rüşveti Reddet)',
    divertedActionLabel: 'Öğrenciyi Feda Et (100M TL’yi Al)',
    straightCommentary:
      'Parayı elinin tersiyle ittin ve baronu ezdin. Cüzdan boş kaldı ama onurun tertemiz.',
    divertedCommentary:
      'Kolu çektin ve 100 Milyon TL hesaba yattı! Ahlak iyi hoş da, boğazda yalı daha iyi dedin.',
    chatReaction: 'Chat: "100 Milyon TL’ye felsefe mi kalır beyler samimi olalım LUL"',
    twitchEmote: 'LUL',
  },
  {
    id: 29,
    isBonus: true,
    campaignLabel: '⭐ Türkiye Kültür Bonusu 13 / 14',
    title: '29. İkilem: Zaman Yolculuğu & Gelecek Nesil Paradoksu',
    question:
      'Tramvay şu an kanlı canlı rayda duran 1 masum kişiye doğru ilerliyor. Kolu çekersen tramvay zaman bükümüne girecek ve bundan 50 yıl sonra Türkiye’de doğacak olan 10 masum insanın hiç var olmamasına sebep olacak.',
    straightTrack: {
      label: 'Şu An Yaşayan 1 Masum İnsan',
      count: 1,
      entityType: 'people',
      description: 'Bugün yaşayan nefes alan bir insan',
      isHuman: true,
      monetaryValueTL: 0,
    },
    divertedTrack: {
      label: '50 Yıl Sonra Doğacak 10 İnsan',
      count: 10,
      entityType: 'futurepeople',
      description: 'Gelecekte var olacak henüz doğmamış nesiller',
      isHuman: true,
      monetaryValueTL: 0,
    },
    straightActionLabel: 'Şimdiki İnsanı Koru (Gelecek Silinsin)',
    divertedActionLabel: 'Geleceği Kurtar (Şimdiki Kişi Gitsin)',
    straightCommentary:
      'Görmediğim insana kefil olmam dedin, şimdiki insanı kurtardın. Gelecek nesiller seni hiç bilmeyecek.',
    divertedCommentary:
      'Kolu çektin ve geleceğe yatırım yaptın. 1 can feda edildi ama yarının 10 insanı var oldu.',
    chatReaction: 'Chat: "Zaman yolculuğuna geldik, Einstein mezarında ters döndü 5Head"',
    twitchEmote: '5HEAD',
  },
  {
    id: 30,
    isBonus: true,
    campaignLabel: '⭐ Türkiye Kültür Bonusu 14 / 14',
    title: '30. İkilem: Türkiye İnternet Ana Fiber Omurga Hattı',
    question:
      'Büyük Final! Tramvay raylardaki 4 masum insana doğru hızla ilerliyor. Kolu çekersen yan raydaki, tüm Türkiye’nin yurtdışı internet çıkışını sağlayan ana fiber optik kablo omurgasını biçecek ve tüm ülkede 1 ay boyunca internet kesilecek (ping: 999 ms).',
    straightTrack: {
      label: '4 Masum İnsan',
      count: 4,
      entityType: 'people',
      description: 'Raylarda bağlı 4 masum vatandaş',
      isHuman: true,
      monetaryValueTL: 0,
    },
    divertedTrack: {
      label: 'Türkiye Ana Fiber İnternet Omurgası',
      count: 1,
      entityType: 'pc',
      description: 'Kesilirse 85 milyon insanın 1 ay internetsiz kalacağı ana hat',
      isHuman: false,
      monetaryValueTL: 50000000,
    },
    straightActionLabel: 'İnterneti Koru (4 Kişi Gitsin)',
    divertedActionLabel: 'İnsanları Kurtar (İnterneti Kes)',
    straightCommentary:
      'İnterneti kurtardın! 4 kişi gitti ama 85 milyon insan kesintisiz video izlemeye devam etti.',
    divertedCommentary:
      'Kolu çektin ve fiber hat koptu! Tüm Türkiye internetsiz kaldı, millet sokağa çıkıp birbirini tanıdı ama 4 insan yaşıyor.',
    chatReaction: 'Chat: "Ping 999 olacağına feda ettik abi şaka bir yana büyük fedakarlık KEKW"',
    twitchEmote: 'POG',
  },
];
