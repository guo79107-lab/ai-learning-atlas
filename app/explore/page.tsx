'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp, BookOpen, Layers3 } from 'lucide-react';
import lessons from '../lessons.json';
import { number, rememberChapter, stages, stageFor, useProgress, useReducedMotion } from '../atlas-store';
const wrap=(n:number)=>((n%11)+11)%11;
export default function Explore(){
 const [active,setActive]=useState(0);const progress=useProgress(),reduced=useReducedMotion();
 const root=useRef<HTMLElement>(null),lastWheel=useRef(0),delta=useRef(0),pointer=useRef<number|null>(null),suppressClick=useRef(false);
 const lesson=lessons[active],stage=stageFor(lesson.id);
 const select=(index:number)=>{const n=wrap(index);setActive(n);rememberChapter(n+1);history.replaceState(null,'',`/explore?chapter=${n+1}`);};
 // Read the requested chapter only after hydration; the server has no query-state dependency.
 /* oxlint-disable react/react-compiler */
 useEffect(()=>{const p=new URLSearchParams(location.search);const id=Number(p.get('chapter'));const st=stages.find(s=>s.slug===p.get('stage'));if(st)setActive(st.start-1);else if(Number.isInteger(id)&&id>=1&&id<=11)setActive(id-1);},[]);
 /* oxlint-enable react/react-compiler */
 useEffect(()=>{const el=root.current;if(!el)return;
  const move=(step:number)=>{const n=wrap(active+step);setActive(n);rememberChapter(n+1);history.replaceState(null,'',`/explore?chapter=${n+1}`);};
  const wheel=(e:WheelEvent)=>{if(e.ctrlKey||Math.abs(e.deltaX)>Math.abs(e.deltaY))return;if((innerWidth<700||el.offsetHeight>innerHeight+10)&&!(e.target instanceof Element&&e.target.closest('.chapter-wheel')))return;e.preventDefault();const now=performance.now();if(now-lastWheel.current<650)return;delta.current+=e.deltaY*(e.deltaMode===1?20:1);if(Math.abs(delta.current)>38){move(Math.sign(delta.current));lastWheel.current=now;delta.current=0;}};
  const keyboard=(e:KeyboardEvent)=>{if(e.altKey||e.ctrlKey||e.metaKey||!(e.target instanceof HTMLElement)||e.target.closest('input,textarea,[contenteditable]'))return;if(['ArrowDown','ArrowRight','ArrowUp','ArrowLeft'].includes(e.key)){e.preventDefault();move(e.key==='ArrowDown'||e.key==='ArrowRight'?1:-1);}};
  el.addEventListener('wheel',wheel,{passive:false});window.addEventListener('keydown',keyboard);return()=>{el.removeEventListener('wheel',wheel);window.removeEventListener('keydown',keyboard);};
 },[active]);

 return <main className="explore-page" ref={root}>
  <Image unoptimized className="mercury-background" src="/backgrounds/mercury.webp" alt="" fill priority/><div className="explore-shade" aria-hidden="true"/>
  <header className="explore-header"><Link className="brand" href="/">AI 学习图鉴</Link><Link className="back-link" href="/"><ArrowLeft size={14}/> 返回首页</Link><span className="explore-progress">已探索 <b>{progress.completed.length}</b> / 11</span></header>
  <div className="explore-layout"><section className="chapter-info"><nav className="stage-filter" aria-label="二级学习分类">{stages.map(s=><button className={stage.slug===s.slug?'selected':''} key={s.slug} onClick={()=>select(s.start-1)}>{s.name}</button>)}</nav><div key={lesson.id} className="chapter-heading page-appear"><p className="chapter-index"><span>{number(lesson.id)}</span> / 11 · {stage.name}</p><h1>{lesson.shortTitle}</h1><p className="chapter-summary">{lesson.intro}</p></div>
  <nav className="chapter-wheel liquid-glass" aria-label="11章滚轮导航"><div className="wheel-label"><span>学习序列</span><strong>{number(lesson.id)} / 11</strong></div><button className="wheel-arrow" onClick={()=>select(active-1)} aria-label="上一章"><ChevronUp size={18}/></button>
   <div className="wheel-viewport" onPointerDown={e=>{pointer.current=e.clientY;suppressClick.current=false;if(e.target instanceof Element)e.target.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(pointer.current!==null&&Math.abs(e.clientY-pointer.current)>10)suppressClick.current=true;}} onPointerUp={e=>{if(pointer.current!==null&&Math.abs(e.clientY-pointer.current)>28)select(active+(e.clientY<pointer.current?1:-1));pointer.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}} onLostPointerCapture={()=>{pointer.current=null;}} onPointerCancel={()=>{pointer.current=null;}}><div className="wheel-center"/>{lessons.map((l,i)=>{const d=wrap(i-active+5)-5;return <button key={l.id} className={`wheel-item ${d===0?'current':''}`} style={{transform:`translateY(${d*48}px) scale(${1-Math.min(3,Math.abs(d))*.055})`,opacity:Math.abs(d)>2?0:1-Math.abs(d)*.3,visibility:Math.abs(d)>2?'hidden':'visible'}} onClick={()=>{if(suppressClick.current){suppressClick.current=false;return;}select(i);}} tabIndex={d===0?0:-1} aria-current={d===0?'step':undefined}><span>{number(l.id)}</span><strong>{l.shortTitle}</strong>{progress.completed.includes(l.id)?<Check size={13}/>:<span className="wheel-code">AI</span>}</button>})}</div>
   <button className="wheel-arrow" onClick={()=>select(active+1)} aria-label="下一章"><ChevronDown size={18}/></button><small>滚轮、方向键或上下拖动切换</small></nav>
   <div className="chapter-facts"><span><BookOpen size={16}/>一页讲解</span><span><Layers3 size={16}/>一次练习</span><span>{progress.completed.includes(lesson.id)?'已完成，可再读':'随时开始，不限顺序'}</span></div>
  </section>
  <section className="poster-stage" aria-label="随章节切换的学习海报">{lessons.map((l,i)=>{const d=wrap(i-active+5)-5;const hidden=Math.abs(d)>1;return <Link key={l.id} href={`/learn/${l.id}`} tabIndex={i===active?0:-1} aria-hidden={hidden} className={`explore-poster ${i===active?'current':''}`} style={{transform:`translate(-50%,-50%) translateX(${d*64}px) rotate(${d*8}deg) scale(${1-Math.abs(d)*.11})`,zIndex:10-Math.abs(d),opacity:hidden?0:i===active?1:.38,visibility:hidden?'hidden':'visible',transitionDuration:reduced?'0ms':'650ms'}} onClick={e=>{if(i!==active){e.preventDefault();select(i);}}}><Image unoptimized src={`/posters/${number(l.id)}.webp`} alt={l.title} width={1086} height={1448}/></Link>})}</section>
  <section className="explore-action"><p>{lesson.title}</p><Link className="enter-learning liquid-glass" href={`/learn/${lesson.id}`} onClick={()=>rememberChapter(lesson.id)}>进入学习 <ArrowRight size={23}/></Link><small>每次弄懂一个问题，就是进步。</small></section></div>
  <footer className="explore-footer"><span>从好奇出发 · THE LEARNING ATLAS</span><span>11 张图，11 个新的视角</span></footer>
 </main>;
}
