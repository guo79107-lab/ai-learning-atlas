import sys,json,urllib.request,urllib.error,urllib.parse
from html.parser import HTMLParser
base=sys.argv[1].rstrip('/')
expected_id=sys.argv[2]
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
assets=set()
class Text(HTMLParser):
 def __init__(self):super().__init__();self.parts=[];self.heading=False;self.h1=[];self.links=[]
 def handle_starttag(self,tag,attrs):
  if tag=='h1':self.heading=True
  data=dict(attrs)
  if tag=='a':self.links.append(data.get('href',''))
  resource=data.get('src') if tag=='script' else data.get('href') if tag=='link' and data.get('rel')=='stylesheet' else None
  if resource and resource.startswith('/'):assets.add(urllib.parse.urljoin(base,resource))
 def handle_endtag(self,tag):
  if tag=='h1':self.heading=False
 def handle_data(self,data):
  self.parts.append(data)
  if self.heading:self.h1.append(data)
def get(path,headers=None):
 req=urllib.request.Request(base+path,headers=headers or {})
 try:
  with opener.open(req,timeout=20) as r:return r.status,r.headers,r.read()
 except urllib.error.HTTPError as e:return e.code,e.headers,e.read()
results=[];headings=[]
for route in ['/', '/explore', '/review']+[f'/learn/{i}' for i in range(1,12)]:
 code,h,b=get(route);assert code==200,(route,code)
 assert h.get_content_type()=='text/html',(route,h.get_content_type())
 p=Text();p.feed(b.decode('utf8'));assert p.h1,(route,'missing h1')
 prefix=urllib.parse.urlsplit(base).path
 if route=='/':assert p.links and all(link==prefix+'/explore' for link in p.links),('homepage may only lead to explore',p.links)
 if route=='/explore':assert len([link for link in p.links if link.startswith(prefix+'/learn/')])==1,'Only enter-learning may lead to a course'
 headings.append(''.join(p.h1))
 rc,rh,rb=get(route+'?_rsc=verify',{'RSC':'1','Accept':'text/x-component'})
 assert rc==200,(route,'RSC',rc)
 assert rh.get_content_type()=='text/x-component',(route,rh.get_content_type())
 assert rh.get('X-Vinext-RSC-Compatibility-Id')==expected_id,(route,'ID mismatch')
 assert rb and not rb.lstrip().startswith(b'<!DOCTYPE'),(route,'RSC body is HTML')
 results.append({'route':route,'html':code,'rsc':rc,'heading':headings[-1]})
assert len(set(headings[3:]))==11,'Duplicate learning page heading'
for i in range(1,12):
 for suffix in ['.webp','-card.webp']:
  code,h,b=get(f'/posters/{i:02}{suffix}');assert code==200 and b[:4]==b'RIFF',(i,suffix,code)
for route in ['/learn/0','/learn/12','/not-a-page']:
 assert get(route)[0]==404,(route,'must be 404')
code,h,b=get('/curiosity.mp4',{'Range':'bytes=0-1023'})
assert code==206 and len(b)==1024 and h.get('Content-Range','').startswith('bytes 0-1023/'),('video range',code,len(b))
for url in assets:
 with opener.open(url,timeout=20) as r:assert r.status==200,(url,r.status)
print(json.dumps({'assets':len(assets),'base':base,'pages':results,'posters':22,'invalidRoutes':3,'videoRange':206,'result':'passed'},ensure_ascii=False,indent=2))
