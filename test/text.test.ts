import test from 'node:test';
import assert from 'node:assert/strict';

import { estimateCharsPerLine, fitLines, wrapText, xmlEscape } from '../src/media/text.js';

test('wrapText respeita o limite e preserva palavras', () => {
  const lines = wrapText('uma frase curta para testar a quebra de linha', 12);
  assert.ok(lines.length > 1);
  for (const line of lines) {
    assert.ok(line.length <= 12, `linha excedeu: ${line}`);
  }
  assert.equal(lines.join(' ').replace(/\s+/g, ' '), 'uma frase curta para testar a quebra de linha');
});

test('wrapText preserva paragrafos vazios', () => {
  const lines = wrapText('primeiro\n\nsegundo', 20);
  assert.deepEqual(lines, ['primeiro', '', 'segundo']);
});

test('fitLines trunca com reticencias', () => {
  const { lines, truncated } = fitLines('a b c d e f g h i j', 3, 2);
  assert.equal(truncated, true);
  assert.equal(lines.length, 2);
  assert.ok(lines[1]?.endsWith('...'));
});

test('fitLines nao trunca quando cabe', () => {
  const { lines, truncated } = fitLines('texto curto', 40, 3);
  assert.equal(truncated, false);
  assert.deepEqual(lines, ['texto curto']);
});

test('xmlEscape neutraliza caracteres perigosos', () => {
  assert.equal(xmlEscape('<W-Tec> & "aspas"'), '&lt;W-Tec&gt; &amp; &quot;aspas&quot;');
});

test('estimateCharsPerLine devolve minimo seguro', () => {
  assert.ok(estimateCharsPerLine(888, 96) >= 8);
});
