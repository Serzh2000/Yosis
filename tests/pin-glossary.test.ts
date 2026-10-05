import test from 'node:test';
import assert from 'node:assert/strict';
import { explainFunction, explainPad, explainPin } from '../src/lib/pin-glossary';
import { packagePins } from '../src/lib/pin-planner';

test('pad names decode side, position and pair half', () => {
  const pad = explainPad('IOL47A')!;
  assert.match(pad.text, /левой стороне/);
  assert.match(pad.text, /47/);
  assert.match(pad.text, /первый вывод пары/);
  assert.match(explainPad('IOT27B')!.text, /верхней стороне[\s\S]*второй вывод пары/);
  assert.equal(explainPad('VCC'), null);
});

test('every special function of the package has a specific explanation', () => {
  const generic = 'Специальная функция вывода';
  for (const pin of packagePins)
    for (const name of pin.functions)
      assert.ok(!explainFunction(name).text.startsWith(generic), `${name} is not explained`);
  assert.match(explainFunction('GCLKT_6').text, /глобальной тактовой сети №6/);
  assert.match(explainFunction('LPLL2_C_FB').text, /PLL №2[\s\S]*обратной связи[\s\S]*инверсный/);
});

test('a pin explanation lists the signal, the board role and each printed name', () => {
  const led = packagePins.find((pin) => pin.number === 15)!;
  const terms = explainPin(led, 'LED0', 'led_n[0]').map((item) => item.term);
  assert.deepEqual(terms, ['led_n[0]', 'LED0', 'IOL47A', 'LPLL2_T_FB']);
  const power = explainPin(packagePins.find((pin) => pin.number === 1)!);
  assert.deepEqual(
    power.map((item) => item.term),
    ['питание'],
  );
});
