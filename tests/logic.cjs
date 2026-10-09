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
const elements={};const document={getElementById:id=>elements[id]||(elements[id]=new Element()),createElement:()=>new Element(),addEventListener(){},querySelector:()=>new Element()};
const sandbox={document,window:{addEventListener(){}},Image:class{},setTimeout:()=>1,clearTimeout(){},requestAnimationFrame:fn=>fn(),matchMedia:()=>({matches:true}),console};
vm.createContext(sandbox);
const base=require('path').resolve(__dirname,'..')+'/';
for(const f of ['data/scenario.js','data/events.js','data/saves.js'])vm.runInContext(fs.readFileSync(base+f,'utf8'),sandbox);
const html=fs.readFileSync(base+'index.html','utf8');
vm.runInContext([...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n'),sandbox);
const run=c=>vm.runInContext(c,sandbox);
const check=c=>assert(run(c),c);
const end=()=>run('for(let i=0;i<30&&state.mode==="dialogue"&&!choicesPending;i++)advance()');
const click=label=>{const b=elements.panelBody.children.find(x=>x.textContent===label)||elements.dialogueChoices.children.find(x=>x.textContent===label);assert(b,'button: '+label);b.onclick({stopPropagation(){}})};
check('state.mode==="exploration"');elements.move.onclick();click('旧校舎の廊下');check('state.room==="corridor"');
elements.menu.onclick();click('もちもの');click('もどる');elements.close.onclick();
run('moveTo("classroom");examine("desk")');end();check('choicesPending');click('スケッチについて聞く');check('state.flags.sketchDiscussed');end();
run('examine("desk")');end();click('作品棚について聞く');end();check('state.flags.shelfDiscussed');
run('examine("desk")');end();click('会話を終える');end();check('state.mode==="exploration"');
run('examine("shelf")');end();check('state.flags.shelfChecked');
run('moveTo("corridor");examine("notice")');end();run('moveTo("classroom")');check('state.flags.revisitNoticed && state.mode==="dialogue"');end();
run('examine("shelf")');end();check('state.flags.foundClue && state.inventory.length===1');
run('examine("shelf")');end();check('state.inventory.length===1');
run('moveTo("corridor");moveTo("classroom")');check('state.mode==="exploration"');
run('showEvidence()');click('整理票の切れ端');end();check('state.mode==="deduction"');
click('1. 作品が突然消えた');check('state.errors===1');click('2. 整理作業で移動された可能性がある');click('3. 整理票の切れ端と作品整理日の掲示');end();check('state.flags.deductionDone && state.mode==="exploration"');
run('showTopicChoices([{label:"hidden",when:{foundClue:false}},{id:"once-choice",once:true,label:"once",set:{test:true},next:"end"}])');
assert.equal(elements.dialogueChoices.children.length,1);click('once');end();check('state.flags.test && state.completedEvents["once-choice"]');
run('showTopicChoices([{id:"once-choice",once:true,label:"once"}])');check('state.mode==="exploration" && !choicesPending');
// 未成立の再訪条件と、同じ場所を選択した場合の訪問回数。
run('Object.assign(state,{room:"classroom",flags:{...SCENARIO.initial.flags},visits:{classroom:1},completedEvents:{},inventory:[]});moveTo("classroom")');
check('state.visits.classroom===1');run('moveTo("corridor");moveTo("classroom")');check('state.mode==="exploration" && !state.flags.revisitNoticed');
console.log('PASS: DOM substitute logic regression: movement, menu, 3 choices, revisit positive/negative, once, evidence, deduction wrong/correct, hidden/consumed choices, same-room visit.');
