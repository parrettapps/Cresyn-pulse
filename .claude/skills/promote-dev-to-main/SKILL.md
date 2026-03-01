# promote-dev-to-main

Safely merge the `dev` branch into `main` after testing is complete.

## Instructions

When this skill is invoked, follow these steps in order:

### 1. Pre-flight Checks

Run these commands in parallel to verify repository state:
- `git rev-parse --is-inside-work-tree` - Verify we're in a git repo
- `git status --porcelain` - Check for uncommitted changes
- `git diff --check` - Check for merge conflict markers

If not in a git repo, respond: "❌ Not in a git repository" and exit.
If there are uncommitted changes, respond: "❌ Working directory is not clean. Commit or stash your changes first." and display `git status --short`, then exit.
If there are merge conflict markers, respond: "❌ Merge conflicts detected. Please resolve them first." and exit.

### 2. Fetch Latest Changes

Run: `git fetch origin`

Display: "✓ Fetched latest changes from origin"

### 3. Verify Required Branches Exist

Run in parallel:
- `git rev-parse --verify main` - Check main exists locally
- `git rev-parse --verify dev` - Check dev exists locally
- `git ls-remote --heads origin main` - Check main exists remotely
- `git ls-remote --heads origin dev` - Check dev exists remotely

If either `main` or `dev` doesn't exist, respond: "❌ Both main and dev branches must exist" and exit.

### 4. Checkout and Update Main

Run sequentially:
1. `git checkout main`
2. `git pull origin main`

Display current branch: `git branch --show-current`

### 5. Ensure Dev is Up to Date

Run: `git fetch origin dev:dev`

This updates the local dev branch with the latest from origin without checking it out.

### 6. Generate Merge Summary

Run these commands in parallel:
- `git log main..dev --oneline --no-merges` - Get commits that will be merged
- `git diff --stat main..dev` - Get file statistics
- `git rev-parse dev` - Get dev SHA
- `git rev-parse main` - Get main SHA

Display a summary showing:
- Number of commits to be merged
- List of commit messages (first 10 if more than 10)
- File change statistics
- Branch SHAs

Example format:
```
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
```

### 7. User Confirmation

Use the `AskUserQuestion` tool with:

**Question**: "Proceed with merging dev into main?"
**Header**: "Merge"
**Options**:
1. **Label**: "Yes, merge and push", **Description**: "Merge dev into main with --no-ff and push to origin"
2. **Label**: "Yes, merge with version tag", **Description**: "Merge and create a version tag (you'll specify the version)"
3. **Label**: "No, cancel", **Description**: "Abort the merge process"

Based on user selection:
- **Yes, merge and push**: Set `create_tag = false`, proceed to step 8
- **Yes, merge with version tag**: Set `create_tag = true`, proceed to step 7.1
- **No, cancel**: Respond "❌ Merge cancelled" and exit

#### 7.1 Get Version Tag (if user chose tagging option)

Use the `AskUserQuestion` tool with:

**Question**: "What version number should be tagged? (e.g., v1.2.0, v2.0.0-beta)"
**Header**: "Version"
**Options**:
1. **Label**: "v1.0.0", **Description**: "Major release version 1.0.0"
2. **Label**: "v0.1.0", **Description**: "Minor release version 0.1.0"
3. **Label**: "v0.0.1", **Description**: "Patch release version 0.0.1"

Store the user's response (or custom input) as `version_tag`.

Validate tag format: must start with 'v' and contain valid semver pattern (e.g., v1.2.3).
If invalid, respond: "❌ Invalid version format. Must be like v1.2.0" and exit.

Check if tag already exists: `git tag -l "${version_tag}"`
If tag exists, respond: "❌ Tag ${version_tag} already exists" and exit.

### 8. Merge Dev into Main

Run: `git merge dev --no-ff -m "Merge dev into main"`

If the merge fails (exit code ≠ 0):
1. Run: `git merge --abort`
2. Respond with:
   ```
   ❌ Merge conflict detected

   The following files have conflicts:
   [output from git status --short]

   To resolve:
   1. git checkout main
   2. git merge dev --no-ff
   3. Manually resolve conflicts
   4. git add <resolved-files>
   5. git commit
   6. git push origin main
   ```
3. Exit

If merge succeeds, display: "✓ Successfully merged dev into main"

### 9. Create Version Tag (if requested)

If `create_tag = true`:

Run sequentially:
1. Create annotated tag with merge summary:
   ```bash
   git tag -a "${version_tag}" -m "$(cat <<'EOF'
   Release ${version_tag}

   Merged from dev branch
   [Include first 5 commit titles from the merge]

   Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
   EOF
   )"
   ```
2. Display: "✓ Created tag ${version_tag}"

### 10. Push to Origin

Run sequentially:
1. `git push origin main`
2. If tag was created: `git push origin ${version_tag}`

Display: "✓ Pushed to origin/main"
If tag was created, also display: "✓ Pushed tag ${version_tag}"

### 11. Display Summary

Run: `git log -1 --oneline`

Display final summary:
```
✅ Merge Complete

main is now at: [commit SHA and message]
Branch: main
Status: Pushed to origin
Tag: [version_tag if created, otherwise "none"]

Summary:
- Merged X commits from dev
- Updated Y files
- [Tag version_tag created] (if applicable)
```

## Safety Features

- Never force push
- Never delete branches
- Requires clean working directory
- Requires user confirmation before merging
- Aborts safely on conflicts with clear instructions
- Uses --no-ff to preserve merge history

## Usage

Basic merge without tagging:
```
/promote-dev-to-main
```

The skill will prompt you to choose whether to tag during execution.

## Conflict Resolution

If conflicts occur, the skill:
1. Aborts the merge automatically
2. Provides step-by-step instructions
3. Does not leave repository in a broken state
