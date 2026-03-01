# promote-dev-to-main

A Claude Code skill that safely merges the `dev` branch into `main` after testing is complete.

## What It Does

1. ✅ Verifies working directory is clean
2. 🔄 Fetches latest changes from origin
3. 📍 Checks out and updates `main`
4. 🔍 Ensures `dev` is up to date with origin
5. 📊 Shows a summary of changes to be merged
6. ✋ Prompts for confirmation
7. 🔀 Merges `dev` into `main` with `--no-ff` (preserves history)
8. 🏷️ Optionally creates a version tag
9. 📤 Pushes `main` (and tag if created) to origin
10. ✅ Displays completion summary

## Usage

```bash
/promote-dev-to-main
```

That's it! The skill handles the rest interactively.

## Example Workflow

```
You: /promote-dev-to-main

Claude:
✓ Fetched latest changes from origin
✓ On branch: main

📊 Merge Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Branch: dev → main
Commits to merge: 5

Recent commits:
  abc1234 feat: add pipeline date validation
  def5678 fix: resolve deal card rendering
  ghi9012 refactor: extract repository logic
  jkl3456 test: add unit tests for deals
  mno7890 docs: update API documentation

Files changed: 12 files, +234, -67
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Interactive prompt: Proceed with merging dev into main?]
○ Yes, merge and push
○ Yes, merge with version tag ✓
○ No, cancel

You: [Select "Yes, merge with version tag"]

Claude:
[Interactive prompt: What version number should be tagged?]
○ v1.0.0
○ v0.1.0
○ v0.0.1 ✓
○ [Custom input: v0.2.0]

You: v0.2.0

Claude:
✓ Successfully merged dev into main
✓ Created tag v0.2.0
✓ Pushed to origin/main
✓ Pushed tag v0.2.0

✅ Merge Complete

main is now at: xyz9876 Merge dev into main
Branch: main
Status: Pushed to origin
Tag: v0.2.0

Summary:
- Merged 5 commits from dev
- Updated 12 files
- Tag v0.2.0 created
```

## Safety Features

- 🛡️ Never force pushes
- 🔒 Requires clean working directory
- ✋ Requires user confirmation before merging
- 🚫 Never deletes branches automatically
- ⚠️ Aborts safely on conflicts with clear instructions
- 📜 Uses `--no-ff` to preserve merge history
- 🏷️ Validates version tag format
- 🔍 Checks for existing tags to prevent duplicates

## Merge Strategy

This skill uses **non-fast-forward merges** (`--no-ff`):

```
     D---E---F dev
    /         \
A---B---C------G main
```

This preserves the branch history and makes it clear when features were merged, unlike fast-forward merges which create a linear history.

## Version Tagging

When you choose to create a version tag:

- The skill validates semver format (e.g., `v1.2.3`)
- Checks if the tag already exists
- Creates an annotated tag with merge details
- Pushes the tag to origin

Common versioning patterns:
- **Major**: `v1.0.0`, `v2.0.0` - Breaking changes
- **Minor**: `v1.1.0`, `v1.2.0` - New features, backward compatible
- **Patch**: `v1.0.1`, `v1.0.2` - Bug fixes
- **Pre-release**: `v1.0.0-beta`, `v2.0.0-rc.1`

## Conflict Resolution

If merge conflicts occur, the skill:

1. **Aborts the merge** automatically with `git merge --abort`
2. **Displays conflicted files** from `git status`
3. **Provides step-by-step instructions**:
   ```
   ❌ Merge conflict detected

   The following files have conflicts:
   MM apps/api/src/modules/pipeline/pipeline.service.ts
   MM apps/web/src/app/app/pipeline/page.tsx

   To resolve:
   1. git checkout main
   2. git merge dev --no-ff
   3. Manually resolve conflicts
   4. git add <resolved-files>
   5. git commit
   6. git push origin main
   ```
4. **Exits safely** - Your repository is left in a clean state

## Pre-flight Checks

The skill verifies:

✅ You're in a git repository
✅ Working directory is clean (no uncommitted changes)
✅ Both `main` and `dev` branches exist
✅ No merge conflict markers in files
✅ Can fetch from origin

If any check fails, the skill exits with a clear error message.

## Requirements

- Git repository
- Remote named `origin`
- Branches: `main` and `dev`
- Claude Code CLI

## Use Cases

**Weekly Release Cycle**
```bash
# After testing dev all week
/promote-dev-to-main
# Choose: Yes, merge with version tag
# Tag: v1.3.0
```

**Hotfix Promotion**
```bash
# After fixing critical bug in dev
/promote-dev-to-main
# Choose: Yes, merge with version tag
# Tag: v1.2.1
```

**Regular Integration** (no tagging)
```bash
/promote-dev-to-main
# Choose: Yes, merge and push
```

## Troubleshooting

**"Working directory is not clean"**
- Commit your changes: `/commit-to-dev`
- Or stash them: `git stash`

**"Merge conflict detected"**
- Follow the instructions provided
- Resolve conflicts manually
- Complete the merge with `git commit`

**"Tag already exists"**
- Choose a different version number
- Or delete the old tag if it was created in error:
  ```bash
  git tag -d v1.0.0
  git push origin :refs/tags/v1.0.0
  ```

**"Both main and dev branches must exist"**
- Ensure you've created both branches
- Run `git branch -a` to see all branches

## Installation

This skill is automatically available in your project. It's located at:
```
.claude/skills/promote-dev-to-main/skill.md
```

Claude Code automatically discovers skills in `.claude/skills/*/skill.md`.

## Workflow Combination

Use with the `commit-to-dev` skill for a complete workflow:

```bash
# 1. Commit work to dev
/commit-to-dev

# 2. Test in dev environment
# ... testing ...

# 3. Promote to main when ready
/promote-dev-to-main
```

This creates a clean, safe git workflow:
- **dev** = integration branch for active development
- **main** = production-ready code with versioned releases
