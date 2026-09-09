import { notFound } from 'next/navigation';
import lessons from '../../lessons.json';
import LearningPage from '../../learning-page';
export function generateStaticParams(){return Array.from({length:11},(_,i)=>({id:String(i+1)}));}
export async function generateMetadata({params}:{params:Promise<{id:string}>}){const {id}=await params;const l=lessons[Number(id)-1];return l?{title:`${l.shortTitle} · AI 学习图鉴`,description:l.intro}:{};}
export default async function LessonRoute({params}:{params:Promise<{id:string}>}){const {id}=await params;const n=Number(id);if(!Number.isInteger(n)||n<1||n>11)notFound();return <LearningPage key={n} id={n}/>;}
