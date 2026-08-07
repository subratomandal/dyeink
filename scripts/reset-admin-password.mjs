#!/usr/bin/env node
// Replaces the DyeInk admin password by writing a fresh PBKDF2 hash into D1.
//
// DyeInk only ever stores a one-way hash of the password, so a forgotten password
// cannot be recovered — it can only be replaced. Cloudflare account access is the
// root of trust for that replacement: anyone who can run Wrangler against this
// database already controls the deployment. That is why recovery lives here in the
// CLI rather than behind an unauthenticated HTTP endpoint.
//
// The hashing helpers are compiled from backend/src/lib/crypto.ts, so the hash
// written here is produced by the exact code the Worker uses to verify logins.
//
// Usage:
//   npm run admin:reset-password                 # prompt, then write to the deployed D1
//   npm run admin:reset-password -- --local      # target the `wrangler dev` database
//   npm run admin:reset-password -- --stdin      # read the password from stdin
//   npm run admin:reset-password -- --print-sql  # print the SQL and change nothing

import { build } from 'esbuild'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..')
// Wrangler runs from backend/ like the db:migrate scripts do, so --local targets
// the same persisted database as `wrangler dev`.
const backendRoot = resolve(repoRoot, 'backend')
const cryptoModulePath = resolve(backendRoot, 'src/lib/crypto.ts')
const wranglerConfigPath = resolve(backendRoot, 'wrangler.toml')

const HELP = `Reset the DyeInk admin password.

Options:
  --local       Write to the local wrangler dev database instead of the deployed one.
  --stdin       Read the new password from stdin instead of prompting.
  --print-sql   Print the SQL to stdout and exit without touching any database.
                The output contains a live session secret, so treat it as a credential.
  -h, --help    Show this message.

The password can also be supplied as the NEW_ADMIN_PASSWORD environment variable.
It must be at least 12 characters with an uppercase letter, a lowercase letter,
a number, and a symbol.`

function fail(message) {
    console.error(message)
    process.exit(1)
}

function parseArgs(argv) {
    const flags = { local: false, stdin: false, printSql: false }
    for (const arg of argv) {
        if (arg === '--local') flags.local = true
        else if (arg === '--stdin') flags.stdin = true
        else if (arg === '--print-sql') flags.printSql = true
        else if (arg === '-h' || arg === '--help') {
            console.log(HELP)
            process.exit(0)
        } else fail(`Unknown option: ${arg}\n\n${HELP}`)
    }
    return flags
}

function readDatabaseName() {
    const toml = readFileSync(wranglerConfigPath, 'utf8')
    const match = toml.match(/^[ \t]*database_name[ \t]*=[ \t]*["']([^"']+)["']/m)
    if (!match) fail(`No database_name found in ${wranglerConfigPath}.`)
    return match[1]
}

// Compiles the Worker's crypto module in memory and imports it as ESM, which keeps
// the PBKDF2 parameters and hash encoding in exactly one place.
async function loadWorkerCrypto() {
    const bundled = await build({
        entryPoints: [cryptoModulePath],
        absWorkingDir: repoRoot,
        bundle: true,
        format: 'esm',
        target: 'es2022',
        platform: 'neutral',
        write: false,
        logLevel: 'silent',
    })
    const base64 = Buffer.from(bundled.outputFiles[0].text).toString('base64')
    return import(`data:text/javascript;base64,${base64}`)
}

function promptHidden(label) {
    const { stdin, stdout } = process
    if (!stdin.isTTY) {
        return Promise.reject(
            new Error('Not running in a terminal. Use --stdin or set NEW_ADMIN_PASSWORD.'),
        )
    }

    return new Promise((resolvePassword, rejectPassword) => {
        stdout.write(label)
        stdin.setRawMode(true)
        stdin.resume()
        stdin.setEncoding('utf8')

        let value = ''
        const finish = (err, result) => {
            stdin.removeListener('data', onData)
            stdin.setRawMode(false)
            stdin.pause()
            stdout.write('\n')
            if (err) rejectPassword(err)
            else resolvePassword(result)
        }

        const onData = (chunk) => {
            for (const char of chunk) {
                if (char === '\r' || char === '\n' || char === '\u0004') return finish(null, value)
                if (char === '\u0003') return finish(new Error('Cancelled.'))
                if (char === '\u007f' || char === '\b') value = value.slice(0, -1)
                else if (char >= ' ') value += char
            }
        }

        stdin.on('data', onData)
    })
}

