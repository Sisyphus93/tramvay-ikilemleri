/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Dilemma } from "../types.ts";

export const ORIGINAL_DILEMMAS: Dilemma[] = [
  {
    "id": 1,
    "campaignLabel": "Klasik Seviye 1 / 20",
    "title": "1. İkilem: Klasik Soru",
    "question": "Tramvay raydaki 5 yabancıya doğru gidiyor. Kolu çekersen yan raydaki 1 yabancı ölecek. 5 Yabancı vs. 1 Yabancı: ne yaparsın?",
    "straightTrack": {
      "label": "5 yabancı",
      "count": 5,
      "entityType": "people",
      "description": "Ana raydaki 5 yabancı",
      "isHuman": true
    },
    "divertedTrack": {
      "label": "1 yabancı",
      "count": 1,
      "entityType": "people",
      "description": "Yan raydaki 1 yabancı",
      "isHuman": true
    },
    "straightActionLabel": "Hiçbir şey yapma",
    "divertedActionLabel": "Kolu çek",
    "straightCommentary": "Beş kişi öldü; müdahale etmedin. Modlar çoktan anketi yapıştırdı.",
    "divertedCommentary": "Bir kişiyi feda ederek beş kişiyi kurtardın. Chat faydacı mı çıktı?",
    "chatReaction": "Kontrol grubu: kitlen ne kadar faydacı, ne kadar kararsız?",
    "twitchEmote": "5HEAD"
  },
  {
    "id": 2,
    "campaignLabel": "Klasik Seviye 2 / 20",
    "title": "2. İkilem: Şişman Adam",
    "question": "Tramvay 5 kişiye doğru gidiyor. Köprüdeki 1 iri adamı raylara itersen bedeni tramvayı durdurup 5 kişiyi kurtaracak. Matematik aynı ama onu kendi ellerinle itmek farklı mı? İter misin?",
    "straightTrack": {
      "label": "5 kişi",
      "count": 5,
      "entityType": "people",
      "description": "Ana raydaki 5 kişi",
      "isHuman": true
    },
    "divertedTrack": {
      "label": "Köprüdeki 1 iri adam",
      "count": 1,
      "entityType": "people",
      "description": "5 kişiyi kurtarmak için raylara itilecek iri adam",
      "isHuman": true
    },
    "straightActionLabel": "İtme",
    "divertedActionLabel": "1 iri adamı it",
    "straightCommentary": "Adamı itmedin; beş kişi öldü. Kolu çekmeye okeydin ama itmeye gelince iş değişti.",
    "divertedCommentary": "1 iri adamı köprüden ittin; o öldü, beş kişi kurtuldu.",
    "chatReaction": "Chat daha 3. dakikada kendi ahlakıyla çelişti; yüzlerine vurmak aşırı eğlenceli.",
    "twitchEmote": "5HEAD",
    "conceptualChoice": true
  },
  {
    "id": 3,
    "campaignLabel": "Klasik Seviye 3 / 20",
    "title": "3. İkilem: Yabancı İnsan vs. Senin Evcil Hayvanın",
    "question": "Tramvay 1 yabancı insana doğru gidiyor. Kolu çekersen onun yerine senin evcil hayvanın ölecek. Yabancı insan mı, senin evcil hayvanın mı?",
    "straightTrack": {
      "label": "1 yabancı insan",
      "count": 1,
      "entityType": "people",
      "description": "Ana raydaki 1 yabancı insan",
      "isHuman": true
    },
    "divertedTrack": {
      "label": "Senin evcil hayvanın",
      "count": 1,
      "entityType": "cat",
      "description": "Yan raydaki senin evcil hayvanın",
      "isHuman": false
    },
    "straightActionLabel": "Hayvanını kurtar",
    "divertedActionLabel": "Yabancı insanı kurtar",
    "straightCommentary": "Evcil hayvanın yaşadı, yabancı insan öldü.",
    "divertedCommentary": "Yabancı insan yaşadı, evcil hayvanın öldü.",
    "chatReaction": "Chat %50-%50 bölündü: hangi tarafı seçersen seç, seni psikopat ilan edecek.",
    "twitchEmote": "5HEAD"
  },
  {
    "id": 4,
    "campaignLabel": "Klasik Seviye 4 / 20",
    "title": "4. İkilem: Sabotajcı",
    "question": "Tramvay raylara bağlanmış 5 yabancıya gidiyor. Kolu çekersen onları raylara bağlayan kötü adam ölecek. 5 Yabancı vs. onları bağlayan sabotajcı: adalet hesabı değiştirir mi?",
    "straightTrack": {
      "label": "5 yabancı",
      "count": 5,
      "entityType": "people",
      "description": "Raylara bağlanmış 5 yabancı",
      "isHuman": true
    },
    "divertedTrack": {
      "label": "Onları bağlayan kötü adam",
      "count": 1,
      "entityType": "enemy",
      "description": "5 yabancıyı raylara bağlayan sabotajcı",
      "isHuman": true
    },
    "straightActionLabel": "Müdahale etme",
    "divertedActionLabel": "Sabotajcıya yönlendir",
    "straightCommentary": "Beş yabancı öldü, sabotajcı yaşadı.",
    "divertedCommentary": "Sabotajcı öldü, beş yabancı kurtuldu.",
    "chatReaction": "Chat %99 birleşip kötü adamı harcadı; ekranda GIGACHAD spam'ı dönüyor.",
    "twitchEmote": "5HEAD"
  },
  {
    "id": 5,
    "campaignLabel": "Klasik Seviye 5 / 20",
    "title": "5. İkilem: Mod Kurban Etme",
    "question": "Tramvay rastgele 5 izleyiciye gidiyor. Kolu çekersen onların yerine baş moderatörün ölecek. 5 Rastgele İzleyici vs. Baş Moderatörün: modları kullanmanın tam zamanı.",
    "straightTrack": {
      "label": "5 rastgele izleyici",
      "count": 5,
      "entityType": "people",
      "description": "Ana raydaki 5 rastgele izleyici",
      "isHuman": true
    },
    "divertedTrack": {
      "label": "Baş moderatörün",
      "count": 1,
      "entityType": "moderator",
      "description": "Yan raydaki baş moderatörün",
      "isHuman": true
    },
    "straightActionLabel": "Modu kurtar",
    "divertedActionLabel": "İzleyicileri kurtar",
    "straightCommentary": "Baş modun yaşadı, beş izleyici öldü.",
    "divertedCommentary": "Beş izleyici yaşadı, baş modun öldü.",
    "chatReaction": "Modlar soğuk ter dökerken: 'Hangi mod 5 izleyici feda etmeye değer, hangisi yatarak maaş alıyor?'",
    "twitchEmote": "5HEAD"
  },
  {
    "id": 6,
    "campaignLabel": "Klasik Seviye 6 / 20",
    "title": "6. İkilem: Kapitalizm Testi",
    "question": "Tramvay abone olmayan veya Adblock kullanan 5 izleyiciye gidiyor. Kolu çekersen 1 Tier-3 abonen veya en büyük bağışçın ölecek. 5 'pleb' mi, 1 'balina' mı?",
    "straightTrack": {
      "label": "5 abone olmayan / Adblock kullanan izleyici",
      "count": 5,
      "entityType": "people",
      "description": "Ana raydaki 5 'pleb' izleyici",
      "isHuman": true
    },
    "divertedTrack": {
      "label": "1 Tier-3 abone / en büyük bağışçı",
      "count": 1,
      "entityType": "people",
      "description": "Yan raydaki 1 'balina'",
      "isHuman": true
    },
    "straightActionLabel": "Balinayı kurtar",
    "divertedActionLabel": "5 izleyiciyi kurtar",
    "straightCommentary": "Beş 'pleb' öldü, 'balina' yaşadı. Yayıncının savunmaları zirve mizah.",
    "divertedCommentary": "Beş izleyici yaşadı, 'balina' öldü.",
    "chatReaction": "5 'pleb' yerine 1 'balinayı' kurtarma savunmaları YouTube Shorts ve TikTok'luk kesit.",
    "twitchEmote": "5HEAD"
  },
  {
    "id": 7,
    "campaignLabel": "Klasik Seviye 7 / 20",
    "title": "7. İkilem: Yayıncı Dostun",
    "question": "Tramvay 5 yabancıya gidiyor. Kolu çekersen en yakın yayıncı arkadaşın ölecek. 5 Yabancı vs. En Yakın Yayıncı Arkadaşın: etkileşim ve klip kasma sorusu.",
    "straightTrack": {
      "label": "5 yabancı",
      "count": 5,
      "entityType": "people",
      "description": "Ana raydaki 5 yabancı",
      "isHuman": true
    },
    "divertedTrack": {
      "label": "En yakın yayıncı arkadaşın",
      "count": 1,
      "entityType": "bestfriend",
      "description": "Yan raydaki en yakın yayıncı arkadaşın",
      "isHuman": true
    },
    "straightActionLabel": "Arkadaşını kurtar",
    "divertedActionLabel": "5 yabancıyı kurtar",
    "straightCommentary": "Arkadaşın yaşadı; beş yabancı öldü. Chat sana 'simp' veya 'yalaka' dedi.",
    "divertedCommentary": "Beş yabancı yaşadı; arkadaşın öldü. Klip yarın kendi yayınında tepki alacak.",
    "chatReaction": "İçerik açısından her türlü kazan-kazan: tatlı drama ya da 'simp' / 'yalaka' spam'ı.",
    "twitchEmote": "5HEAD"
  },
  {
    "id": 8,
    "campaignLabel": "Klasik Seviye 8 / 20",
    "title": "8. İkilem: Sistem Katili",
    "question": "Tramvay 1 yabancıya gidiyor. Kolu çekersen yabancı kurtulacak ama tramvay tüm yayın odanı ve bilgisayarını dümdüz edecek. Ekmek teknen mi, insan hayatı mı?",
    "straightTrack": {
      "label": "1 yabancı",
      "count": 1,
      "entityType": "people",
      "description": "Ana raydaki 1 yabancı",
      "isHuman": true
    },
    "divertedTrack": {
      "label": "Tüm yayın odan / bilgisayarın",
      "count": 1,
      "entityType": "pc",
      "description": "Yabancıyı kurtarınca parçalanacak setup",
      "isHuman": false
    },
    "straightActionLabel": "PC'yi kurtar",
    "divertedActionLabel": "Yabancıyı kurtar",
    "straightCommentary": "Setup kurtuldu ama yabancı öldü. Chat seni kötü kalpli canavar ilan etmek için bait'ledi.",
    "divertedCommentary": "Yabancı kurtuldu; yayın odan ve bilgisayarın dümdüz oldu.",
    "chatReaction": "Chat sırf seni kötü kalpli bir canavar gibi göstermek için PC'Yİ KURTAR diye spam yapıyor.",
    "twitchEmote": "5HEAD"
  },
  {
    "id": 9,
    "campaignLabel": "Klasik Seviye 9 / 20",
    "title": "9. İkilem: Rüşvet",
    "question": "Tramvay 5 kişiye gidiyor. Kolu çekersen 1 kişi ölecek, 5 kişi kurtulacak ve sana 1 Milyon Dolar verilecek. Modlar fiyatı düşürürse kararın değişir mi?",
    "straightTrack": {
      "label": "5 kişi",
      "count": 5,
      "entityType": "people",
      "description": "Ana raydaki 5 kişi",
      "isHuman": true
    },
    "divertedTrack": {
      "label": "1 kişi ve 1 Milyon Dolar rüşvet",
      "count": 1,
      "entityType": "people",
      "description": "Yan raydaki 1 kişi + 1 Milyon Dolar",
      "isHuman": true
    },
    "straightActionLabel": "Rüşveti reddet",
    "divertedActionLabel": "Kolu çek ve 1 Milyon Dolar'ı al",
    "straightCommentary": "Beş kişi öldü; parayı almadın.",
    "divertedCommentary": "Bir kişi öldü; beş kişi kurtuldu ve 1 Milyon Dolar aldın.",
    "chatReaction": "100 bin dolar? 10 bin? 1 hediye abonelik? Chat cinayetin tam fiyat etiketini buluyor.",
    "twitchEmote": "5HEAD"
  },
  {
    "id": 10,
    "campaignLabel": "Klasik Seviye 10 / 20",
    "title": "10. İkilem: Homelander İkilemi",
    "question": "İki seçeneğin var: 5 kişiyi kurtarırsan dünya seni katil sanacak; 5 kişinin ölmesine izin verirsen dünya seni \"kurtarmaya çalışan bir kahraman\" ilan edecek. İyi bir insan olmak mı, iyi bir PR'a sahip olup linç yememek mi?",
    "straightTrack": {
      "label": "5 kişi",
      "count": 5,
      "entityType": "people",
      "description": "Dünya seni kahraman sanırken ölmelerine izin verilen 5 kişi",
      "isHuman": true
    },
    "divertedTrack": {
      "label": "İtibarın / PR'ın",
      "count": 1,
      "entityType": "hype",
      "description": "5 kişiyi kurtarınca dünya seni katil sanacak",
      "isHuman": false
    },
    "straightActionLabel": "5 kişi ölsün, kahraman sanılsın",
    "divertedActionLabel": "5 kişiyi kurtar, katil sanılsın",
    "straightCommentary": "Beş kişi öldü; dünya seni kahraman sandı. PR tertemiz.",
    "divertedCommentary": "Beş kişi kurtuldu; dünya seni suçlu sandı. Linç yememek için iyi görünmeyi seçmedin.",
    "chatReaction": "Tam bir influencer testi: gerçekten iyi olmak mı, yoksa sadece iyi PR mı?",
    "twitchEmote": "5HEAD",
    "conceptualChoice": true
  },
  {
    "id": 11,
    "campaignLabel": "Klasik Seviye 11 / 20",
    "title": "11. İkilem: Narsist",
    "question": "Tramvay 5 yabancıya gidiyor. Kolu çekersen senin birebir klonun ölecek. 5 Yabancı vs. Senin birebir klonun: kaçışın yok.",
    "straightTrack": {
      "label": "5 yabancı",
      "count": 5,
      "entityType": "people",
      "description": "Ana raydaki 5 yabancı",
      "isHuman": true
    },
    "divertedTrack": {
      "label": "Senin birebir klonun",
      "count": 1,
      "entityType": "clone",
      "description": "Yan raydaki birebir klonun",
      "isHuman": true
    },
    "straightActionLabel": "Klonunu kurtar",
    "divertedActionLabel": "5 yabancıyı kurtar",
    "straightCommentary": "Klonun yaşadı; beş yabancı öldü. Chat devasa egonla dalga geçiyor.",
    "divertedCommentary": "Beş yabancı yaşadı; klonun öldü. Chat özgüvensizliğinle dalga geçiyor.",
    "chatReaction": "Her türlü zorbalanacaksın: klonu öldürürsen özgüvensiz, kurtarırsan narsist.",
    "twitchEmote": "5HEAD"
  },
  {
    "id": 12,
    "campaignLabel": "Klasik Seviye 12 / 20",
    "title": "12. İkilem: Lobotomi",
    "question": "Tramvay 5 yabancıya gidiyor. Kolu çekersen tren sana çarpacak; ölmezsin ama IQ'n 40 puan düşecek ve 5 yabancı kurtulacak. Kendinle dalga geçmeye hazır mısın?",
    "straightTrack": {
      "label": "5 yabancı",
      "count": 5,
      "entityType": "people",
      "description": "Ana raydaki 5 yabancı",
      "isHuman": true
    },
    "divertedTrack": {
      "label": "Sen: IQ -40",
      "count": 1,
      "entityType": "yourself",
      "description": "Tren sana çarpıyor; hayattasın ama IQ'n 40 puan düşüyor",
      "isHuman": false
    },
    "straightActionLabel": "Kendini koru",
    "divertedActionLabel": "5 kişiyi kurtar (IQ -40)",
    "straightCommentary": "Beş kişi öldü; IQ'n değişmedi.",
    "divertedCommentary": "Beş kişi kurtuldu. Hayatta kaldın ama IQ'n 40 puan düştü.",
    "chatReaction": "Chat anında yapıştırdı: 'Abi sana bu tren yıllar önce çarpmış zaten'.",
    "twitchEmote": "5HEAD",
    "conceptualChoice": true
  },
  {
    "id": 13,
    "campaignLabel": "Klasik Seviye 13 / 20",
    "title": "13. İkilem: Yaş Farkı",
    "question": "Tramvay 5 tane 80 yaşında insana gidiyor. Kolu çekersen 1 bebek ölecek. Kalan ömür süresi mi, kurulmuş hayatlar ve anılar mı?",
    "straightTrack": {
      "label": "5 tane 80 yaşında insan",
      "count": 5,
      "entityType": "elderly",
      "description": "Ana raydaki 5 tane 80 yaşında insan",
      "isHuman": true
    },
    "divertedTrack": {
      "label": "1 bebek",
      "count": 1,
      "entityType": "baby",
      "description": "Yan raydaki 1 bebek",
      "isHuman": true
    },
    "straightActionLabel": "Bebeği kurtar",
    "divertedActionLabel": "5 yaşlı insanı kurtar",
    "straightCommentary": "Bebek yaşadı; beş yaşlı insan öldü.",
    "divertedCommentary": "Beş yaşlı insan yaşadı; bebek öldü.",
    "chatReaction": "Geyik bitti: chat 'kalan ömür süresi' ile 'kurulmuş hayatlar ve anılar' üzerinden karanlık matematik yapıyor.",
    "twitchEmote": "5HEAD"
  },
  {
    "id": 14,
    "campaignLabel": "Klasik Seviye 14 / 20",
    "title": "14. İkilem: Gözden Irak Olan",
    "question": "Tramvay gözünün önündeki 5 kişiye gidiyor. Kolu çekersen onlar kurtulacak ama dünyanın öbür ucunda 1 kişi ölecek ve sen hiç görmeyeceksin. Görmediğin bir ölüm daha mı kolay gelir?",
    "straightTrack": {
      "label": "Gözünün önündeki 5 kişi",
      "count": 5,
      "entityType": "people",
      "description": "Gözünün önündeki 5 kişi",
      "isHuman": true
    },
    "divertedTrack": {
      "label": "Dünyanın öbür ucundaki 1 kişi",
      "count": 1,
      "entityType": "people",
      "description": "Kolu çekince hiç görmeyeceğin 1 kişi",
      "isHuman": true
    },
    "straightActionLabel": "5 kişinin ölümünü izle",
    "divertedActionLabel": "Kolu çek (görmeden 1 kişi ölsün)",
    "straightCommentary": "Beş kişinin ölümüne tanık oldun.",
    "divertedCommentary": "Beş kişi kurtuldu; dünyanın öbür ucunda hiç görmediğin bir kişi öldü.",
    "chatReaction": "Modern hayatın ikiyüzlülüğü: tıpkı o telefonları üreten görünmez işçiler gibi.",
    "twitchEmote": "5HEAD"
  },
  {
    "id": 15,
    "campaignLabel": "Klasik Seviye 15 / 20",
    "title": "15. İkilem: Duyguları Olan Yapay Zeka",
    "question": "Tramvay 5 süper zeki, hisseden robota gidiyor. Kolu çekersen komadaki 1 insan ölecek. Hayat ve bilinç nedir?",
    "straightTrack": {
      "label": "5 süper zeki, hisseden robot",
      "count": 5,
      "entityType": "robot",
      "description": "Ana raydaki 5 hisseden robot",
      "isHuman": false
    },
    "divertedTrack": {
      "label": "Komadaki 1 insan",
      "count": 1,
      "entityType": "sleepers",
      "description": "Yan raydaki komadaki 1 insan",
      "isHuman": true
    },
    "straightActionLabel": "İnsanı kurtar",
    "divertedActionLabel": "Robotları kurtar",
    "straightCommentary": "İnsan yaşadı; beş hissedebilen robot yok oldu.",
    "divertedCommentary": "Beş robot kurtuldu; komadaki insan öldü.",
    "chatReaction": "10 bin kişilik chat 'hayat ve bilinç nedir?' diye birbirine girdi; modlar fazla mesai yaptı.",
    "twitchEmote": "5HEAD"
  },
  {
    "id": 16,
    "campaignLabel": "Klasik Seviye 16 / 20",
    "title": "16. İkilem: İnsanlık Mirası",
    "question": "Tramvay 1 canlı insana gidiyor. Kolu çekersen içinde Mona Lisa, kelliğin çaresi ve GTA 6'nın kaynak kodları olan bir kasa yok olacak. Sanat/Bilim mi, İnsan Hayatı mı?",
    "straightTrack": {
      "label": "1 canlı insan",
      "count": 1,
      "entityType": "people",
      "description": "Ana raydaki 1 canlı insan",
      "isHuman": true
    },
    "divertedTrack": {
      "label": "Mona Lisa, kelliğin çaresi ve GTA 6'nın kaynak kodları olan kasa",
      "count": 1,
      "entityType": "mysterybox",
      "description": "Yan raydaki insanlık mirası sandığı",
      "isHuman": false
    },
    "straightActionLabel": "Sandığı kurtar",
    "divertedActionLabel": "İnsanı kurtar",
    "straightCommentary": "Sandık kurtuldu; bir canlı insan öldü. Chat GTA 6 için o adamı %100 harcadı.",
    "divertedCommentary": "İnsan kurtuldu; Mona Lisa, kelliğin çaresi ve GTA 6'nın kaynak kodları yok oldu.",
    "chatReaction": "Klasik 'Sanat/Bilim mi, İnsan Hayatı mı?' sorusunun oyuncu/internet kitlesine uyarlanmış hali.",
    "twitchEmote": "5HEAD"
  },
  {
    "id": 17,
    "campaignLabel": "Klasik Seviye 17 / 20",
    "title": "17. İkilem: Döngü",
    "question": "Tramvay 5 kişiye gidiyor. Kolu çekersen daire çizen raydaki 1 kişiye çarpacak; o kişinin bedeni treni yavaşlatıp 5 kişiyi kurtaracak. Yine sadece kolu çekiyorsun ama 1 kişiyi bilerek etten kalkan olarak kullanıyorsun. 1. sorudan neden farklı hissettiriyor?",
    "straightTrack": {
      "label": "5 kişi",
      "count": 5,
      "entityType": "people",
      "description": "Ana raydaki 5 kişi",
      "isHuman": true
    },
    "divertedTrack": {
      "label": "Bedeni treni yavaşlatacak 1 kişi",
      "count": 1,
      "entityType": "people",
      "description": "Daire raydaki, bedeni treni yavaşlatacak 1 kişi",
      "isHuman": true
    },
    "straightActionLabel": "Müdahale etme",
    "divertedActionLabel": "Kolu çek (etten kalkan)",
    "straightCommentary": "Beş kişi öldü; tek kişi yaşadı.",
    "divertedCommentary": "Bir kişinin bedeni treni yavaşlattı; o öldü, beş kişi kurtuldu.",
    "chatReaction": "Şişman Adam'da kimse adamı itmek istememişti; burada chat'in beyni yanıyor.",
    "twitchEmote": "5HEAD"
  },
  {
    "id": 18,
    "campaignLabel": "Klasik Seviye 18 / 20",
    "title": "18. İkilem: Zaman Yolcusu",
    "question": "Tramvay bugün yaşayan 1 kişiye gidiyor. Kolu çekersen 2400 yılındaki 100 kişi ölecek. İnsanlar geleceği aslında ne kadar umursuyor?",
    "straightTrack": {
      "label": "Bugün yaşayan 1 kişi",
      "count": 1,
      "entityType": "people",
      "description": "Ana raydaki bugün yaşayan 1 kişi",
      "isHuman": true
    },
    "divertedTrack": {
      "label": "2400 yılındaki 100 kişi",
      "count": 100,
      "entityType": "futurepeople",
      "description": "Yan raydaki 2400 yılının 100 kişisi",
      "isHuman": true
    },
    "straightActionLabel": "Geleceği kurtar",
    "divertedActionLabel": "Bugünkü kişiyi kurtar",
    "straightCommentary": "Bugünkü kişi öldü; 2400 yılındaki yüz kişi yaşadı.",
    "divertedCommentary": "Bugünkü kişi kurtuldu; 2400 yılındaki yüz kişi öldü.",
    "chatReaction": "Chat 2400 yılını gözünü kırpmadan yok etti; iklim krizi ve 'Boomer' zihniyeti muhabbeti döndü.",
    "twitchEmote": "5HEAD"
  },
  {
    "id": 19,
    "campaignLabel": "Klasik Seviye 19 / 20",
    "title": "19. İkilem: Şovmen Tren",
    "question": "Tramvay 5 kişiye gidiyor. Kolu çekersen diğer raydaki 5 kişi ölecek ama tren insanları ezmeden önce havada efsane bir 'kickflip' atacak. Sırf havalı bir hareket için bir trajediye aktif olarak ortak olur musun?",
    "straightTrack": {
      "label": "Ana raydaki 5 kişi",
      "count": 5,
      "entityType": "people",
      "description": "Ana raydaki 5 kişi",
      "isHuman": true
    },
    "divertedTrack": {
      "label": "Yan raydaki 5 kişi + kickflip",
      "count": 5,
      "entityType": "people",
      "description": "Kickflip sonrası ezilecek yan raydaki 5 kişi",
      "isHuman": true
    },
    "straightActionLabel": "Kickflip yapma",
    "divertedActionLabel": "Kickflip için kolu çek",
    "straightCommentary": "Ana raydaki beş kişi öldü; kickflip olmadı.",
    "divertedCommentary": "Yan raydaki beş kişi öldü; tramvay havada efsane bir kickflip attı.",
    "chatReaction": "Trial by Trolley / Neal.fun esintisi: chat kesinlikle EVET oyu verecek.",
    "twitchEmote": "5HEAD"
  },
  {
    "id": 20,
    "campaignLabel": "Klasik Seviye 20 / 20",
    "title": "20. İkilem: Büyük Final",
    "question": "5 kurgusal insan ölecek. Kolu çekip onları kurtarırsan anında \"Yayını Kapat\" tuşuna basman gerekiyor. 60 saniyelik anket: kendi eğlencen mi, yoksa yayını aniden kapatma meme'i mi?",
    "straightTrack": {
      "label": "5 kurgusal insan",
      "count": 5,
      "entityType": "people",
      "description": "Ana raydaki 5 kurgusal insan",
      "isHuman": false
    },
    "divertedTrack": {
      "label": "Yayının devamı (kapatılacak)",
      "count": 1,
      "entityType": "streamer",
      "description": "Kurtarınca sona erecek yayın",
      "isHuman": false
    },
    "straightActionLabel": "Karakterleri bırak, yayına devam et",
    "divertedActionLabel": "Kurtar ve 'Yayını Kapat' tuşuna bas",
    "straightCommentary": "Kurgusal karakterler öldü; yayın devam ediyor.",
    "divertedCommentary": "Kurgusal karakterler kurtuldu. Tek kelime etmeden kolu çekip yayını şak diye kapattın.",
    "chatReaction": "Artık chat için gerçek bir bedel var: kendi eğlenceleri mi, yayını kapatma meme'i mi?",
    "twitchEmote": "5HEAD",
    "conceptualChoice": true
  }
];
