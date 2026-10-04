import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';
import { lessons, checkLessonTrace } from '../src/lib/lessons';
import { parseVcd } from '../src/lib/vcd';
import type { Project, SimulationResult } from '../shared/types';

const origin = process.env.YOSIS_API ?? 'http://127.0.0.1:3001';
async function request<T>(url:string,init?:RequestInit):Promise<T> {
  const response = await fetch(`${origin}${url}`,{...init,signal:AbortSignal.timeout(60000)});
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? `HTTP ${response.status}`);
  return result as T;
}
async function simulate(project:Project,lesson:typeof lessons[number]):Promise<SimulationResult> {
  let result = await request<SimulationResult>('/api/simulations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({project,config:lesson.config})});
  const deadline = Date.now()+60000;
  while (result.status === 'queued'||result.status === 'running') {
    if(Date.now()>deadline){await request(`/api/simulations/${result.id}/cancel`,{method:'POST'});throw new Error('Simulation timeout');}
    await sleep(350);result=await request<SimulationResult>(`/api/simulations/${result.id}`);
  }
  assert.equal(result.status,'success',result.error);
  assert.ok(result.vcd);
  return result;
}
const solutions:Record<string,(source:string)=>string>={
  not:source=>source.replace("assign y = 1'b0",'assign y = ~a'),
  and:source=>source.replace("assign y = 1'b0",'assign y = a & b'),
  mux:source=>source.replace("assign y = 1'b0",'assign y = select ? b : a'),
  counter:source=>source.replace('count <= count;','count <= count + 4\'d1;'),
};
for(const lesson of lessons){
  const starter=await simulate(lesson.project,lesson);
  assert.ok(checkLessonTrace(lesson,parseVcd(starter.vcd!)).some(item=>!item.passed),`${lesson.id}: incomplete starter must fail`);
  const solved=structuredClone(lesson.project);solved.files[0].content=solutions[lesson.id](solved.files[0].content);
  const simulation=await simulate(solved,lesson);
  const verdicts=checkLessonTrace(lesson,parseVcd(simulation.vcd!));
  assert.equal(verdicts.every(item=>item.passed),true,JSON.stringify(verdicts));
  console.log(`PASS ${lesson.id}: starter fails; reference solution passes ${verdicts.length} real Icarus checks`);
}
