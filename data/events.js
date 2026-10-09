// 工程16: UIに依存しない条件判定・イベント実行管理。
(function(global){
 'use strict';
 function matches(condition,state){
  if(condition==null)return true;
  if(typeof condition!=='object'||Array.isArray(condition))throw new Error('条件はオブジェクトで指定してください');
  return Object.entries(condition).every(([key,value])=>{
   if(key==='all')return value.every(c=>matches(c,state));
   if(key==='any')return value.some(c=>matches(c,state));
   if(key==='not')return !matches(value,state);
   if(key==='flags')return Object.entries(value).every(([k,v])=>state.flags[k]===v);
   if(key==='visits')return Object.entries(value).every(([room,range])=>{
    const n=state.visits[room]||0;
    return typeof range==='number'?n===range:
     (range.min===undefined||n>=range.min)&&(range.max===undefined||n<=range.max);
   });
   if(key==='items')return value.every(item=>state.inventory.includes(item));
   if(key==='done')return value.every(id=>state.completedEvents[id]===true);
   // v0.8の when: {flag: value} を引き続き受け付ける。
   return state.flags[key]===value;
  });
 }
 function available(event,state){
  if(event.once&&!event.id)throw new Error('onceイベントには一意なidが必要です');
  return !(event.once&&state.completedEvents[event.id])&&matches(event.when,state);
 }
 function apply(event,state){
  if(!available(event,state))return false;
  // 表示開始時に確定。連打による二重実行を防ぐ。
  if(event.once)state.completedEvents[event.id]=true;
  Object.assign(state.flags,event.set||{});
  for(const item of event.give||[])if(!state.inventory.includes(item))state.inventory.push(item);
  return true;
 }
 function enter(room,state){
  if(state.room===room)return false;
  state.room=room;state.visits[room]=(state.visits[room]||0)+1;return true;
 }
 global.SaikachiEvents={matches,available,apply,enter,select:(events,state)=>events.find(e=>available(e,state))};
})(window);