async function readStdin() {
    const chunks = []
    for await (const chunk of process.stdin) chunks.push(chunk)
    return Buffer.concat(chunks).toString('utf8').replace(/\r?\n$/, '')
}

async function resolveNewPassword(flags) {
    if (flags.stdin) return readStdin()
    if (process.env.NEW_ADMIN_PASSWORD) return process.env.NEW_ADMIN_PASSWORD

    const password = await promptHidden('New admin password: ')
    const confirmation = await promptHidden('Confirm password: ')
    if (password !== confirmation) fail('Passwords do not match. Nothing was changed.')
    return password
}

function asSqlLiteral(value) {
    // Hashes and tokens are base64url plus '$' separators, so a quote here would
    // mean the generators changed and this interpolation is no longer safe.
    if (/['\\]/.test(value)) throw new Error('Generated value is not safe to inline in SQL.')
    return `'${value}'`
}

// Upserts so the reset works whether the admin row is intact, corrupt, or deleted.
// The session secret is rotated to sign out every existing session, matching what
// POST /api/auth/change-password does, and the rate-limit rows are cleared so a
// lockout from failed attempts doesn't block the first login with the new password.
function buildSql(passwordHash, sessionSecret) {
    return `INSERT OR IGNORE INTO site_settings (id) VALUES (1);

INSERT INTO admin (id, password_hash, session_secret)
VALUES (1, ${asSqlLiteral(passwordHash)}, ${asSqlLiteral(sessionSecret)})
ON CONFLICT(id) DO UPDATE SET
  password_hash = excluded.password_hash,
  session_secret = excluded.session_secret,
  updated_at = unixepoch();

DELETE FROM login_attempts;
`
}

function executeSql(databaseName, sqlFilePath, local) {
    const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'
    const args = [
        'wrangler',
        'd1',
        'execute',
        databaseName,
        local ? '--local' : '--remote',
        '--yes',
        '--file',
        sqlFilePath,
    ]
    const result = spawnSync(npx, args, { cwd: backendRoot, stdio: 'inherit' })
    if (result.error) throw result.error
    return result.status ?? 1
}

const flags = parseArgs(process.argv.slice(2))
const { hashPassword, isStrongPassword, randomToken } = await loadWorkerCrypto()

const password = await resolveNewPassword(flags)
if (!isStrongPassword(password)) {
    fail(
        'Password must be at least 12 characters and include upper, lower, number, and a special character.',
    )
}

const sql = buildSql(await hashPassword(password), randomToken(32))

if (flags.printSql) {
    process.stdout.write(sql)
    process.exit(0)
}

const databaseName = readDatabaseName()
const tempDir = mkdtempSync(join(tmpdir(), 'dyeink-reset-'))
const sqlFilePath = join(tempDir, 'reset-admin-password.sql')

let status
try {
    writeFileSync(sqlFilePath, sql, { mode: 0o600 })
    console.log(`Applying to D1 database "${databaseName}" (${flags.local ? 'local' : 'remote'})…`)
    status = executeSql(databaseName, sqlFilePath, flags.local)
} finally {
    rmSync(tempDir, { recursive: true, force: true })
}

if (status !== 0) {
    fail(
        `\nWrangler exited with code ${status}. Common causes:\n` +
            '  - Not signed in: run `npx wrangler login`.\n' +
            '  - Wrong account: set CLOUDFLARE_ACCOUNT_ID (and CLOUDFLARE_API_TOKEN in CI).\n' +
            '  - Tables missing because the site has never been opened: run `npm run db:migrate`.\n' +
            'Nothing was changed if the statements did not run.',
    )
}

console.log('\n✓ Admin password updated. All existing sessions were signed out.')
console.log('  Sign in at /login with the new password.')
