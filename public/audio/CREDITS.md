# Katkı / lisans

Bu projedeki tüm ses efektleri ve ambience döngüsü **tamamen prosedürel** olarak
`scripts/generate-audio.mjs` tarafından üretilmiştir.

- Hiçbir üçüncü taraf kayıt, sample kütüphanesi, müzik parçası veya stok ses
  kullanılmamıştır.
- Üretim tamamen deterministiktir (tohumlu PRNG), yani çıktı yeniden
  üretilebilir ve değişmez.
- Oluşan WAV dosyaları projenin kendi lisansı (Apache-2.0) kapsamındadır;
  yayında/stream'de kullanmak için ek izin gerekmez.

Kullanılan sentez teknikleri (hepsi sıfırdan yazılmış DSP): gürültü tamponları,
RBJ biquad ve tek kutuplu filtreler, zamanla değişen filtreler, modal (sönümlü
kısmi) sentez, additif testere/kare/üçgen osilatörler, ADSR/eksponansiyel
zarflar, Schroeder reverb (6 gecikmeli comb + 2 all-pass), `tanh` doyum,
pencereli-sinc yeniden örnekleme ve K-ağırlıklı (ITU-R BS.1770 tarzı)
yükseklik ölçümü.

Sesleri değiştirmek isterseniz `README.md` içindeki "Tek bir sesi gerçek
kayıtla değiştirme" bölümüne bakın. Kendi kaydınızı eklediğinizde onun
lisansından siz sorumlusunuz; depoya yalnızca haklarını elinizde tuttuğunuz
kayıtları ekleyin.
