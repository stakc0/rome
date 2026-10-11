#!/usr/bin/env python3
"""Capture Loot's native Vite dependency closure using unauthenticated public GETs.
Original asset bytes are never rewritten. Re-run to include new reference JSON
inventories; successful captures are hash-checked and reused. Token images are
bounded to browser samples (and --media-limit), with remaining URLs mapped live.
"""
import argparse, concurrent.futures, hashlib, html, json, pathlib, re, subprocess, urllib.parse, urllib.request
ORIGIN='https://loot.family'
LICENSES={'https://raw.githubusercontent.com/google/fonts/main/ofl/outfit/OFL.txt':'public/captured/licenses/Outfit-OFL.txt','https://raw.githubusercontent.com/google/fonts/main/ofl/intertight/OFL.txt':'public/captured/licenses/InterTight-OFL.txt'}
EXT=r'(?:js|css|woff2?|ttf|otf|eot|png|jpe?g|gif|svg|webp|avif|ico|mp4|webm|wasm)'
MEDIA=re.compile(r'\.'+EXT+r'$',re.I)
UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
def sha(data): return hashlib.sha256(data).hexdigest()
def normalize(raw,base):
    raw=html.unescape(raw).replace('\\/','/').replace('\\u0026','&').strip()
    if not raw or raw.startswith(('data:','blob:','?','#')) or re.search(r'[{}<>`\s]',raw): return None
    if re.fullmatch(r'\.[A-Za-z0-9]+',pathlib.PurePosixPath(urllib.parse.urlsplit(raw).path).name): return None
    try:
        u=urllib.parse.urljoin(base,raw); p=urllib.parse.urlsplit(u)
    except ValueError: return None
    if p.scheme not in ('https','http') or not p.netloc: return None
    if p.netloc=='loot.family' and p.path.endswith('.js') and p.query and set(urllib.parse.parse_qs(p.query)) != {'v'}: return None
    if '/api/' in p.path or '/node_modules/' in p.path or re.search(r'(^|/):[A-Za-z]',p.path): return None
    if not (MEDIA.search(p.path) or p.netloc=='fonts.googleapis.com' and p.path in ('/css','/css2') or p.netloc=='img.loot.family' and urllib.parse.parse_qs(p.query).get('u')): return None
    return urllib.parse.urlunsplit((p.scheme,p.netloc,p.path,p.query,''))
def discover(text,base):
    text=html.unescape(text).replace('\\/','/').replace('\\u0026','&')
    found=set()
    # Vite preload maps contain bare assets/foo.js rooted at document root,
    # while actual imports contain ./foo.js relative to the importing bundle.
    for match in re.finditer(r'([\"\'`])([^\"\'`\n]{1,1800})\1',text):
        raw=match.group(2)
        if raw.startswith('assets/'): raw='/'+raw
        u=normalize(raw,base)
        if u: found.add(u)
    for raw in re.findall(r'(?:https?://|/assets/|/brands/)[^\s\"\'<>`\\)]+',text):
        u=normalize(raw,base)
        if u: found.add(u)
    for raw in re.findall(r'url\(\s*[\"\']?([^\)\"\']+)',text):
        u=normalize(raw,base)
        if u: found.add(u)
    # Native catalog builds brand assets from IDs through V()/H() helpers.
    if '/brands/logos/${' in text or '/brands/banners/${' in text:
        for brand in re.findall(r'(?:logo:V|banner:H)\([`\"\']([a-z0-9-]+)[`\"\']\)',text):
            found.add(ORIGIN+'/brands/logos/'+brand+'.png')
            found.add(ORIGIN+'/brands/banners/'+brand+'.png')
    return found

def local_path(url,ct):
    if url in LICENSES: return LICENSES[url]
    p=urllib.parse.urlsplit(url)
    # Query-only cache busting must still retain standard favicon paths.
    if p.netloc=='loot.family' and (not p.query or set(urllib.parse.parse_qs(p.query)) <= {'v'}):
        return 'public'+urllib.parse.unquote(p.path)
    ext=pathlib.Path(p.path).suffix
    if not ext or len(ext)>8: ext={'text/css':'.css','image/png':'.png','image/webp':'.webp','image/avif':'.avif','image/jpeg':'.jpg'}.get(ct.split(';')[0],'.bin')
    return 'public/captured/external/'+sha(url.encode())[:24]+ext

def fetch(url):
    try:
        req=urllib.request.Request(url,headers={'User-Agent':UA,'Accept':'*/*'})
        with urllib.request.urlopen(req,timeout=25) as r:
            data=r.read(); ct=r.headers.get('Content-Type','application/octet-stream'); status=r.status
        if 'text/html' in ct: return url,None,ct,status,'Unexpected HTML instead of asset'
        return url,data,ct,status,None
    except Exception as first:
        # Curl is a transport fallback only, not an authentication bypass.
        r=subprocess.run(['curl','-f','-L','--max-time','35','--silent','--show-error','-A',UA,url],capture_output=True)
        if r.returncode==0 and not r.stdout.lstrip().lower().startswith((b'<!doctype html',b'<html')):
            import mimetypes
            return url,r.stdout,mimetypes.guess_type(urllib.parse.urlsplit(url).path)[0] or 'application/octet-stream',200,None
        return url,None,None,getattr(first,'code',None),str(first)+'; curl: '+r.stderr.decode(errors='replace')[:400]

