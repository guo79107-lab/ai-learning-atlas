"""Optional official Zhihu content API; never fetch user-controlled destinations."""
import json
import os
import re
import time
import urllib.request
from urllib.parse import urlsplit, urlunsplit, urlencode, parse_qsl

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs): return None

def source_url(value):
    if not isinstance(value, str) or len(value) > 2048: return ''
    try:
        u=urlsplit(value)
        valid=(u.hostname=='www.zhihu.com' and re.fullmatch(r'/(question/\d+(/answer/\d+)?|answer/\d+|pin/\d+)/?',u.path)) or (u.hostname=='zhuanlan.zhihu.com' and re.fullmatch(r'/p/\d+/?',u.path))
        if u.scheme!='https' or u.username or u.password or u.port or not valid:return ''
        return urlunsplit(('https',u.netloc,u.path,urlencode([(k,v) for k,v in parse_qsl(u.query) if k.startswith('utm_')]),''))
    except ValueError:return ''

def request_spec(query):
    if not isinstance(query,str):raise ValueError('invalid query')
    query=query.strip()
    if query.startswith(('http:', 'https:')):
        url=source_url(query)
        if not url or not re.fullmatch(r'/question/\d+/?',urlsplit(url).path):raise ValueError('请使用知乎问题链接，文章和回答可粘贴摘录。')
        return 'question_answers',dict(QuestionUrl=url,Offset=0,Limit=5)
    if not 2<=len(query)<=100:raise ValueError('请输入 2–100 字关键词。')
    return 'zhihu_search',dict(Query=query,Count=5)

def clean_items(raw, kind):
    if not isinstance(raw,dict) or raw.get('Code')!=0 or not isinstance(raw.get('Data'),dict):raise ValueError('知乎内容服务暂时不可用，请使用摘录。')
    rows=raw['Data'].get('Items')
    if not isinstance(rows,list):raise ValueError('知乎摘要格式不完整。')
    items=[]
    for row in rows[:5]:
        if not isinstance(row,dict):continue
        url=source_url(row.get('Url'))
        excerpt=row.get('ContentText' if kind=='zhihu_search' else 'Summary')
        if not url or not isinstance(excerpt,str) or len(excerpt.strip())<20:continue
        title=row.get('Title') or ('知乎回答摘要' if kind=='question_answers' else '知乎内容摘要')
        author=row.get('AuthorName') or ''
        if not isinstance(title,str) or not isinstance(author,str):continue
        items.append(dict(title=title[:200],author=author[:100],excerpt=excerpt[:3000],url=url))
    return items

def search(query):
    kind,params=request_spec(query)
    req=urllib.request.Request('https://developer.zhihu.com/api/v1/content/'+kind+'?'+urlencode(params),headers={'Authorization':'Bearer '+os.environ['ZHIHU_ACCESS_SECRET'],'X-Request-Timestamp':str(int(time.time())),'Content-Type':'application/json'})
    with urllib.request.build_opener(NoRedirect()).open(req,timeout=15) as response:body=response.read(500001)
    if len(body)>500000:raise ValueError('知乎摘要过长，请改用粘贴摘录。')
    return clean_items(json.loads(body),kind)
