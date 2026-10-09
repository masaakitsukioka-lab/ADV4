// DOM・Canvasを代替したロジック回帰。実ブラウザ操作/レイアウトの検証ではない。
const fs=require('fs'),vm=require('vm'),assert=require('assert');
class Element {
 constructor(){this.children=[];this.style={};this.dataset={};this.textContent='';this.offsetWidth=180;this.offsetHeight=50;const c=new Set();this.classList={add:x=>c.add(x),remove:x=>c.delete(x),contains:x=>c.has(x),toggle:(x,on)=>on?c.add(x):c.delete(x)};}
 set innerHTML(v){this.children=[]} appendChild(x){this.children.push(x)} replaceChildren(){this.children=[]}
 addEventListener(type,fn){this[type]=fn}
 getBoundingClientRect(){return {width:844,height:390,left:0,top:0,bottom:200}}
 getContext(){return {clearRect(){},fillRect(){}}}
 get nextElementSibling(){return this._next||(this._next=new Element())}
}
let reducedMotion=true,timerId=0,queries=0;const timers=new Map(),frames=[];const elements={};const document={getElementById:id=>elements[id]||(elements[id]=new Element()),createElement:()=>new Element(),addEventListener(type,fn){this[type]=fn},querySelector:()=>{queries++;return new Element()}};
const sandbox={document,window:{addEventListener(type,fn){this[type]=fn}},Image:class{},setTimeout:(fn,ms)=>{timers.set(++timerId,{fn,ms});return timerId},clearTimeout:id=>timers.delete(id),requestAnimationFrame:fn=>frames.push(fn),matchMedia:()=>({matches:reducedMotion}),console};
vm.createContext(sandbox);
const base=require('path').resolve(__dirname,'..')+'/';
for(const f of ['data/scenario.js','data/events.js','data/saves.js'])vm.runInContext(fs.readFileSync(base+f,'utf8'),sandbox);
const html=fs.readFileSync(base+'index.html','utf8');
vm.runInContext([...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n'),sandbox);
const run=c=>vm.runInContext(c,sandbox);
const check=c=>assert(run(c),c);
const end=()=>run('for(let i=0;i<30&&state.mode==="dialogue"&&!choicesPending;i++)advance()');
const click=label=>{const b=elements.panelBody.children.find(x=>x.textContent===label)||elements.dialogueChoices.children.find(x=>x.textContent===label);assert(b,'button: '+label);b.onclick({stopPropagation(){}})};

document.getElementById('panelBody');
const failures=[];
function test(name,fn){try{fn();console.log('PASS: '+name)}catch(e){failures.push(name+': '+e.message);console.log('FAIL: '+name)}}
const key=(target,extra={})=>{const e={key:'Enter',target,prevented:false,preventDefault(){this.prevented=true},...extra};document.keydown(e);return e};
const plain={closest:()=>null},button={closest:()=>({})};
const drain=()=>{let n=0;while(timers.size&&n++<300){const [id,t]=timers.entries().next().value;timers.delete(id);t.fn()}assert(n<300,'timer loop')};
test('choice and text-control buttons keep native Enter/Space activation',()=>{
 run('playTopic("intro")');end();check('choicesPending');
 assert.equal(key(button).prevented,false);assert.equal(key(button,{key:' '}).prevented,false);
});
test('IME and held keys do not advance dialogue',()=>{
 run('playTopic("sketch")');const before=run('state.lineIndex');
 key(plain,{repeat:true});assert.equal(run('state.lineIndex'),before);
 key(plain,{isComposing:true});assert.equal(run('state.lineIndex'),before);
 key(plain);assert.equal(run('state.lineIndex'),before+1);end();
});
test('canvas background clears target and command selection',()=>{
 run('state.selected="shelf"');elements.game.click({target:elements.pixelScene});check('state.selected===null');
 assert(elements.actions.classList.contains('hidden'));
});
test('resize recalculates open command position',()=>{
 run('state.selected="shelf"');const before=queries;sandbox.window.resize();assert(queries>before);
});
test('queued animation cannot reopen a finished dialogue',()=>{
 run('say([["ハルキ","短い会話"]])');end();while(frames.length)frames.shift()();
 check('state.mode==="exploration"');assert(!elements.dialogue.classList.contains('open'));
});
test('typing reveal, speed change, automatic advance and choice stop',()=>{
 reducedMotion=false;timers.clear();run('textSettings.index=1;textSettings.auto=false;playTopic("intro")');
 check('!typingDone');key(plain);check('typingDone && state.lineIndex===0');assert.equal(timers.size,0);
 key(plain);check('state.lineIndex===1 && !typingDone');
 elements.speedButton.onclick({stopPropagation(){}});drain();check('typingDone');
 elements.autoButton.onclick({stopPropagation(){}});assert.equal(timers.size,1);drain();check('choicesPending');assert.equal(timers.size,0);
 const i=run('state.lineIndex');key(plain);assert.equal(run('state.lineIndex'),i);
 click('スケッチについて聞く');drain();check('state.mode==="exploration"');assert.equal(timers.size,0);
 run('textSettings.auto=false');reducedMotion=true;
});
test('explicit choice display cancels pending automatic timer',()=>{
 run('textSettings.auto=true;playTopic("sketch")');assert(timers.size>0);
 run('showTopicChoices([{label:"終える",next:"end"}])');assert.equal(timers.size,0);
 click('終える');drain();check('state.mode==="exploration"');
});
if(failures.length){console.error(failures.join('\n'));process.exitCode=1}
