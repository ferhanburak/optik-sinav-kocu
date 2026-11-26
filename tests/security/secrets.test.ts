/**
 * @jest-environment node
 */
import { execFileSync } from "node:child_process";
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../..');

// Committed files only (what is public on GitHub).
function trackedFiles(): string[] {
  return execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);
}

const SECRET_PATTERNS: [string, RegExp][] = [
  ['Supabase secret key', /sb_secret_[A-Za-z0-9_-]{10,}/],
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ['Anthropic API key', /sk-ant-[A-Za-z0-9_-]{20,}/],
  ['OpenAI API key', /sk-(?:proj-)?[A-Za-z0-9]{32,}/],
  ['GitHub token', /gh[pousr]_[A-Za-z0-9]{36,}/],
  ['Google service account', /"type":\s*"service_account"/],
];

// Supabase's legacy JWT keys: the anon key is public by design, the
// service_role key bypasses RLS and must never be committed.
function serviceRoleJwts(text: string): string[] {
  return (text.match(/eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) ?? []).filter((token) => {
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
      return payload?.role === 'service_role';
    } catch {
      return false;
    }
  });
}

describe('OPT-MOB-001 no secrets are committed', () => {
  const files = trackedFiles().filter((file) => !file.endsWith('package-lock.json'));

  it('commits no .env file other than .env.example', () => {
    const envFiles = files.filter((file) => /(^|\/)\.env(\.|$)/.test(file) && !file.endsWith('.env.example'));
    expect(envFiles).toEqual([]);
  });

  it('commits no signing keys or service-account files', () => {
    const keyFiles = files.filter((file) => /\.(jks|keystore|p8|p12|pem|key)$/.test(file) || /service-?account.*\.json$/i.test(file));
    expect(keyFiles).toEqual([]);
  });

  it('contains no secret keys or tokens in any committed text file', () => {
    const findings: string[] = [];
    for (const file of files) {
      const full = path.join(ROOT, file);
      if (!fs.existsSync(full) || fs.statSync(full).size > 2_000_000) continue;
      const text = fs.readFileSync(full, 'utf8');
      if (text.includes('\0')) continue; // binary
      for (const [name, pattern] of SECRET_PATTERNS) {
        if (pattern.test(text)) findings.push(`${file}: ${name}`);
      }
      if (serviceRoleJwts(text).length) findings.push(`${file}: Supabase service_role key`);
    }
    expect(findings).toEqual([]);
  });
});
