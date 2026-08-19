// Test for deduplicateDescription
function deduplicateDescription(text, sourceId) {
  if (!text) return '';
  let t = String(text);
  t = t.replace(/\[([^\]]*)\]\((https?:\/\/[^)]*?(?:openagenda|mobilizon)[^)]*)\)/gi, '');
  t = t.replace(/https?:\/\/\S*?openagenda\s*\.?\s*com\S*/gi, '');
  t = t.replace(/https?:\/\/\S*?mobilizon\.fr\S*/gi, '');
  t = t.replace(/openagenda\s*\.\s*com\S*/gi, '');
  t = t.replace(/mobilizon\.fr\S*/gi, '');
  t = t.replace(/\(\)/g, '');
  t = t.replace(/\[\]/g, '');
  t = t.replace(/\(\s*\)/g, '');
  t = t.replace(/\[{1,3}\**\s*BILLETTERIE\s*\**\]{1,3}\([^)]*\)/gi, '');
  t = t.replace(/\*{0,3}BILLETTERIE\*{0,3}/gi, '');
  t = t.replace(/R[ée]servez\s+(vos|votre)\s+(billets?|place|entr[ée]e|pass)\s*/gi, '');
  t = t.replace(/Retrouvez\s+(cet\s+)?(l['\u2019])?[ée]v[ée]nements?\s+sur\s+/gi, '');
  t = t.replace(/Pour\s+plus\s+d['\u2019]informations\s*:?\s*https?:\/\/[^\s)]+/gi, '');
  t = t.replace(/En\s+savoir\s+plus\s*:?\s*https?:\/\/[^\s)]+/gi, '');
  t = t.replace(/https?:\/\/[^\s)]+[^.]*?Cliquez\s+ici/gi, '');
  t = t.replace(/Cliquez\s+ici[^.]*?https?:\/\/[^\s)]+/gi, '');
  t = t.replace(/\([cC]\)\s*/g, '');
  t = t.replace(/\s*©\s*[A-Za-z\u00C0-\u024F]+(?:\s+[A-Za-z\u00C0-\u024F]+){0,1}/g, '');
  t = t.replace(/\s*©/g, '');
  t = t.replace(/Cr[ée]dit\s+(photo|illustration)\s*/gi, '');
  t = t.replace(/®/g, '');
  t = t.replace(/™/g, '');
  t = t.replace(/\s+/g, ' ').trim();
  t = t.replace(/\s*###\s*/g, ' ');
  t = t.replace(/_{3,}/g, '');
  t = t.replace(/---+/g, '');
  t = t.replace(/\s+,/g, ',');
  t = t.replace(/\s+\./g, '.');
  t = t.replace(/\s+;/g, ';');
  t = t.replace(/\s+:/g, ':');
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

let pass = 0, fail = 0;

function test(name, input, sourceId, expected) {
  const result = deduplicateDescription(input, sourceId);
  const ok = expected instanceof RegExp ? expected.test(result) : result === expected;
  if (ok) {
    console.log(`✅ ${name}`);
    pass++;
  } else {
    console.log(`❌ ${name}`);
    console.log(`  Input:    "${input.substring(0, 80)}..."`);
    console.log(`  Expected: "${expected}"`);
    console.log(`  Got:      "${result}"`);
    fail++;
  }
}

test('BILLETTERIE markdown link', '[**BILLETTERIE**](https://openagenda. com/loiret/contribute/event) Un super événement', 'openagenda-loiret', 'Un super événement');
test('OpenAgenda bare URL', 'Visitez https://openagenda. com/fr/jep-2026/events/12345 pour plus', 'jep-2026', 'Visitez pour plus');
test('Copyright 2 words after ©', 'Texte de description. ©Yann Sévin Plus de texte', 'openagenda-orleans', 'Texte de description. Plus de texte');
test('Trademark removal', 'La Biodanza® est une invitation Playmobil®', 'openagenda-loiret', 'La Biodanza est une invitation Playmobil');
test('Réservez vos billets', 'Venez nombreux ! Réservez vos billets en ligne', 'openagenda', 'Venez nombreux ! en ligne');
test('Separator cleanup', 'Du texte ___ et ----- du texte', 'openagenda', 'Du texte et du texte');
test('Crédit photo copyright', 'Concert de jazz. Crédit photo ©Mme Suzie', 'nantes', 'Concert de jazz.');
test('Empty after BILLETTERIE link', '[**BILLETTERIE**](https://openagenda. com/loiret/contribute/event)', 'openagenda-loiret', '');
test('Pour plus d\'infos + URL', 'Super événement. Pour plus d\'informations https://example.com/info', 'openagenda', 'Super événement.');
test('Multiple bare URLs', 'Voir https://openagenda. com/fr/a/1 et https://openagenda. com/fr/b/2', 'test', 'Voir et');
test('Mobilizon URL', 'En savoir plus sur https://mobilizon.fr/events/12345', 'mobilizon-france', 'En savoir plus sur');
test('Markdown links openagenda', 'visitez [A](https://openagenda. com/fr/a/1) et [B](https://openagenda. com/fr/b/2)', 'test', 'visitez et');
test('(c) copyright notation', 'Copyright (c) 2026 Super Event', 'test', 'Copyright 2026 Super Event');
test('### + BILLETTERIE real example', 'Céline Gorget. ### [**BILLETTERIE**](https://openagenda. com/loiret/contribute/event) Une heure', 'openagenda', /^Céline Gorget\.\s*Une heure/);
test('Markdown link removed, text gone', 'Découvrez aussi [visite](https://openagenda. com/fr/ara/events/99447660) avec Amadè', 'test', 'Découvrez aussi avec Amadè');
test('Multiple markdown links comma', 'Découvrez [A](https://openagenda. com/fr/a/1), [B](https://openagenda. com/fr/b/2) et [C](https://openagenda. com/fr/c/3)', 'test', 'Découvrez, et');
test('Copyright Crédit photo', 'pendant le concert. Crédit photo ©Mme Suzie', 'nantes', 'pendant le concert.');
test('©ÉDITIONS uppercase', 'PRIX RENAUDOT 2017, ©ÉDITIONS GRASSET', 'idf', 'PRIX RENAUDOT 2017,');
test('réservation preserved', 'Information et réservation : 01 23 45 67 89', 'test', 'Information et réservation: 01 23 45 67 89');
test('Normal URL preserved', 'Plus d\'infos sur https://www.example.com/event', 'test', 'Plus d\'infos sur https://www.example.com/event');
test('Instagram URL preserved', 'Suivez-nous sur https://www.instagram.com/event', 'test', 'Suivez-nous sur https://www.instagram.com/event');
test('Real-world: jep-hauts-de-france', 'Découvrez aussi [visite guidée](https://openagenda. com/fr/ara/events/99447660) avec Amadè & Tarik ou [visite libre](https://openagenda. com/fr/ara/events/8453283)', 'test', 'Découvrez aussi avec Amadè & Tarik ou');

console.log(`\n${pass}/${pass+fail} tests passed`);
process.exit(fail > 0 ? 1 : 0);