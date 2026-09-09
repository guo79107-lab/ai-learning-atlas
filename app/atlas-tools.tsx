'use client';
import { useEffect } from 'react';
import lessons from './lessons.json';
import { readProgress } from './atlas-store';
type Tool={name:string;title:string;description:string;inputSchema:object;annotations:{readOnlyHint:boolean;untrustedContentHint:boolean};execute:(input:unknown)=>unknown};
type Registry={registerTool:(tool:Tool,options:{signal:AbortSignal})=>void|Promise<void>};
export default function AtlasTools(){
 useEffect(()=>{
  const registry=(document as Document&{modelContext?:Registry}).modelContext;
  if(!registry?.registerTool)return;
  const lifecycle=new AbortController();
  const tools:Tool[]=[
   {name:'read_learning_progress',title:'查看学习进度',description:'Read completed chapter numbers and the last visited chapter on this device. Does not return private notes.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute(input){if(input===null||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)throw new Error('Expected an empty object');const p=readProgress();return {completed:p.completed,lastChapter:p.last,total:11};}},
   {name:'read_learning_chapter',title:'阅读学习章节',description:'Read one of the 11 public AI learning chapters and its original course source. Does not mark it complete.',inputSchema:{type:'object',properties:{chapter:{type:'integer',minimum:1,maximum:11}},required:['chapter'],additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute(input){if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>k!=='chapter'))throw new Error('Expected a chapter number');const id=(input as {chapter?:unknown}).chapter;if(typeof id!=='number'||!Number.isInteger(id)||id<1||id>11)throw new Error('Chapter must be 1–11');const l=lessons[id-1];return {id,title:l.title,intro:l.intro,takeaways:l.takeaways,source:l.source,url:`/learn/${id}`};}}
  ];
  for(const tool of tools){try{void Promise.resolve(registry.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{/* Unsupported registries do not affect the learning interface. */}}
  return()=>lifecycle.abort();
 },[]);return null;
}
