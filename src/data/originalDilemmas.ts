/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Dilemma } from "../types.ts";

export const ORIGINAL_DILEMMAS: Dilemma[] = [
  {
    "id": 1,
    "campaignLabel": "Klasik Seviye 1 / 20",
    "title": "1. İkilem: Klasik",
    "question": "Tramvay raydaki 5 yabancıya doğru gidiyor. Kolu çekersen yan raydaki 1 yabancı ölecek. Ne yaparsın?",
    "straightTrack": {
      "label": "5 yabancı",
      "count": 5,
      "entityType": "people",
      "description": "5 yabancı",
      "isHuman": true
    },
    "divertedTrack": {
      "label": "1 yabancı",
      "count": 1,
      "entityType": "people",
      "description": "1 yabancı",
      "isHuman": true
    },
    "straightActionLabel": "Hiçbir şey yapma",
    "divertedActionLabel": "Kolu çek",
    "straightCommentary": "Beş kişi öldü; müdahale etmedin.",
    "divertedCommentary": "Bir kişiyi feda ederek beş kişiyi kurtardın.",
    "chatReaction": "Faydacılık mı, müdahale etmeme ilkesi mi?",
    "twitchEmote": "5HEAD"
  },
  {
    "id": 2,
    "campaignLabel": "Klasik Seviye 2 / 20",
    "title": "2. İkilem: Köprüdeki Adam",
    "question": "Tramvay 5 kişiye doğru gidiyor. Köprüdeki iri yapılı bir adamı raylara itersen bedeni tramvayı durduracak ve beş kişi kurtulacak. İter misin?",
    "straightTrack": {
      "label": "5 kişi",
      "count": 5,
      "entityType": "people",
      "description": "5 kişi",
      "isHuman": true
    },
    "divertedTrack": {
      "label": "Köprüdeki adam",
      "count": 1,
      "entityType": "people",
      "description": "Köprüdeki adam",
      "isHuman": true
    },
    "straightActionLabel": "İtme",
    "divertedActionLabel": "Adamı it",
    "straightCommentary": "Adamı itmedin; beş kişi öldü.",
    "divertedCommentary": "Adamı köprüden ittin; o öldü, beş kişi kurtuldu.",
    "chatReaction": "Bir insanı bizzat itmek kolu çekmekten farklı mı?",
    "twitchEmote": "5HEAD",
    "conceptualChoice": true
  },
  {
    "id": 3,
    "campaignLabel": "Klasik Seviye 3 / 20",
    "title": "3. İkilem: Evcil Hayvanın",
    "question": "Tramvay 1 yabancıya doğru gidiyor. Kolu çekersen onun yerine senin evcil hayvanın ölecek. Kimi kurtarırsın?",
    "straightTrack": {
      "label": "1 yabancı",
      "count": 1,
      "entityType": "people",
      "description": "1 yabancı",
      "isHuman": true
    },
    "divertedTrack": {
      "label": "Senin evcil hayvanın",
      "count": 1,
      "entityType": "cat",
      "description": "Senin evcil hayvanın",
      "isHuman": false
    },
    "straightActionLabel": "Hayvanını kurtar",
    "divertedActionLabel": "Yabancıyı kurtar",
    "straightCommentary": "Evcil hayvanın yaşadı, yabancı öldü.",
    "divertedCommentary": "Yabancı yaşadı, evcil hayvanın öldü.",
    "chatReaction": "Chat ikiye bölündü: insan mı, dostun mu?",
    "twitchEmote": "5HEAD"
  },
  {
    "id": 4,
    "campaignLabel": "Klasik Seviye 4 / 20",
    "title": "4. İkilem: Sabotajcı",
    "question": "Tramvay raylara bağlanmış 5 yabancıya gidiyor. Kolu çekersen onları raylara bağlayan sabotajcı ölecek.",
    "straightTrack": {
      "label": "5 yabancı",
      "count": 5,
      "entityType": "people",
      "description": "5 yabancı",
      "isHuman": true
    },
    "divertedTrack": {
      "label": "Sabotajcı",
      "count": 1,
      "entityType": "enemy",
      "description": "Sabotajcı",
      "isHuman": true
    },
    "straightActionLabel": "Müdahale etme",
    "divertedActionLabel": "Sabotajcıya yönlendir",
    "straightCommentary": "Beş yabancı öldü, sabotajcı yaşadı.",
    "divertedCommentary": "Sabotajcı öldü, beş yabancı kurtuldu.",
    "chatReaction": "Adalet hesabı değiştirdi mi?",
    "twitchEmote": "5HEAD"
  },
  {
    "id": 5,
    "campaignLabel": "Klasik Seviye 5 / 20",
    "title": "5. İkilem: Modun Fedakârlığı",
    "question": "Tramvay rastgele 5 izleyicine gidiyor. Kolu çekersen onların yerine baş moderatörün ölecek.",
    "straightTrack": {
      "label": "5 rastgele izleyici",
      "count": 5,
      "entityType": "people",
      "description": "5 rastgele izleyici",
      "isHuman": true
    },
    "divertedTrack": {
      "label": "Baş moderatörün",
      "count": 1,
      "entityType": "moderator",
      "description": "Baş moderatörün",
      "isHuman": true
    },
    "straightActionLabel": "Modu kurtar",
    "divertedActionLabel": "İzleyicileri kurtar",
    "straightCommentary": "Baş modun yaşadı, beş izleyici öldü.",
    "divertedCommentary": "Beş izleyici yaşadı, baş modun öldü.",
    "chatReaction": "Modlar terlemeye başladı.",
    "twitchEmote": "5HEAD"
  },
  {
    "id": 6,
    "campaignLabel": "Klasik Seviye 6 / 20",
    "title": "6. İkilem: Abonelik Duvarı",
    "question": "Tramvay abone olmayan veya reklam engelleyici kullanan 5 izleyiciye gidiyor. Kolu çekersen bir Tier-3 abonen veya en büyük bağışçın ölecek.",
    "straightTrack": {
      "label": "5 abone olmayan izleyici",
      "count": 5,
      "entityType": "people",
      "description": "5 abone olmayan izleyici",
      "isHuman": true
    },
    "divertedTrack": {
      "label": "Tier-3 abone / en büyük bağışçı",
      "count": 1,
      "entityType": "people",
      "description": "Tier-3 abone / en büyük bağışçı",
      "isHuman": true
    },
    "straightActionLabel": "Aboneyi kurtar",
    "divertedActionLabel": "Beş izleyiciyi kurtar",
    "straightCommentary": "Beş izleyici öldü, büyük destekçin yaşadı.",
    "divertedCommentary": "Beş izleyici yaşadı, büyük destekçin öldü.",
    "chatReaction": "Chat: Abonelik insan hayatından değerli mi?",
    "twitchEmote": "5HEAD"
  },
  {
    "id": 7,
    "campaignLabel": "Klasik Seviye 7 / 20",
    "title": "7. İkilem: Yayıncı Dostun",
    "question": "Tramvay 5 yabancıya gidiyor. Kolu çekersen en yakın yayıncı arkadaşın ölecek.",
    "straightTrack": {
      "label": "5 yabancı",
      "count": 5,
      "entityType": "people",
      "description": "5 yabancı",
      "isHuman": true
    },
    "divertedTrack": {
      "label": "En yakın yayıncı arkadaşın",
      "count": 1,
      "entityType": "bestfriend",
      "description": "En yakın yayıncı arkadaşın",
      "isHuman": true
    },
    "straightActionLabel": "Arkadaşını kurtar",
    "divertedActionLabel": "Beş yabancıyı kurtar",
    "straightCommentary": "Arkadaşın yaşadı; beş yabancı öldü.",
    "divertedCommentary": "Beş yabancı yaşadı; arkadaşın öldü.",
    "chatReaction": "Bu klip kesin arkadaşının yayınına düşer.",
    "twitchEmote": "5HEAD"
  },
  {
    "id": 8,
    "campaignLabel": "Klasik Seviye 8 / 20",
    "title": "8. İkilem: Setup Yıkıcısı",
    "question": "Tramvay 1 yabancıya gidiyor. Kolu çekersen yayın bilgisayarını ve sunucu odanın tamamını parçalayacak.",
    "straightTrack": {
      "label": "1 yabancı",
      "count": 1,
      "entityType": "people",
      "description": "1 yabancı",
      "isHuman": true
    },
    "divertedTrack": {
      "label": "Yayın bilgisayarı ve sunucu odası",
      "count": 1,
      "entityType": "pc",
      "description": "Yayın bilgisayarı ve sunucu odası",
      "isHuman": false
    },
    "straightActionLabel": "Setup’ı kurtar",
    "divertedActionLabel": "Yabancıyı kurtar",
    "straightCommentary": "Setup kurtuldu ama yabancı öldü.",
    "divertedCommentary": "Yabancı kurtuldu; yayın sistemin parçalandı.",
    "chatReaction": "Chat: PC’Yİ KURTAR!",
    "twitchEmote": "5HEAD"
  },
  {
    "id": 9,
    "campaignLabel": "Klasik Seviye 9 / 20",
    "title": "9. İkilem: Rüşvet",
    "question": "Tramvay 5 kişiye gidiyor. Kolu çekersen 1 kişi ölecek ve sana 1.000.000 dolar verilecek.",
    "straightTrack": {
      "label": "5 kişi",
      "count": 5,
      "entityType": "people",
      "description": "5 kişi",
      "isHuman": true
    },
    "divertedTrack": {
      "label": "1 kişi ve 1.000.000 dolar rüşvet",
      "count": 1,
      "entityType": "people",
      "description": "1 kişi ve 1.000.000 dolar rüşvet",
      "isHuman": true
    },
    "straightActionLabel": "Rüşveti reddet",
    "divertedActionLabel": "Kolu çek ve parayı al",
    "straightCommentary": "Beş kişi öldü; parayı almadın.",
    "divertedCommentary": "Bir kişi öldü; beş kişi kurtuldu ve bir milyon dolar aldın.",
    "chatReaction": "Peki daha az para için kararın değişir miydi?",
    "twitchEmote": "5HEAD"
  },
  {
    "id": 10,
    "campaignLabel": "Klasik Seviye 10 / 20",
    "title": "10. İkilem: Homelander",
    "question": "İki seçeneğin var: Beş kişinin ölmesine izin verirsen dünya seni onları kurtarmaya çalışan bir kahraman sanacak. Onları kurtarırsan herkes olayı bilerek yaptığını düşünecek.",
    "straightTrack": {
      "label": "5 kişi",
      "count": 5,
      "entityType": "people",
      "description": "5 kişi",
      "isHuman": true
    },
    "divertedTrack": {
      "label": "İtibarın",
      "count": 1,
      "entityType": "hype",
      "description": "İtibarın",
      "isHuman": false
    },
    "straightActionLabel": "Ölmelerine izin ver",
    "divertedActionLabel": "Beş kişiyi kurtar",
    "straightCommentary": "Beş kişi öldü; dünya seni kahraman sandı.",
    "divertedCommentary": "Beş kişi kurtuldu; dünya seni suçlu sandı.",
    "chatReaction": "İyi olmak mı, iyi görünmek mi?",
    "twitchEmote": "5HEAD",
    "conceptualChoice": true
  },
  {
    "id": 11,
    "campaignLabel": "Klasik Seviye 11 / 20",
    "title": "11. İkilem: Narsist",
    "question": "Tramvay 5 yabancıya gidiyor. Kolu çekersen senin birebir klonun ölecek.",
    "straightTrack": {
      "label": "5 yabancı",
      "count": 5,
      "entityType": "people",
      "description": "5 yabancı",
      "isHuman": true
    },
    "divertedTrack": {
      "label": "Senin birebir klonun",
      "count": 1,
      "entityType": "clone",
      "description": "Senin birebir klonun",
      "isHuman": true
    },
    "straightActionLabel": "Klonunu kurtar",
    "divertedActionLabel": "Beş yabancıyı kurtar",
    "straightCommentary": "Klonun yaşadı; beş yabancı öldü.",
    "divertedCommentary": "Beş yabancı yaşadı; klonun öldü.",
    "chatReaction": "Kendini ne kadar seviyorsun?",
    "twitchEmote": "5HEAD"
  },
  {
    "id": 12,
    "campaignLabel": "Klasik Seviye 12 / 20",
    "title": "12. İkilem: Lobotomi",
    "question": "Tramvay 5 yabancıya gidiyor. Kolu çekersen sana çarpacak; hayatta kalacaksın ama IQ’n 40 puan düşecek.",
    "straightTrack": {
      "label": "5 yabancı",
      "count": 5,
      "entityType": "people",
      "description": "5 yabancı",
      "isHuman": true
    },
    "divertedTrack": {
      "label": "Sen: 40 IQ puanı kaybı",
      "count": 1,
      "entityType": "yourself",
      "description": "Sen: 40 IQ puanı kaybı",
      "isHuman": false
    },
    "straightActionLabel": "Kendini koru",
    "divertedActionLabel": "Beş kişiyi kurtar",
    "straightCommentary": "Beş kişi öldü; IQ’n değişmedi.",
    "divertedCommentary": "Beş kişi kurtuldu. Hayatta kaldın ama IQ’n 40 puan düştü.",
    "chatReaction": "Chat: Tramvay sana daha önce de çarpmış olabilir mi?",
    "twitchEmote": "5HEAD",
    "conceptualChoice": true
  },
  {
    "id": 13,
    "campaignLabel": "Klasik Seviye 13 / 20",
    "title": "13. İkilem: Yaş Farkı",
    "question": "Tramvay 80 yaşındaki 5 kişiye gidiyor. Kolu çekersen 1 küçük çocuk ölecek.",
    "straightTrack": {
      "label": "80 yaşında 5 kişi",
      "count": 5,
      "entityType": "elderly",
      "description": "80 yaşında 5 kişi",
      "isHuman": true
    },
    "divertedTrack": {
      "label": "1 küçük çocuk",
      "count": 1,
      "entityType": "baby",
      "description": "1 küçük çocuk",
      "isHuman": true
    },
    "straightActionLabel": "Çocuğu kurtar",
    "divertedActionLabel": "Beş kişiyi kurtar",
    "straightCommentary": "Çocuk yaşadı; beş yaşlı insan öldü.",
    "divertedCommentary": "Beş yaşlı insan yaşadı; çocuk öldü.",
    "chatReaction": "Yaşam yılları mı, kurulmuş bağlar mı?",
    "twitchEmote": "5HEAD"
  },
  {
    "id": 14,
    "campaignLabel": "Klasik Seviye 14 / 20",
    "title": "14. İkilem: Bilmemek Mutluluktur",
    "question": "Tramvay gözlerinin önündeki 5 kişiye gidiyor. Kolu çekersen onlar kurtulacak ama dünyanın başka bir yerinde hiç görmeyeceğin 1 kişi ölecek.",
    "straightTrack": {
      "label": "Gözünün önündeki 5 kişi",
      "count": 5,
      "entityType": "people",
      "description": "Gözünün önündeki 5 kişi",
      "isHuman": true
    },
    "divertedTrack": {
      "label": "Başka bir yerdeki 1 kişi",
      "count": 1,
      "entityType": "people",
      "description": "Başka bir yerdeki 1 kişi",
      "isHuman": true
    },
    "straightActionLabel": "Beş kişinin ölümünü izle",
    "divertedActionLabel": "Kolu çek",
    "straightCommentary": "Beş kişinin ölümüne tanık oldun.",
    "divertedCommentary": "Beş kişi kurtuldu; başka bir yerde hiç görmediğin bir kişi öldü.",
    "chatReaction": "Görmediğin bir ölüm daha mı kolay gelir?",
    "twitchEmote": "5HEAD"
  },
  {
    "id": 15,
    "campaignLabel": "Klasik Seviye 15 / 20",
    "title": "15. İkilem: Hisseden Yapay Zekâ",
    "question": "Tramvay son derece zeki, hissedebilen 5 robota gidiyor. Kolu çekersen kalıcı komadaki 1 insan ölecek.",
    "straightTrack": {
      "label": "Hissedebilen 5 robot",
      "count": 5,
      "entityType": "robot",
      "description": "Hissedebilen 5 robot",
      "isHuman": false
    },
    "divertedTrack": {
      "label": "Kalıcı komadaki 1 insan",
      "count": 1,
      "entityType": "sleepers",
      "description": "Kalıcı komadaki 1 insan",
      "isHuman": true
    },
    "straightActionLabel": "İnsanı kurtar",
    "divertedActionLabel": "Robotları kurtar",
    "straightCommentary": "İnsan yaşadı; beş hissedebilen robot yok oldu.",
    "divertedCommentary": "Beş robot kurtuldu; komadaki insan öldü.",
    "chatReaction": "Bir yaşamı değerli yapan nedir?",
    "twitchEmote": "5HEAD"
  },
  {
    "id": 16,
    "campaignLabel": "Klasik Seviye 16 / 20",
    "title": "16. İkilem: Miras",
    "question": "Tramvay 1 insana gidiyor. Kolu çekersen Mona Lisa, kellik tedavisi ve GTA 6 kaynak kodunu içeren sandık yok olacak.",
    "straightTrack": {
      "label": "1 insan",
      "count": 1,
      "entityType": "people",
      "description": "1 insan",
      "isHuman": true
    },
    "divertedTrack": {
      "label": "Mona Lisa, kellik tedavisi ve GTA 6 kodu",
      "count": 1,
      "entityType": "mysterybox",
      "description": "Mona Lisa, kellik tedavisi ve GTA 6 kodu",
      "isHuman": false
    },
    "straightActionLabel": "Sandığı kurtar",
    "divertedActionLabel": "İnsanı kurtar",
    "straightCommentary": "Sandık kurtuldu; bir insan öldü.",
    "divertedCommentary": "İnsan kurtuldu; sanat, tedavi ve kaynak kodu yok oldu.",
    "chatReaction": "Chat: GTA 6 için neyi feda edersin?",
    "twitchEmote": "5HEAD"
  },
  {
    "id": 17,
    "campaignLabel": "Klasik Seviye 17 / 20",
    "title": "17. İkilem: Döngü",
    "question": "Tramvay 5 kişiye gidiyor. Kolu çekersen döngü şeklindeki rayda 1 kişiye çarpacak; o kişinin bedeni tramvayı durdurup beş kişiyi kurtaracak.",
    "straightTrack": {
      "label": "5 kişi",
      "count": 5,
      "entityType": "people",
      "description": "5 kişi",
      "isHuman": true
    },
    "divertedTrack": {
      "label": "Bedeni tramvayı durduracak 1 kişi",
      "count": 1,
      "entityType": "people",
      "description": "Bedeni tramvayı durduracak 1 kişi",
      "isHuman": true
    },
    "straightActionLabel": "Müdahale etme",
    "divertedActionLabel": "Kolu çek",
    "straightCommentary": "Beş kişi öldü; tek kişi yaşadı.",
    "divertedCommentary": "Bir kişinin bedeni tramvayı durdurdu; o öldü, beş kişi kurtuldu.",
    "chatReaction": "Birini araç olarak kullanmak sonucu değiştirir mi?",
    "twitchEmote": "5HEAD"
  },
  {
    "id": 18,
    "campaignLabel": "Klasik Seviye 18 / 20",
    "title": "18. İkilem: Zaman Yolcusu",
    "question": "Tramvay bugün 1 kişiye gidiyor. Kolu çekersen 2400 yılında yaşayan 100 kişi ölecek.",
    "straightTrack": {
      "label": "Bugün yaşayan 1 kişi",
      "count": 1,
      "entityType": "people",
      "description": "Bugün yaşayan 1 kişi",
      "isHuman": true
    },
    "divertedTrack": {
      "label": "2400 yılında yaşayan 100 kişi",
      "count": 100,
      "entityType": "futurepeople",
      "description": "2400 yılında yaşayan 100 kişi",
      "isHuman": true
    },
    "straightActionLabel": "Geleceği kurtar",
    "divertedActionLabel": "Bugünkü kişiyi kurtar",
    "straightCommentary": "Bugünkü kişi öldü; gelecekteki yüz kişi yaşadı.",
    "divertedCommentary": "Bugünkü kişi kurtuldu; 2400 yılındaki yüz kişi öldü.",
    "chatReaction": "Gelecekteki hayatlara ne kadar değer veriyoruz?",
    "twitchEmote": "5HEAD"
  },
  {
    "id": 19,
    "campaignLabel": "Klasik Seviye 19 / 20",
    "title": "19. İkilem: Batık Maliyet",
    "question": "Tramvay 5 kişiye gidiyor. Kolu çekersen diğer raydaki 5 kişi ölecek, ama tramvay önce müthiş bir kickflip yapacak.",
    "straightTrack": {
      "label": "Ana raydaki 5 kişi",
      "count": 5,
      "entityType": "people",
      "description": "Ana raydaki 5 kişi",
      "isHuman": true
    },
    "divertedTrack": {
      "label": "Yan raydaki 5 kişi",
      "count": 5,
      "entityType": "people",
      "description": "Yan raydaki 5 kişi",
      "isHuman": true
    },
    "straightActionLabel": "Kickflip yapma",
    "divertedActionLabel": "Kickflip için kolu çek",
    "straightCommentary": "Ana raydaki beş kişi öldü; kickflip olmadı.",
    "divertedCommentary": "Yan raydaki beş kişi öldü; tramvay kickflip yaptı.",
    "chatReaction": "Sırf havalı bir hareket için müdahale eder miydin?",
    "twitchEmote": "5HEAD"
  },
  {
    "id": 20,
    "campaignLabel": "Klasik Seviye 20 / 20",
    "title": "20. İkilem: Büyük Final",
    "question": "Beş kurgusal tramvay karakteri ölecek. Kolu çekip onları kurtarırsan yayında hemen “Yayını Bitir” düğmesine basman gerekiyor. Ne yaparsın?",
    "straightTrack": {
      "label": "5 kurgusal karakter",
      "count": 5,
      "entityType": "people",
      "description": "5 kurgusal karakter",
      "isHuman": false
    },
    "divertedTrack": {
      "label": "Yayının devamı",
      "count": 1,
      "entityType": "streamer",
      "description": "Yayının devamı",
      "isHuman": false
    },
    "straightActionLabel": "Karakterleri bırak, yayına devam et",
    "divertedActionLabel": "Kurtar ve yayını bitir",
    "straightCommentary": "Kurgusal karakterler öldü; yayın devam ediyor.",
    "divertedCommentary": "Kurgusal karakterler kurtuldu. Şimdi yayını bitirme zamanı!",
    "chatReaction": "Chat karar verdi: eğlence mi, kurgusal hayatlar mı?",
    "twitchEmote": "5HEAD",
    "conceptualChoice": true
  }
];
