import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runtime } from './browser-fixture.mjs';
test('imported formula machine IDs remain inert in exported spreadsheets', () => {
  const r=runtime();
  const rows=r.context.normalizeImportedRows(r.context.parseCsv('timestamp,machineId,temperature,vibration,rpm,runtimeHours\n2026-01-01,=1+1,25,1,1000,20'));
  assert.equal(rows.length,1);
  assert.equal(r.context.csvCell(rows[0].machineId),'"\'=1+1"');
  assert.equal(r.context.csvCell(-3),'"-3"');
});
test('hostile machine HTML is escaped in every rendered attribute', () => {
  const r=runtime();
  r.context.renderMachineSelect(['"><img src=x onerror=attack()>']);
  assert.doesNotMatch(r.node('#machineSelect').innerHTML,/<img/);
  assert.match(r.node('#machineSelect').innerHTML,/&quot;&gt;&lt;img/);
});
test('oversized CSV and excessive rows are rejected without rendering', () => {
  const r=runtime();
  assert.throws(()=>r.context.parseCsv('x'.repeat(5*1024*1024+1)),/5 MiB/);
  assert.throws(()=>r.context.parseCsv('header\n'+'row\n'.repeat(20001)),/20000/);
});
test('oversized file is refused before file.text and prior data remains intact', async () => {
  const r=runtime();let read=false;const before=r.run('readings.length');
  await r.node('#csvInput').listeners.change({target:{files:[{size:5*1024*1024+1,text(){read=true;}}],value:'test'}});
  assert.equal(read,false);assert.equal(r.run('readings.length'),before);
  assert.match(r.node('#statusMessage').textContent,/rejected/);
});
