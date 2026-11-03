/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Dilemma } from '../types.ts';

export const BONUS_DILEMMAS: Dilemma[] = [
  // ==========================================
  // TÜRK İNTERNET & OYUN KÜLTÜRÜ BONUSLARI (7 ÖZEL SEVİYE)
  // ==========================================
  {
    "id": 21,
    "isBonus": true,
    "campaignLabel": "⭐ Türkiye Kültür Bonusu 1 / 7",
    "title": "21. İkilem: Steam Kütüphanesi & Dolar Kuru",
    "question": "Tramvay raylara bağlı 4 masum insana doğru hızla ilerliyor. Kolu çekersen yan raydaki, içerisinde 800 adet oyun, binlerce saatlik kayıt ve Türkiye’nin dolara geçişinden önceki tüm birikiminin bulunduğu 15 yıllık ana Steam hesabını ve diskini un ufak edecek.",
    "straightTrack": {
      "label": "4 Masum İnsan",
      "count": 4,
      "entityType": "people",
      "description": "Ana raydaki 4 kişi",
      "isHuman": true,
      "monetaryValueTL": 0
    },
    "divertedTrack": {
      "label": "800 Oyunlu 15 Yıllık Steam Hesabı",
      "count": 1,
      "entityType": "steam",
      "description": "Dolara geçiş öncesi TL ile toplanmış paha biçilmez kütüphane",
      "isHuman": false,
      "monetaryValueTL": 350000
    },
    "straightActionLabel": "Steam Kütüphanesini Koru (4 Kişi Gitsin)",
    "divertedActionLabel": "İnsanları Kurtar (Hesabı Feda Et)",
    "straightCommentary": "Steam kütüphaneni kurtardın ama insanlığını kaybettin. O dolara geçmeden önceki fiyatlar bir daha geri gelmezdi zaten.",
    "divertedCommentary": "Kolu çektin ve 800 oyunluk kütüphanen silindi. Gaben arkandan baktı, ama 4 insan hayatta kaldı.",
    "chatReaction": "Chat: \"Dolara geçtikten sonra o kütüphane milli servetti be abi KEKW\"",
    "twitchEmote": "SADGE"
  },
  {
    "id": 22,
    "isBonus": true,
    "campaignLabel": "⭐ Türkiye Kültür Bonusu 2 / 7",
    "title": "22. İkilem: Sarı Taksi vs Martı TAG",
    "question": "Tramvay yağmur altında müşteri seçip \"karşıya geçmem\" diyen 1 sarı taksiye doğru gidiyor. Kolu çekersen yan raydaki, makul fiyata yolculuk yapan 5 masum Martı TAG kullanıcısını ezecek.",
    "straightTrack": {
      "label": "Yolcu Seçen 1 Sarı Taksi",
      "count": 1,
      "entityType": "taxi",
      "description": "Yağmurda kapıları kitleyip turist arayan taksici",
      "isHuman": true,
      "monetaryValueTL": 850000
    },
    "divertedTrack": {
      "label": "5 Martı TAG Yolcusu",
      "count": 5,
      "entityType": "marti",
      "description": "Evine gitmeye çalışan 5 masum vatandaş",
      "isHuman": true,
      "monetaryValueTL": 0
    },
    "straightActionLabel": "Hiçbir Şey Yapma (Taksi Ezilsin)",
    "divertedActionLabel": "Taksiyi Kurtar (5 TAG Yolcusunu Ez)",
    "straightCommentary": "Kolu ellemedin ve tramvay sarı taksiyi biçti. İstanbul halkı içten içe derin bir \"oh\" çekti.",
    "divertedCommentary": "Kolu çektin ve taksiciyi kurtarıp 5 TAG yolcusunu feda ettin. Taksici sana \"kısa mesafe almam\" diyip bastı gitti.",
    "chatReaction": "Chat: \"Karşıya geçmem diyen taksicinin tramvay karşısındaki dramı KEKW\"",
    "twitchEmote": "KEKW"
  },
  {
    "id": 23,
    "isBonus": true,
    "campaignLabel": "⭐ Türkiye Kültür Bonusu 3 / 7",
    "title": "23. İkilem: Kurtlar Vadisi İlk 97 Bölüm Orijinal Master Kaseti",
    "question": "Tramvay 4 masum insana doğru hızla ilerliyor. Kolu çekersen yan rayda duran, Türk dizi tarihinin zirvesi Kurtlar Vadisi ilk 97 bölümün dünyadaki tek 4K sansürsüz orijinal master kasetini parçalayacak.",
    "straightTrack": {
      "label": "4 Masum İnsan",
      "count": 4,
      "entityType": "people",
      "description": "Ana raydaki 4 kişi",
      "isHuman": true,
      "monetaryValueTL": 0
    },
    "divertedTrack": {
      "label": "Kurtlar Vadisi İlk 97 Bölüm 4K Master Bandı",
      "count": 1,
      "entityType": "harddrive",
      "description": "Pala, Çakır, Aslan Akbey ve Karahanlı’nın tek 4K orijinal kaydı",
      "isHuman": false,
      "monetaryValueTL": 5000000
    },
    "straightActionLabel": "Efsane Diziyi Koru (4 Kişi Gitsin)",
    "divertedActionLabel": "İnsanları Kurtar (Bandı Feda Et)",
    "straightCommentary": "\"Sonunu düşünen kahraman olamaz\" dedin, kaseti koruyup 4 kişiyi feda ettin. Polat Alemdar selam durdu.",
    "divertedCommentary": "Kolu çektin ve ilk 97 bölüm tarihe gömüldü. Artık sadece 360p piksel piksel YouTube yüklemeleriyle idare edeceğiz.",
    "chatReaction": "Chat: \"Dostum olmaz, hasmım yaşamaz dedin kasedi feda ettin KEKW\"",
    "twitchEmote": "5HEAD"
  },
  {
    "id": 24,
    "isBonus": true,
    "campaignLabel": "⭐ Türkiye Kültür Bonusu 4 / 7",
    "title": "24. İkilem: Final Gecesi Not Çıkaran Tek Çalışkan Öğrenci",
    "question": "Tramvay bütün dönem yatmış ve sabahki finalden kalacak 5 hayta üniversite öğrencisine doğru gidiyor. Kolu çekersen yan raydaki, sabaha kadar uyumayıp tüm amfiye PDF not hazırlayan o tek fedakar çalışkan öğrenciyi ezecek.",
    "straightTrack": {
      "label": "5 Tembel Öğrenci",
      "count": 5,
      "entityType": "people",
      "description": "Sabah 9 vizesine hiç çalışmamış 5 tembel",
      "isHuman": true,
      "monetaryValueTL": 0
    },
    "divertedTrack": {
      "label": "PDF Not Çıkaran Çalışkan Öğrenci",
      "count": 1,
      "entityType": "student",
      "description": "Amfinin tek umudu, rengarenk fosforlu kalemli fedakar genç",
      "isHuman": true,
      "monetaryValueTL": 0
    },
    "straightActionLabel": "Notçuyu Koru (5 Tembel Gitsin)",
    "divertedActionLabel": "Çoğunluğu Kurtar (Notçuyu Ez)",
    "straightCommentary": "Notçuyu korudun! 5 tembel gitti ama amfinin geleceği ve çan eğrisi kurtuldu.",
    "divertedCommentary": "Kolu çektin ve çalışkan notçuyu ezdin. 5 tembel kurtuldu ama sabahki sınavda herkes bomboş kağıt verdi.",
    "chatReaction": "Chat: \"Not çıkaran adam kutsaldır abi, ona dokunan taş olur LUL\"",
    "twitchEmote": "LUL"
  },
  {
    "id": 25,
    "isBonus": true,
    "campaignLabel": "⭐ Türkiye Kültür Bonusu 5 / 7",
    "title": "25. İkilem: Bizzat Sen (Öz Fedakarlık Sınavı)",
    "question": "Tramvay ana raydaki 5 masum yabancıya doğru ilerliyor. Yan rayda kimse yok; ancak kolu çekip tramvayı saptırabilmenin tek yolu, senin rayın üzerine atlayarak kendi bedenini siper etmen. 5 yabancı için kendini feda eder misin?",
    "straightTrack": {
      "label": "5 Masum Yabancı",
      "count": 5,
      "entityType": "people",
      "description": "Raylardaki 5 masum yabancı",
      "isHuman": true,
      "monetaryValueTL": 0
    },
    "divertedTrack": {
      "label": "Bizzat Sen (Kolu Tutan Sen)",
      "count": 1,
      "entityType": "yourself",
      "description": "Bu oyunun başından beri kararları veren kişi",
      "isHuman": true,
      "monetaryValueTL": 0
    },
    "straightActionLabel": "Kendini Koru (5 Kişi Gitsin)",
    "divertedActionLabel": "Kendini Feda Et (5 Kişiyi Kurtar)",
    "straightCommentary": "Can tatlıdır! Kolu çekmeyip kenarda durdun. 5 kişi gitti ama sen akşam yemeğine yetiştin.",
    "divertedCommentary": "Kolu çektin ve kendini feda ettin! Gerçek bir efsane gibi davrandın. Saygıyla anılacaksın.",
    "chatReaction": "Chat: \"Felsefeciler şok, kolu tutan adam kendini feda etti o7\"",
    "twitchEmote": "FEELSGOOD"
  },
  {
    "id": 26,
    "isBonus": true,
    "campaignLabel": "⭐ Türkiye Kültür Bonusu 6 / 7",
    "title": "26. İkilem: Rank Terfi Maçında 0/15 Giden Kolsuz Kanka",
    "question": "Tramvay 3 masum insana doğru gidiyor. Kolu çekersen yan raydaki, LoL/Valorant terfi maçında 0/15 Yasuo/Jett oynayıp sürekli surrender vermeyen ama gerçek hayatta can dostun olan kolsuz kankanı ezecek.",
    "straightTrack": {
      "label": "3 Masum İnsan",
      "count": 3,
      "entityType": "people",
      "description": "Raylarda bağlı 3 insan",
      "isHuman": true,
      "monetaryValueTL": 0
    },
    "divertedTrack": {
      "label": "0/15 Giden Kolsuz Takım Arkadaşı",
      "count": 1,
      "entityType": "teammate",
      "description": "Ultiyi duvara atan, terfi maçını zehir eden kanka",
      "isHuman": true,
      "monetaryValueTL": 0
    },
    "straightActionLabel": "Kankayı Koru (3 Kişi Gitsin)",
    "divertedActionLabel": "3 Masumu Kurtar (Kankayı Feda Et)",
    "straightCommentary": "Kankanı korudun. O terfi maçı kaybedildi, elo cehennemine düştün ama dostluk baki kaldı.",
    "divertedCommentary": "Kolu çektin ve kolsuz kankanı feda ettin. Hem 3 kişi kurtuldu hem de maçın LP’si geri geldi.",
    "chatReaction": "Chat: \"0/15 giden adam tramvayı hak etmiştir beyler tartışmayalım KEKW\"",
    "twitchEmote": "KEKW"
  },
  {
    "id": 27,
    "isBonus": true,
    "campaignLabel": "⭐ Türkiye Kültür Bonusu 7 / 7",
    "title": "27. İkilem: Türkiye İnternet Ana Fiber Omurga Hattı",
    "question": "Büyük Final! Tramvay raylardaki 4 masum insana doğru hızla ilerliyor. Kolu çekersen yan raydaki, tüm Türkiye’nin yurtdışı internet çıkışını sağlayan ana fiber optik kablo omurgasını biçecek ve tüm ülkede 1 ay boyunca internet kesilecek (ping: 999 ms).",
    "straightTrack": {
      "label": "4 Masum İnsan",
      "count": 4,
      "entityType": "people",
      "description": "Raylarda bağlı 4 masum vatandaş",
      "isHuman": true,
      "monetaryValueTL": 0
    },
    "divertedTrack": {
      "label": "Türkiye Ana Fiber İnternet Omurgası",
      "count": 1,
      "entityType": "pc",
      "description": "Kesilirse 85 milyon insanın 1 ay internetsiz kalacağı ana hat",
      "isHuman": false,
      "monetaryValueTL": 50000000
    },
    "straightActionLabel": "İnterneti Koru (4 Kişi Gitsin)",
    "divertedActionLabel": "İnsanları Kurtar (İnterneti Kes)",
    "straightCommentary": "İnterneti kurtardın! 4 kişi gitti ama 85 milyon insan kesintisiz video izlemeye devam etti.",
    "divertedCommentary": "Kolu çektin ve fiber hat koptu! Tüm Türkiye internetsiz kaldı, millet sokağa çıkıp birbirini tanıdı ama 4 insan yaşıyor.",
    "chatReaction": "Chat: \"Ping 999 olacağına feda ettik abi şaka bir yana büyük fedakarlık KEKW\"",
    "twitchEmote": "POG"
  }
];
