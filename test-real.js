/**
 * Test fonctionnel réel — exécute les vraies fonctions de normalize.js
 * en important le module avec main() désactivé.
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load module code
let code = readFileSync(join(__dirname, 'scripts', 'normalize.js'), 'utf-8');

// Disable main() auto-run and export the functions we need
code = code.replace(/\nmain\(\);/, '\n');
code += `
export { generateSEODescription, countWords, generateRichFallbackDescription, generateCategoryParagraph, generateSEODescriptionContexte, DEPT_CODE_TO_NAME };
`;

const testModulePath = join(__dirname, 'scripts', '.normalize-test-export.mjs');
writeFileSync(testModulePath, code, 'utf-8');

const mod = await import('./scripts/.normalize-test-export.mjs');
const { generateSEODescription, countWords } = mod;

// ── Test data ──
const events = [
  {
    name: 'Espagne 1936 (enfants, Paris)',
    data: {
      titre: 'Espagne 1936 : La démocratie assassinée.',
      dateDebut: '2029-06-08T19:00:00+00:00',
      dateFin: '2029-06-08T21:00:00+00:00',
      lieuCommune: 'Paris',
      lieuNom: 'Fnac St Lazare',
      categorie: 'enfants',
      descriptionLongue: '',
      descriptionCourte: '« La cause des enfants » de Keren Célia:Durant la guerre civile espagnole, près de 15 000 enfants sont évacués de la zone républicaine en France. C\'est à ce phénomène méconnu que s\'intéresse cet ouvrage, étudiant l\'évacuation de ces enfants comme le résultat d\'une mobilisation.',
      gratuit: true,
      prixIndicatif: 'Entrée libre, accès dans la limite des places disponibles.',
      lieuDepartement: '75',
      departementNumero: '75',
    },
  },
  {
    name: 'Concert Belinda Davids (concert, Paris)',
    data: {
      titre: 'Concert de Belinda Davids : A Tribute to Whitney Houston',
      dateDebut: '2026-11-11T20:00:00+00:00',
      dateFin: '2026-11-11T23:00:00+00:00',
      lieuCommune: 'Paris',
      lieuNom: 'Salle Pleyel',
      categorie: 'concert',
      descriptionLongue: 'En 2017, BELINDA DAVIDS remporte l\'émission "Even Better Than the Real Thing" de la BBC. Après QUEEN, ELTON JOHN et JJ GOLDMAN, Richard WALTER PRODUCTIONS relève le défi de vous faire revivre le spectacle d\'une autre icone mondiale.',
      descriptionCourte: 'A TRIBUTE TO WHITNEY HOUSTON BY BELINDA DAVIDS.',
      gratuit: false,
      prixIndicatif: 'À partir de 45€',
      lieuDepartement: '75',
      departementNumero: '75',
    },
  },
  {
    name: 'Spectacle Père-Lachaise (spectacle, Paris, descriptions pauvres)',
    data: {
      titre: 'Ta mémoire est leur seule sépulture : les monuments du Père-Lachaise',
      dateDebut: '2026-08-26T16:00:00+00:00',
      dateFin: '2026-08-26T18:00:00+00:00',
      lieuCommune: 'Paris',
      lieuNom: 'Mémorial de la Shoah',
      categorie: 'spectacle',
      descriptionLongue: '',
      descriptionCourte: 'À travers la découverte de ces lieux de mémoire cachés, nous serons invités à nous interroger sur leur conception et la notion de mémoire collective.',
      gratuit: false,
      prixIndicatif: 'Tarif : 6€',
      lieuDepartement: '75',
      departementNumero: '75',
    },
  },
];

console.log('='.repeat(80));
console.log('🧪 TEST FONCTIONNEL RÉEL — generateSEODescription');
console.log('='.repeat(80));

let globalPass = true;

for (const { name, data } of events) {
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`📌 ${name}`);
  console.log(`${'─'.repeat(80)}`);

  // Run the actual function (run it 3 times to check variation)
  const outputs = [];
  for (let i = 0; i < 3; i++) {
    outputs.push(generateSEODescription({ ...data }));
  }
  const result = outputs[0];
  const chars = result.length;
  const words = countWords(result);

  console.log(`\n📏 Longueur: ${chars} caractères, ${words} mots`);
  console.log(`   ${chars >= 800 ? '✅' : '❌'} >= 800 caractères`);
  console.log(`   ${words >= 150 ? '✅' : '❌'} >= 150 mots`);
  console.log();

  // Show the output
  console.log('📝 Description générée (extrait 400 premiers caractères):');
  console.log(result.substring(0, 400));
  console.log('...');
  console.log();

  // Structured checks
  const checks = [];

  // Requirement 1: descriptionCourte used
  const usesShortDesc = data.descriptionLongue.length === 0 && data.descriptionCourte.length > 0;
  checks.push({ req: 1, label: 'descriptionCourte comme source', pass: !usesShortDesc || result.includes(data.descriptionCourte.substring(20, 60)) });

  // Requirement 2: contexte SEO
  checks.push({ req: 2, label: 'Contexte SEO (ville + département)', pass: result.includes('Paris') });

  // Requirement 3: min length
  checks.push({ req: 3, label: 'Longueur minimale 800 chars', pass: chars >= 800 });

  // Requirement 4/5: category paragraphs
  if (data.categorie === 'enfants') {
    checks.push({ req: 4, label: 'Paragraphe activités familiales', pass: /famille|enfants|jeune public|ateliers/i.test(result) });
  }
  if (data.categorie === 'concert') {
    checks.push({ req: 5, label: 'Paragraphe genre musical', pass: /musique|concert|scène musicale/i.test(result) });
  }
  if (data.categorie === 'spectacle') {
    checks.push({ req: 5, label: 'Paragraphe genre spectacle', pass: /spectacle|scène|théâtre|arts de la scène/i.test(result) });
  }

  // Requirement 6: infos pratiques with h3 + ul
  checks.push({ req: 6, label: 'Section "Informations pratiques" (h3 + ul)', pass: result.includes('<h3>Informations pratiques</h3>') && result.includes('<ul>') && result.includes('</ul>') });
  checks.push({ req: 6, label: 'Département dans infos pratiques', pass: result.includes('<strong>Département :</strong> Paris') });
  checks.push({ req: 6, label: 'Catégorie dans infos pratiques', pass: result.includes('<strong>Catégorie :</strong>') });

  // Check variation across runs (not identical)
  const allSame = outputs.every(o => o === outputs[0]);
  checks.push({ req: 7, label: 'Variation aléatoire (3 runs différents)', pass: !allSame });

  let allPass = true;
  for (const c of checks) {
    const icon = c.pass ? '✅' : '❌';
    if (!c.pass) { allPass = false; globalPass = false; }
    console.log(`   ${icon} [Req ${c.req}] ${c.label}`);
  }
  console.log(allPass ? `\n✅ TOUS LES TESTS PASSÉS pour "${name}"` : `\n❌ ÉCHEC pour "${name}"`);
}

// Cleanup
writeFileSync(testModulePath, '', 'utf-8');

console.log(`\n${'='.repeat(80)}`);
console.log(globalPass ? '✅ RÉSULTAT GLOBAL: TOUS LES TESTS PASSENT' : '❌ RÉSULTAT GLOBAL: DES TESTS ÉCHOUENT');
console.log('='.repeat(80));
