import json,pathlib,re
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1];checks=[]
def check(name,value,detail=None):checks.append({'name':name,'passed':bool(value),'detail':detail});print(name,bool(value),detail or '')
with sync_playwright() as p:
 b=p.chromium.launch(args=['--no-sandbox']);pg=b.new_page();pg.set_default_timeout(8000);pg.goto('http://127.0.0.1:5174/',wait_until='domcontentloaded');pg.get_by_role('button',name='Continue',exact=True).click();pg.locator('a[href^="/token/"]').first.wait_for(timeout=15000)
 pg.get_by_label('Sort coins').click()
 with pg.expect_response(lambda r:'/api/coins?' in r.url and 'sort=new' in r.url,timeout=15000) as pending:pg.get_by_text('New',exact=True).last.click()
 response=pending.value;check('native sort fetches real new-order list',response.status==200 and len(response.json().get('coins',[]))>0)
 pg.get_by_placeholder('Search coins or brands').fill('loot');pg.wait_for_timeout(450);results=pg.locator('a[href^="/token/"]');check('search exposes real token suggestions',results.count()>0 and 'Loot' in pg.locator('body').inner_text())
 pg.goto('http://127.0.0.1:5174/brands/discord',wait_until='domcontentloaded');pg.get_by_role('heading',name=re.compile('Discord',re.I)).first.wait_for(timeout=15000);check('brand packages load', 'Discord' in pg.locator('body').inner_text())
 pg.goto('http://127.0.0.1:5174/docs',wait_until='domcontentloaded');pg.locator('a[href$="#balance"]').first.click();check('docs section navigation',pg.locator('#balance').count()>0)
 pg.goto('http://127.0.0.1:5174/profile',wait_until='domcontentloaded');pg.wait_for_timeout(200);check('disconnected profile gate',any(t in pg.locator('body').inner_text().lower() for t in ['connect wallet','connect a wallet','sign in']))
 response=pg.request.post('http://127.0.0.1:5174/api/orders',data={});check('unconfigured purchase is explicit, not fake success',response.status==501 and 'operator backend' in response.text());b.close()
report={'checks':checks,'passed':sum(c['passed'] for c in checks),'total':len(checks),'scope':'readonly/public UI only, no wallet approval, signed transaction or purchase'};(ROOT/'qa/flows-report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2));raise SystemExit(0 if report['passed']==report['total'] else 1)
