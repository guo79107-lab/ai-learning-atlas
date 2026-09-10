'use client';
import { useRef, useState } from 'react';
import { Share2, Copy, ArrowUpRight, X, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { coachingShare } from './coach-utils';
import type { CoachSession } from './coach-store';
export default function CoachShare({
  session,
  title,
}: {
  session: CoachSession;
  title: string;
}) {
  const field = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState(''),
    [message, setMessage] = useState('');
  const copy = async (open: boolean) => {
    // Open during the click event, before clipboard's asynchronous permission result.
    const destination = open
      ? window.open(
          'https://zhuanlan.zhihu.com/write',
          '_blank',
          'noopener,noreferrer',
        )
      : null;
    void destination;
    try {
      await navigator.clipboard.writeText(content);
      setMessage(
        open
          ? '已复制分享稿。请在知乎粘贴、核对话题后发布；若新页面未打开，可点击下方入口。'
          : '分享稿已复制。',
      );
    } catch {
      field.current?.focus();
      field.current?.select();
      setMessage(
        '浏览器未允许自动复制。分享稿已选中，请手动复制后在知乎粘贴。',
      );
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        className="learn-secondary coach-share-trigger"
        onClick={() => {
          setContent(coachingShare(session, title));
          setMessage('');
          setOpen(true);
        }}
      >
        <Share2 size={16} />
        分享到知乎
      </button>
      <DialogContent className="coach-share-dialog" showCloseButton={false}>
        <div className="coach-share-heading">
          <div>
            <span>把理解分享出去</span>
            <DialogTitle>整理这次学习收获</DialogTitle>
          </div>
          <button onClick={() => setOpen(false)} aria-label="关闭分享稿">
            <X size={20} />
          </button>
        </div>
        <DialogDescription>
          问题、三步讲解和答案已整理好。发布前可修改措辞，核对来源与个人信息。
        </DialogDescription>
        <label htmlFor="coach-share-content">分享稿</label>
        <textarea
          id="coach-share-content"
          ref={field}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={10000}
        />
        <div className="coach-share-actions">
          <button className="learn-primary" onClick={() => copy(true)}>
            <Share2 size={16} />
            复制并打开知乎
          </button>
          <button className="coach-text-button" onClick={() => copy(false)}>
            <Copy size={15} />
            仅复制
          </button>
          <button
            className="coach-text-button"
            onClick={() => {
              const u = URL.createObjectURL(
                new Blob([content], { type: 'text/plain;charset=utf-8' }),
              );
              const a = document.createElement('a');
              a.href = u;
              a.download = 'AI教练-知乎分享稿.txt';
              a.click();
              setTimeout(() => URL.revokeObjectURL(u), 1000);
            }}
          >
            <Download size={15} />
            下载
          </button>
        </div>
        {message && <output className="coach-share-status">{message}</output>}
        <a
          className="coach-review-link"
          href="https://zhuanlan.zhihu.com/write"
          target="_blank"
          rel="noreferrer"
        >
          打开知乎写文章
          <ArrowUpRight size={14} />
        </a>
        <small>
          此入口帮助你准备分享，不会自动发布。话题需在知乎编辑器内选择。
        </small>
      </DialogContent>
    </Dialog>
  );
}
