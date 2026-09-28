const fs=require('fs');
for (const f of fs.readdirSync('.').filter(f=>f.endsWith('.html'))) {
  let h=fs.readFileSync(f,'utf8');
  const title=(h.match(/<title>([^<]*)/)||[])[1];
  const desc=(h.match(/name="description" content="([^"]*)/)||[])[1];
  let m=h.match(/<main[\s\S]*<\/main>/); let body=m?m[0]:h;
  body=body.replace(/<script[\s\S]*?<\/script>/g,'').replace(/<style[\s\S]*?<\/style>/g,'');
  const imgs=[...body.matchAll(/<img[^>]*src="([^"]*)"[^>]*?(?:alt="([^"]*)")?/g)].map(x=>x[1]+(x[2]?' | alt='+x[2]:''));
  const links=[...body.matchAll(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].map(x=>x[1]+' -> '+x[2].replace(/<[^>]+>/g,'').trim()).filter(x=>!x.includes('-> ')||true);
  let text=body.replace(/<(br|\/p|\/h\d|\/li|\/figure|\/div)[^>]*>/g,'\n').replace(/<h(\d)[^>]*>/g,'\n#$1 ').replace(/<li[^>]*>/g,'- ').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&#x27;|&#39;/g,"'").replace(/&quot;/g,'"').replace(/&nbsp;/g,' ').replace(/\n\s*\n+/g,'\n').trim();
  fs.writeFileSync(f.replace('.html','.txt'),`TITLE: ${title}\nDESC: ${desc}\n---\n${text}\n---IMGS\n${imgs.join('\n')}\n---LINKS\n${links.join('\n')}\n`);
}
