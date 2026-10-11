import json,pathlib,re,sys
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1];origin=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:5174';out=ROOT/'qa';out.mkdir(exist_ok=True);report={'origin':origin,'checks':[],'errors':[],'failedRequests':[]}
def check(name,passed,detail=None):report['checks'].append({'name':name,'passed':bool(passed),'detail':detail});print(name,bool(passed),detail or '')
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox']);page=browser.new_page(viewport={'width':1440,'height':1000});page.set_default_timeout(6500)
 page.on('pageerror',lambda e:report['errors'].append(str(e)));page.on('requestfailed',lambda r:report['failedRequests'].append({'url':r.url,'failure':r.failure}))
 response=page.goto(origin+'/',wait_until='domcontentloaded',timeout=30000);page.get_by_role('button',name='Continue',exact=True).wait_for();check('native onboarding',response is not None and response.status==200)
 video=page.locator('video').first
 try:
  video.evaluate('(v)=>{v.muted=true;return v.play()}');page.wait_for_timeout(500);v=video.evaluate('(v)=>({time:v.currentTime,ready:v.readyState,duration:v.duration})');check('original onboarding video plays',v['time']>0 and v['ready']>=2,v);video.evaluate('(v)=>v.pause()')
 except Exception as e:check('original onboarding video plays',False,str(e))
 page.get_by_role('button',name='Continue',exact=True).click();page.locator('a[href^="/token/"]').first.wait_for(timeout=15000);page.get_by_text(re.compile(r'\d+ holders paid')).last.wait_for(timeout=15000);page.locator('a[href="/brands/discord"]').last.wait_for(timeout=15000);check('real coin cards load',page.locator('a[href^="/token/"]').count()>0);check('live stats and top brands settle',True);page.screenshot(path=str(out/'desktop.png'),full_page=True)
 try:
  page.get_by_role('button',name='Connect wallet',exact=True).first.click();page.wait_for_timeout(150);text=page.locator('body').inner_text();check('wallet selector opens',any(v in text for v in ['Phantom','Solflare','Backpack','Select Wallet']));page.keyboard.press('Escape')
 except Exception as e:check('wallet selector opens',False,str(e))
 page.goto(origin+'/',wait_until='domcontentloaded');page.locator('a[href^="/token/"]').first.wait_for(timeout=15000);mintPath=page.locator('a[href^="/token/"]').first.get_attribute('href');page.locator('a[href^="/token/"]').first.click();page.wait_for_timeout(700);check('native token-card navigation',mintPath is not None and mintPath in page.url)
 for route in ['/brands','/leaderboard','/docs','/docs/developers','/launch','/loot']:
  response=page.goto(origin+route,wait_until='domcontentloaded',timeout=30000);page.wait_for_timeout(400)
  if route=='/leaderboard':page.locator('a[href^="/user/"]').first.wait_for(timeout=15000);check('leaderboard real wallet rows',page.locator('a[href^="/user/"]').count()>0)
  text=page.locator('body').inner_text();check('direct route '+route,response is not None and response.status==200 and len(text)>80,text[:160])
 page.goto(origin+'/brands/discord',wait_until='domcontentloaded');page.get_by_role('heading',name=re.compile('Discord',re.I)).first.wait_for(timeout=15000);check('brand detail route','Discord' in page.locator('body').inner_text())
 page.goto(origin+'/docs',wait_until='domcontentloaded');page.reload(wait_until='domcontentloaded');check('direct route refresh','/docs' in page.url and len(page.locator('body').inner_text())>80)
 mobile=browser.new_page(viewport={'width':390,'height':844},is_mobile=True);mobile.goto(origin+'/',wait_until='domcontentloaded');mobile.get_by_role('button',name='Continue',exact=True).click();mobile.locator('a[href^="/token/"]').first.wait_for(timeout=15000);metrics=mobile.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})');check('mobile cards and overflow',metrics['scroll']<=metrics['width']+1,metrics);mobile.screenshot(path=str(out/'mobile.png'),full_page=True);browser.close()
report['passed']=sum(c['passed'] for c in report['checks']);report['total']=len(report['checks']);(out/'browser-report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2));raise SystemExit(0 if report['passed']==report['total'] and not report['errors'] else 1)
