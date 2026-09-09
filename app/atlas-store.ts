'use client';
import { useSyncExternalStore } from 'react';
export const TOTAL=11;
export const number=(n:number)=>String(n).padStart(2,'0');
export const stages=[{name:'认识 AI',slug:'understand',start:1,end:3,note:'看懂它如何工作'},{name:'练习判断',slug:'judge',start:4,end:8,note:'让答案经得起推敲'},{name:'学会合作',slug:'collaborate',start:9,end:11,note:'把方法带回真实任务'}];
export const stageFor=(id:number)=>stages[id<=3?0:id<=8?1:2];
type Progress={completed:number[];notes:Record<string,string>;last:number;available:boolean};
const EMPTY:Progress={completed:[],notes:{},last:1,available:true};
const KEY='ai-learning-atlas:v1';
let snapshot:Progress|undefined;
const listeners=new Set<()=>void>();
export function normalizeProgress(raw:unknown):Progress {
 if(!raw||typeof raw!=='object')return EMPTY;
 const v=raw as Partial<Progress>, notes:Record<string,string>={};
 if(v.notes&&typeof v.notes==='object')for(let id=1;id<=TOTAL;id++)if(typeof v.notes[id]==='string')notes[id]=v.notes[id].slice(0,3000);
 return {completed:Array.isArray(v.completed)?[...new Set(v.completed.filter(n=>Number.isInteger(n)&&n>=1&&n<=TOTAL))]:[],notes,last:typeof v.last==='number'&&Number.isInteger(v.last)&&v.last>=1&&v.last<=TOTAL?v.last:1,available:true};
}
function getSnapshot(){if(typeof window==='undefined')return EMPTY;if(!snapshot){try{snapshot=normalizeProgress(JSON.parse(localStorage.getItem(KEY)||'null'));}catch{snapshot={...EMPTY,available:false};}}return snapshot;}
export const readProgress=()=>getSnapshot();
function onStorage(event:StorageEvent){if(event.key!==KEY&&event.key!==null)return;try{snapshot=normalizeProgress(JSON.parse(event.newValue||'null'));}catch{snapshot=EMPTY;}for(const notify of listeners)notify();}
function subscribe(callback:()=>void){if(listeners.size===0)window.addEventListener('storage',onStorage);listeners.add(callback);return()=>{listeners.delete(callback);if(listeners.size===0)window.removeEventListener('storage',onStorage);};}
function update(change:(p:Progress)=>Progress){let base=getSnapshot();if(base.available){try{base=normalizeProgress(JSON.parse(localStorage.getItem(KEY)||'null'));}catch{/* Preserve this tab's work if storage is unavailable. */}}snapshot=change(base);try{localStorage.setItem(KEY,JSON.stringify(snapshot));snapshot={...snapshot,available:true};}catch{snapshot={...snapshot,available:false};}for(const notify of listeners)notify();}
export const markComplete=(id:number)=>{if(id>=1&&id<=TOTAL)update(p=>({...p,completed:[...new Set([...p.completed,id])],last:Math.min(TOTAL,id+1)}));};
export const rememberChapter=(id:number)=>{if(id>=1&&id<=TOTAL)update(p=>({...p,last:id}));};
export const saveNote=(id:number,note:string)=>update(p=>({...p,notes:{...p.notes,[id]:note.slice(0,3000)}}));
export const useProgress=()=>useSyncExternalStore(subscribe,getSnapshot,()=>EMPTY);
function motionSubscribe(callback:()=>void){const m=window.matchMedia('(prefers-reduced-motion: reduce)');m.addEventListener('change',callback);return()=>m.removeEventListener('change',callback);}
export const useReducedMotion=()=>useSyncExternalStore(motionSubscribe,()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches,()=>true);
