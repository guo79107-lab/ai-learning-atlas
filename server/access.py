"""Signed, expiring website access sessions; secrets are only read from environment."""
import hashlib
import hmac
from http.cookies import SimpleCookie, CookieError
import os
import secrets
import time
import threading

COOKIE = 'atlas_access'
TTL = 12 * 3600
lock = threading.Lock()
attempts = {}

def enabled():
    return bool(os.getenv('ATLAS_ACCESS_HASH'))

def valid_session(cookie_header, now=None):
    if not enabled(): return True
    secret = os.getenv('ATLAS_ACCESS_SECRET', '')
    if not secret: return False
    try:
        cookie = SimpleCookie(); cookie.load(cookie_header or '')
        token = cookie[COOKIE].value
        expiry, nonce, signature = token.split('.')
        now = int(time.time()) if now is None else now
        if not expiry.isdecimal() or not now < int(expiry) <= now + TTL or len(nonce) != 32: return False
        expected = hmac.new(secret.encode(), (expiry + '.' + nonce).encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(signature, expected)
    except (KeyError, ValueError, TypeError, CookieError): return False

def password_matches(value):
    try:
        scheme, salt, digest = os.environ['ATLAS_ACCESS_HASH'].split('$')
        if scheme != 'pbkdf2_sha256' or not isinstance(value, str) or len(value) > 128: return False
        actual = hashlib.pbkdf2_hmac('sha256', value.encode(), salt.encode(), 200000).hex()
        return hmac.compare_digest(digest, actual)
    except (KeyError, ValueError): return False

def allow_attempt(identity, now=None):
    now = time.monotonic() if now is None else now
    with lock:
        for key in list(attempts):
            if attempts[key][0] + 300 < now: del attempts[key]
        # Five minutes of failed/attempted entries, bounded memory.
        if identity not in attempts and len(attempts) >= 10000: return False
        start, count = attempts.get(identity, (now, 0))
        if count >= 10: return False
        attempts[identity] = (start, count + 1)
        return True

def issue_cookie(now=None):
    expiry = str((int(time.time()) if now is None else now) + TTL)
    body = expiry + '.' + secrets.token_hex(16)
    signature = hmac.new(os.environ['ATLAS_ACCESS_SECRET'].encode(), body.encode(), hashlib.sha256).hexdigest()
    return f'{COOKIE}={body}.{signature}; Path=/ai-learning/; Max-Age={TTL}; Secure; HttpOnly; SameSite=Lax'
