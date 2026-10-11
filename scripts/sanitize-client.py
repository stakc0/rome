"""Remove reference operator credentials and writes, keep public UI/code."""
import hashlib,json,pathlib,re
ROOT=pathlib.Path(__file__).resolve().parents[1]
manifest=json.loads((ROOT/'reference/assets.json').read_text());services=json.loads((ROOT/'reference/services.json').read_text());changes=[]
for item in manifest['assets']:
 path=ROOT/item['localPath']
 if not path.name.endswith('.js'):continue
 source=path.read_text();derived=source
 # Never retain the source provider's embedded bundle credentials.
 derived,count=re.subn(r'([`\"\'](?:x-api-key|api-key|authorization)[`\"\']\s*:\s*)[`\"\'][^`\"\']+[`\"\']',lambda m:m.group(1)+'`OPERATOR_BACKEND_NOT_CONFIGURED`',derived,flags=re.I)
 for symbol,label in [('HM','Live launch'),('UM','Live launch'),('KM','Transaction bundle'),('cM','Metadata upload'),('Eu','Wallet sign-in')]:
  pattern=r'(async\s+function\s+'+symbol+r'\([^)]*\)\{)'
  derived,n=re.subn(pattern,lambda m:m.group(1)+'throw Error(`'+label+' requires this deployment\'s operator backend. Nothing was submitted.`);',derived,count=1)
  if n:changes.append({'asset':item['localPath'],'blockedFunction':symbol})
 # Remove the entire bundle-provider body, not only its execution path.
 # Unreachable embedded credentials still must not be republished.
 match=re.search(r'async\s+function\s+KM\([^)]*\)\{',derived)
 if match:
  start=match.end();depth=1;quote=None;escape=False;end=start
  for end in range(start,len(derived)):
   char=derived[end]
   if quote:
    if escape:escape=False
    elif char=='\\':escape=True
    elif char==quote:quote=None
   elif char in ('"',"'",'`'):quote=char
   elif char=='{':depth+=1
   elif char=='}':
    depth-=1
    if depth==0:break
  if depth:raise RuntimeError('Cannot safely isolate bundle function')
  derived=derived[:start]+'throw Error(`Transaction bundles require an owner-configured backend. Nothing was submitted.`);'+derived[end:]
  changes.append({'asset':item['localPath'],'bundleFunctionBodyRemoved':True})
 http=services['rpc']['originalHttp'];ws=services['rpc']['originalWebsocket']
 derived=derived.replace('`'+http+'`','(window.location.origin+`/api/rpc`)').replace('`'+ws+'`','(window.location.protocol===`https:`?`wss:`:`ws:`)+`//`+window.location.host+`/api/rpc/ws`')
 base=services['price']['originalBase'];derived=derived.replace('`'+base+'`','(window.location.origin+`/api/market`)')
 if derived!=source:
  path.write_text(derived);item['localSha256']=hashlib.sha256(path.read_bytes()).hexdigest();item['bytes']=path.stat().st_size;item['localTransforms']=['reference credential removed','operator signing/upload disabled','owned read adapters'];changes.append({'asset':item['localPath'],'credentialFieldsRemoved':count})
manifest['localSecurityPolicy']='Reference credentials/private writes removed before publication; source hashes retained, local hashes updated.'
(ROOT/'reference/assets.json').write_text(json.dumps(manifest,indent=2)+'\n');(ROOT/'reference/client-sanitization.json').write_text(json.dumps({'changes':changes,'scope':'public client hygiene, no credentials or signed writes'},indent=2)+'\n');print(json.dumps({'sanitizedAssets':sum('credentialFieldsRemoved' in c for c in changes),'guardedFunctions':[c['blockedFunction'] for c in changes if 'blockedFunction' in c]}))
