const fs=require('fs');fs.mkdirSync('content',{recursive:true});
const slugs=['team','who-we-serve-chicago','who-we-serve-india','items-needed','get-involved','in-the-news','youth-leaders','sbf-fundraiser','donations','sept-event','aug-event'];
for(const s of slugs){
  const h=fs.readFileSync(s+'.html','utf8');
  const start=h.indexOf('<section class="gh-content');
  let i=h.indexOf('>',start)+1, depth=1, re=/<\/?section\b/g; re.lastIndex=i; let m;
  while((m=re.exec(h))){ depth+= m[0]==='<section'?1:-1; if(!depth) break; }
  let c=h.slice(i,m.index);
  // decode cloudflare emails
  c=c.replace(/<a href="\/cdn-cgi\/l\/email-protection[^"]*"[^>]*><span class="__cf_email__" data-cfemail="([0-9a-f]+)">\[email&#160;protected\]<\/span><\/a>/g,(_,hx)=>{const k=parseInt(hx.substr(0,2),16);let o='';for(let j=2;j<hx.length;j+=2)o+=String.fromCharCode(parseInt(hx.substr(j,2),16)^k);return o;});
  c=c.replace(/<span class="__cf_email__" data-cfemail="([0-9a-f]+)">\[email&#160;protected\]<\/span>/g,(_,hx)=>{const k=parseInt(hx.substr(0,2),16);let o='';for(let j=2;j<hx.length;j+=2)o+=String.fromCharCode(parseInt(hx.substr(j,2),16)^k);return o;});
  fs.writeFileSync('content/'+s+'.html',c);
  // structural outline
  const top=[...c.matchAll(/<(figure|div|p|h[1-6]|ul|ol|blockquote|hr|iframe|section)\b([^>]*)>/g)].map(x=>x[1]+(x[2].match(/class="([^"]*)"/)||['',''])[1].replace(/\s+/g,'.').replace(/^/,x[2].includes('class')?'.':'')).filter(x=>!/^(div\.kg-(gallery-image|bookmark-|video-|header-card-(text|subheading|heading|image|content))|p$)/.test(x));
  console.log('==',s,c.length, top.slice(0,60).join(' | '));
}