def main():
    ap=argparse.ArgumentParser(description=__doc__); ap.add_argument('--root-html',default='/root/.hermes/cache/scratch/loot-reference.html'); ap.add_argument('--workers',type=int,default=8); ap.add_argument('--media-limit',type=int,default=100); args=ap.parse_args()
    root=pathlib.Path(__file__).resolve().parents[1]; manifest=root/'reference/assets.json'; manifest.parent.mkdir(parents=True,exist_ok=True)
    records={}; failures={}; seen=set(); pending={ORIGIN+'/brand-mark.png',ORIGIN+'/assets/loot-pre.mp4',ORIGIN+'/assets/loot-pre.jpg'}; live={}; documents=[]
    pending.update(LICENSES)
    if manifest.exists():
        old=json.loads(manifest.read_text()); live.update({u:v for u,v in old.get('externalMediaMap',{}).items() if normalize(u,u) or u in LICENSES})
        for r in old.get('assets',[]):
            p=root/r['localPath']
            if not (normalize(r['url'],r['url']) or r['url'] in LICENSES):
                if r['localPath'].startswith('public/captured/external/') and p.exists(): p.unlink()
                continue
            if p.exists() and sha(p.read_bytes())==r['localSha256']:
                records[r['url']]=r; seen.add(r['url'])
                if p.suffix in ('.js','.css'): pending.update(discover(p.read_text(errors='replace'),r['url']))
        failures={f['url']:f for f in old.get('failures',[]) if normalize(f['url'],f['url']) or f['url'] in LICENSES}
    def strings(value):
        if isinstance(value,str): yield value
        elif isinstance(value,list):
            for v in value: yield from strings(v)
        elif isinstance(value,dict):
            for k,v in value.items(): yield k; yield from strings(v)
    htmlfiles=[pathlib.Path(args.root_html)]+sorted((root/'reference/pages').glob('*.html'))
    for p in htmlfiles:
        if p.exists():
            data=p.read_bytes(); documents.append({'path':str(p),'sha256':sha(data)}); pending.update(discover(data.decode(errors='replace'),ORIGIN+'/'))
    media=set(); browser_media=set()
    for p in sorted((root/'reference').rglob('*.json')):
        if p==manifest: continue
        try: value=json.loads(p.read_text())
        except Exception: continue
        for s in strings(value):
            u=normalize(s,ORIGIN+'/')
            if not u: continue
            host=urllib.parse.urlsplit(u).netloc
            if host=='loot.family' or host in ('fonts.googleapis.com','fonts.gstatic.com'): pending.add(u)
            else:
                media.add(u)
                if p.name=='browser-discovery.json': browser_media.add(u)
    samples=browser_media | set(sorted(media-browser_media)[:max(0,args.media_limit-len(browser_media))]); pending.update(samples)
    for u in media-samples: live[u]=u
    def persist():
        for u,r in records.items():
            if urllib.parse.urlsplit(u).netloc!='loot.family' or urllib.parse.urlsplit(u).query: live[u]='/'+r['localPath'].removeprefix('public/')
        result={'origin':ORIGIN,'assets':sorted(records.values(),key=lambda r:r['url']),'externalMediaMap':dict(sorted(live.items())),'failures':sorted(failures.values(),key=lambda f:f['url']),'documents':documents,'dynamicMediaPolicy':{'sampleLimit':args.media_limit,'discoveredDynamicMedia':len(media),'sampledDynamicMedia':len(samples),'remainingMedia':'Live public URLs, no RPC/auth/signing reuse'},'generatedStylesheets':['public/captured/fonts.css']}
        manifest.write_text(json.dumps(result,indent=2)+'\n'); return result
    rounds=0
    while pending-seen:
        batch=sorted(pending-seen); pending.clear(); seen.update(batch); rounds+=1; print('round',rounds,'fetch',len(batch),flush=True)
        with concurrent.futures.ThreadPoolExecutor(max_workers=max(1,min(args.workers,12))) as pool:
            for u,data,ct,status,error in pool.map(fetch,batch):
                if error or data is None:
                    failures[u]={'url':u,'status':status,'error':error or 'No response body'}; live.setdefault(u,u); continue
                ct=ct or 'application/octet-stream'
                target=local_path(u,ct); p=root/target; p.parent.mkdir(parents=True,exist_ok=True); p.write_bytes(data)
                records[u]={'url':u,'localPath':target,'status':status,'contentType':ct,'bytes':len(data),'sourceSha256':sha(data),'localSha256':sha(data)}; failures.pop(u,None)
                if p.suffix in ('.js','.css'):
                    pending.update(discover(data.decode(errors='replace'),u))
        persist()
    css=[]
    for u,r in records.items():
        if urllib.parse.urlsplit(u).netloc=='fonts.googleapis.com':
            text=(root/r['localPath']).read_text()
            for fu,fr in records.items():
                if urllib.parse.urlsplit(fu).netloc=='fonts.gstatic.com': text=text.replace(fu,'/'+fr['localPath'].removeprefix('public/'))
            css.append(text)
    p=root/'public/captured/fonts.css'; p.parent.mkdir(parents=True,exist_ok=True); p.write_text('\n'.join(css))
    result=persist(); unresolved=set(); bad=[]
    for u,r in records.items():
        p=root/r['localPath']; data=p.read_bytes()
        if len(data)!=r['bytes'] or sha(data)!=r['sourceSha256'] or sha(data)!=r['localSha256']: bad.append(u)
        if p.suffix in ('.js','.css'): unresolved.update(discover(data.decode(errors='replace'),u)-records.keys()-failures.keys())
    print(json.dumps({'assets':len(records),'bytes':sum(r['bytes'] for r in records.values()),'failures':list(failures.values()),'hashMismatch':bad,'unresolvedDependencyURLs':sorted(unresolved),'fonts':[r['localPath'] for r in records.values() if re.search(r'\.(woff2?|ttf|otf)(?:\?|$)',r['url'])]},indent=2))
    if bad or unresolved: raise SystemExit(1)
if __name__=='__main__': main()
