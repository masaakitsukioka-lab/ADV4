// 工程18: 手動セーブ3枠。描画やゲーム状態に副作用を持たない保存処理。
(function(global){
 'use strict';
 const FORMAT=1, PREFIX='saikachi.adv.save.';
 const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 const object=o=>o!==null&&typeof o==='object'&&!Array.isArray(o);
 const safe=k=>!['__proto__','prototype','constructor'].includes(k);
 const fail=()=>{throw new Error('保存データの形式が正しくないか、このシナリオに対応していません。')};
 function create(scenario,storageProvider){
  const flagTypes=new Map(Object.entries(scenario.initial.flags).map(([k,v])=>[k,typeof v]));
  const items=new Set(), events=new Set();
  function collect(value){
   if(!object(value)&&!Array.isArray(value))return;
   if(object(value.set))for(const [k,v] of Object.entries(value.set))flagTypes.set(k,typeof v);
   if(Array.isArray(value.give))value.give.forEach(i=>items.add(i));
   if(value.once&&value.id)events.add(value.id);
   Object.values(value).forEach(collect);
  }
  collect(scenario);
  function validate(data){
   if(!object(data)||data.format!==FORMAT||data.scenarioId!==scenario.meta.id||
      data.saveRevision!==scenario.meta.saveRevision||typeof data.savedAt!=='string'||
      !Number.isFinite(Date.parse(data.savedAt)))fail();
   const p=data.progress,settings=data.settings;
   if(!object(p)||typeof p.room!=='string'||!own(scenario.rooms,p.room)||!object(p.flags)||!object(p.visits)||
      !object(p.completedEvents)||!Array.isArray(p.inventory)||!object(settings))fail();
   const flags={...scenario.initial.flags},visits={},completedEvents={};
   for(const key of Object.keys(scenario.initial.flags))if(!own(p.flags,key))fail();
   for(const [k,v] of Object.entries(p.flags)){
    if(!safe(k)||!flagTypes.has(k)||typeof v!==flagTypes.get(k)||
       !['boolean','string','number'].includes(typeof v)||
       (typeof v==='number'&&!Number.isFinite(v)))fail();
    flags[k]=v;
   }
   for(const [k,v] of Object.entries(p.visits)){
    if(!safe(k)||!own(scenario.rooms,k)||!Number.isSafeInteger(v)||v<0)fail();visits[k]=v;
   }
   if(!(visits[p.room]>=1))fail();
   for(const [k,v] of Object.entries(p.completedEvents)){
    if(!safe(k)||!events.has(k)||v!==true)fail();completedEvents[k]=true;
   }
   if(p.inventory.some(i=>typeof i!=='string'||!items.has(i))||new Set(p.inventory).size!==p.inventory.length)fail();
   if(!Number.isInteger(settings.textSpeed)||settings.textSpeed<0||settings.textSpeed>3||typeof settings.auto!=='boolean')fail();
   return {format:FORMAT,scenarioId:data.scenarioId,saveRevision:data.saveRevision,savedAt:data.savedAt,
    progress:{room:p.room,flags,inventory:[...p.inventory],visits,completedEvents},
    settings:{textSpeed:settings.textSpeed,auto:settings.auto}};
  }
  function snapshot(state,settings){
   if(!['exploration','menu'].includes(state.mode))throw new Error('会話や推理を終えてから保存してください。');
   return validate({format:FORMAT,scenarioId:scenario.meta.id,saveRevision:scenario.meta.saveRevision,
    savedAt:new Date().toISOString(),progress:{room:state.room,flags:state.flags,inventory:state.inventory,
     visits:state.visits,completedEvents:state.completedEvents},settings:{textSpeed:settings.index,auto:settings.auto}});
  }
  function key(slot){if(!Number.isInteger(slot)||slot<1||slot>3)throw new Error('保存枠が正しくありません。');return PREFIX+scenario.meta.id+'.'+slot;}
  function raw(slot){
   const k=key(slot);
   try{return storageProvider().getItem(k)}catch(e){throw new Error('このブラウザでは保存領域を利用できません。ブラウザの設定を確認してください。')}
  }
  function decode(value){try{return validate(JSON.parse(value))}catch(e){fail()}}
  function read(slot){const value=raw(slot);return value===null?null:decode(value)}
  function write(slot,data){
   const k=key(slot),value=JSON.stringify(validate(data));
   try{storageProvider().setItem(k,value)}catch(e){throw new Error('保存できませんでした。保存領域の制限や空き容量を確認してください。以前のセーブは削除していません。')}
  }
  return {snapshot,validate,raw,read,write,decode};
 }
 global.SaikachiSaves={create};
})(window);
