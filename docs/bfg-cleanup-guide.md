# BFG Repository History Cleanup Guide

**Repository:** `JayWorld-projects/olfactra-platform`
**Prepared:** March 7, 2026
**Status:** Ready for cleanup

---

## 1. Paths to Purge

The following 17 files exist in historical commits but have already been removed from the current HEAD. They need to be purged from git history using BFG Repo Cleaner.

### `.manus/db/` — Database Query Logs (15 files)

These JSON files contain raw SQL queries along with the database connection command, which includes the TiDB Cloud hostname, username, and database name. They were introduced across 4 commits and removed in the security prep checkpoint.

| File | Sensitive Content |
|---|---|
| `.manus/db/db-query-1771653251795.json` | DB host, username, database name |
| `.manus/db/db-query-1771653268570.json` | DB host, username, database name |
| `.manus/db/db-query-1772476129042.json` | DB host, username, database name |
| `.manus/db/db-query-1772476135319.json` | DB host, username, database name |
| `.manus/db/db-query-1772476141256.json` | DB host, username, database name |
| `.manus/db/db-query-1772476215140.json` | DB host, username, database name |
| `.manus/db/db-query-1772476236975.json` | DB host, username, database name |
| `.manus/db/db-query-1772487754655.json` | DB host, username, database name |
| `.manus/db/db-query-1772487782642.json` | DB host, username, database name |
| `.manus/db/db-query-1772487880342.json` | DB host, username, database name |
| `.manus/db/db-query-1772487894866.json` | DB host, username, database name |
| `.manus/db/db-query-1772489351628.json` | DB host, username, database name |
| `.manus/db/db-query-1772489370799.json` | DB host, username, database name |
| `.manus/db/db-query-1772765566904.json` | DB host, username, database name |
| `.manus/db/db-query-1772765581466.json` | DB host, username, database name |

### `client/public/__manus__/` — Debug Collector (1 file)

| File | Content |
|---|---|
| `client/public/__manus__/debug-collector.js` | Manus platform debug/telemetry script |

### Additional Paths Found

No additional debug, log, or sensitive artifacts were found in the history. Specifically:

- No `.manus-logs/` files were ever committed.
- No `.env` files were ever committed.
- No other log files (`.log`) were ever committed.

---

## 2. .gitignore Verification

The current `.gitignore` already blocks all identified paths from future commits.

| Pattern | Blocks | Status |
|---|---|---|
| `.manus/` | All `.manus/db/` query logs and any future `.manus/` files | Covered |
| `.manus-logs/` | Any Manus log directory | Covered |
| `client/public/__manus__/` | Debug collector and any future debug artifacts | Covered |
| `*.log` | All log files | Covered |
| `.env` and `.env.*` | All environment files | Covered |
| `!.env.example` | Exception: `.env.example` is allowed | Covered |

No additional `.gitignore` entries are needed.

---

## 3. BFG Cleanup Commands

Run these commands on your local machine. You will need Java installed (BFG is a Java JAR) and git.

### Prerequisites

Download BFG Repo Cleaner if you don't have it:

```bash
# macOS with Homebrew
brew install bfg

# Or download the JAR directly
# https://rtyley.github.io/bfg-repo-cleaner/
# wget https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar
```

### Step 1: Clone the repository in mirror mode

```bash
git clone --mirror https://github.com/JayWorld-projects/olfactra-platform.git
cd olfactra-platform.git
```

> **Important:** Use `--mirror` to get a bare clone with all refs. This is required for BFG to rewrite all branches and tags.

### Step 2: Run BFG to delete the identified folders

```bash
# If installed via Homebrew:
bfg --delete-folders '{.manus,__manus__}' .

# If using the JAR directly:
# java -jar bfg-1.14.0.jar --delete-folders '{.manus,__manus__}' .
```

This single command removes both `.manus/db/` (and any other `.manus/` subdirectories) and `client/public/__manus__/` from all historical commits. BFG protects the current HEAD by default, so it will only rewrite history — it will not touch the latest commit (which is already clean).

### Step 3: Clean and compact the repository

```bash
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

This removes the old unreferenced objects that BFG orphaned, reducing the repository size.

### Step 4: Force push the sanitized history

```bash
git push --force
```

> **Warning:** This rewrites the remote history. Since this is a private repository with no other collaborators, this is safe. If anyone else has cloned the repo, they will need to re-clone after this push.

---

## 4. Post-Cleanup Verification

After the force push, run these commands to confirm the history is clean.

### Verify from a fresh clone

```bash
cd ..
rm -rf olfactra-platform.git
git clone https://github.com/JayWorld-projects/olfactra-platform.git
cd olfactra-platform
```

### Check that no .manus/ or __manus__ paths exist in any commit

```bash
echo "=== Searching all history for .manus/ ==="
git log --all --diff-filter=A --name-only --pretty=format: | sort -u | grep '.manus/'
echo "Exit code: $? (1 = not found = CLEAN)"

echo "=== Searching all history for __manus__ ==="
git log --all --diff-filter=A --name-only --pretty=format: | sort -u | grep '__manus__'
echo "Exit code: $? (1 = not found = CLEAN)"
```

Both commands should return exit code `1` (no matches found).

### Check that no sensitive strings exist in any blob

```bash
echo "=== Searching all blobs for DB hostname ==="
git rev-list --all | while read commit; do
  git ls-tree -r "$commit" | awk '{print $3}' | while read blob; do
    git cat-file -p "$blob" 2>/dev/null | grep -q 'gateway04.us-east-1.prod.aws' && echo "FOUND in commit $commit blob $blob"
  done
done
echo "Scan complete (no output above = CLEAN)"
```

> **Note:** This scan can take a few minutes depending on repository size. If no "FOUND" lines appear, the history is fully clean.

### Verify the application still works

```bash
pnpm install
pnpm check        # TypeScript: expect 0 errors
pnpm test          # Tests: expect 89 passing
pnpm build         # Build: expect success
```

---

## 5. Summary

| Item | Detail |
|---|---|
| **Files to purge** | 15 `.manus/db/` query logs + 1 `client/public/__manus__/debug-collector.js` |
| **Commits affected** | 4 out of 40 total commits |
| **Current HEAD** | Already clean — no sensitive files tracked |
| **`.gitignore`** | Blocks all identified paths from future commits |
| **BFG command** | `bfg --delete-folders '{.manus,__manus__}'` |
| **Risk level** | Low — private repo, no external collaborators |
| **Safe to proceed** | Yes |
