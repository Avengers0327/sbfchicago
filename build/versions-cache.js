// Loaded into old build scripts by versions.js (node -r). Their photo downloads (curl) are served
// from a shared cache after the first time, so rebuilding past versions doesn't refetch everything.
const cp = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CACHE = process.env.SBF_IMG_CACHE;
const real = cp.execFileSync;

cp.execFileSync = function (cmd, args) {
  if (cmd !== 'curl' || !CACHE || !Array.isArray(args) || args.indexOf('-o') < 0) return real.apply(this, arguments);
  const url = args.find(a => /^https?:\/\//.test(a));
  const out = args[args.indexOf('-o') + 1];
  const cached = path.join(CACHE, crypto.createHash('sha1').update(url).digest('hex'));
  if (fs.existsSync(cached)) {
    fs.copyFileSync(cached, out);
    return Buffer.alloc(0);
  }
  const result = real.apply(this, arguments);
  if (fs.existsSync(out) && fs.statSync(out).size > 0) fs.copyFileSync(out, cached);
  return result;
};
