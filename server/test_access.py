import hashlib
import os
import unittest
from unittest.mock import patch
from http.cookies import SimpleCookie
import access
import zhihu

class AccessTests(unittest.TestCase):
 def test_signed_expiry_password_and_forgery(self):
  hashed='pbkdf2_sha256$test-salt$'+hashlib.pbkdf2_hmac('sha256',b'test-password',b'test-salt',200000).hex()
  with patch.dict(os.environ,{'ATLAS_ACCESS_HASH':hashed,'ATLAS_ACCESS_SECRET':'test-secret'}):
   self.assertFalse(access.valid_session(None,1000))
   self.assertFalse(access.valid_session('@x=1',1000))
   self.assertTrue(access.password_matches('test-password'))
   self.assertFalse(access.password_matches('wrong'))
   cookie=access.issue_cookie(now=1000)
   self.assertIn('HttpOnly',cookie);self.assertIn('Secure',cookie);self.assertIn('SameSite=Lax',cookie)
   parsed=SimpleCookie();parsed.load(cookie);token=parsed[access.COOKIE].value
   self.assertTrue(access.valid_session(access.COOKIE+'='+token,1001))
   self.assertFalse(access.valid_session(access.COOKIE+'='+token,1000+access.TTL))
   self.assertFalse(access.valid_session(access.COOKIE+'='+token[:-1]+'z',1001))
 def test_no_secret_fails_closed_and_rate_bound(self):
  with patch.dict(os.environ,{'ATLAS_ACCESS_HASH':'set','ATLAS_ACCESS_SECRET':''}):self.assertFalse(access.valid_session('atlas_access=fake'))
  access.attempts={}
  self.assertEqual(sum(access.allow_attempt('test',10) for _ in range(11)),10)
  self.assertTrue(access.allow_attempt('test',311))

class ZhihuTests(unittest.TestCase):
 def test_only_known_destinations_and_no_arbitrary_fetch(self):
  for url in ['https://www.zhihu.com.evil.test/question/1','https://user@www.zhihu.com/question/1','http://127.0.0.1','https://www.zhihu.com:444/question/1','javascript:alert(1)']:
   self.assertEqual(zhihu.source_url(url),'')
  self.assertEqual(zhihu.source_url('https://www.zhihu.com/answer/123'),'https://www.zhihu.com/answer/123')
  self.assertEqual(zhihu.request_spec('可信的 AI')[0],'zhihu_search')
  self.assertEqual(zhihu.request_spec('https://www.zhihu.com/question/123')[0],'question_answers')
  with self.assertRaises(ValueError):zhihu.request_spec('https://evil.test/question/1')
 def test_missing_author_and_summary_are_truthful(self):
  rows=zhihu.clean_items({'Code':0,'Data':{'Items':[{'Summary':'这是一段足够长的摘要，但接口并没有提供原始作者的姓名。','Url':'https://www.zhihu.com/question/123/answer/456?utm_source=test&secret=ignore'}]}},'question_answers')
  self.assertEqual(rows[0]['author'],'');self.assertEqual(rows[0]['title'],'知乎回答摘要');self.assertNotIn('secret',rows[0]['url'])

class GateHttpTests(unittest.TestCase):
 def test_origin_unlock_cookie_and_protected_api(self):
  import json,tempfile,threading,urllib.request,urllib.error
  from http.server import ThreadingHTTPServer
  from coach import Handler,Quota
  hashed='pbkdf2_sha256$test-salt$'+hashlib.pbkdf2_hmac('sha256',b'test-password',b'test-salt',200000).hex()
  with tempfile.TemporaryDirectory() as directory,patch.dict(os.environ,{'ATLAS_ACCESS_HASH':hashed,'ATLAS_ACCESS_SECRET':'test-secret','QUOTA_SALT':'quota-test','ALLOWED_ORIGINS':'https://study.example'}):
   Handler.quota=Quota(directory+'/quota.sqlite');access.attempts={}
   server=ThreadingHTTPServer(('127.0.0.1',0),Handler);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
   def call(path,data=None,cookie='',origin='https://study.example'):
    req=urllib.request.Request(f'http://127.0.0.1:{server.server_port}'+path,data=json.dumps(data).encode() if data is not None else None,headers={'Origin':origin,'Cookie':cookie,'Content-Type':'application/json'})
    try:
     with urllib.request.urlopen(req) as r:return r.status,r.headers,r.read()
    except urllib.error.HTTPError as e:return e.code,e.headers,e.read()
   try:
    self.assertEqual(call('/api/coach',{})[0],401)
    self.assertEqual(call('/api/access/unlock',{'password':'test-password'},origin='https://evil.example')[0],403)
    self.assertEqual(call('/api/access/unlock',{'password':'wrong'})[0],401)
    status,headers,_=call('/api/access/unlock',{'password':'test-password'});self.assertEqual(status,200)
    cookie=headers['Set-Cookie'].split(';')[0]
    self.assertEqual(call('/api/access/check',cookie=cookie)[0],200)
    self.assertEqual(call('/api/access/check',cookie='@x=1')[0],401)
    self.assertEqual(call('/api/coach',{},cookie=cookie)[0],400)
   finally:server.shutdown();server.server_close();thread.join()
