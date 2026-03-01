# commit-to-dev

Safely commit local changes to the `dev` branch with an AI-generated commit message, then push to GitHub.

## Instructions

When this skill is invoked, follow these steps in order:

### 1. Pre-flight Checks

Run these commands in parallel to verify repository state:
- `git rev-parse --is-inside-work-tree` - Verify we're in a git repo
- `git status --porcelain` - Check for changes
- `git diff --check` - Check for merge conflicts

If not in a git repo, respond: "❌ Not in a git repository" and exit.
If there are merge conflict markers, respond: "❌ Merge conflicts detected. Please resolve them first." and exit.

### 2. Fetch and Prepare Dev Branch

Run sequentially:
1. `git fetch origin` - Fetch latest from remote
2. Check if dev branch exists:
   - `git rev-parse --verify dev` (local check)
   - `git ls-remote --heads origin dev` (remote check)
3. Based on results:
   - **If dev exists locally**: `git checkout dev`
   - **If dev exists only on remote**: `git checkout -b dev origin/dev`
   - **If dev doesn't exist**: `git checkout -b dev main`
4. `git pull origin dev` (if branch already existed remotely)

Display current branch: `git branch --show-current`

### 3. Stage Changes

Run: `git add .`

Then verify changes are staged: `git status --porcelain`

If no changes are staged, respond: "✓ No changes to commit" and exit.

### 4. Generate AI Commit Message

Run these commands in parallel to analyze changes:
- `git diff --staged --stat` - Get file statistics
- `git diff --staged` - Get full diff (up to reasonable size)
- `git status --short` - Get summary of changes

Analyze the changes and generate a commit message that:
- Uses conventional commit format: `type: brief description`
- Types: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `style`, `perf`
- Title is ≤72 characters
- Includes a blank line, then bullet points if changes are substantial
- Reflects actual intent (not just "update files")
- Is specific and professional

**Example Good Messages:**

```
feat: add pipeline date validation logic

- Implement consistent date parsing strategy
- Remove implicit timezone conversions
- Add validation for invalid input formats
```

```
fix: resolve deal card rendering issue in pipeline view

- Handle null stage_id gracefully
- Add fallback UI for missing data
```

```
refactor: extract deal repository logic into separate module
```

### 5. User Approval

Display the generated commit message in a code block, then use the `AskUserQuestion` tool with:

**Question**: "Commit with this message?"
**Header**: "Commit"
**Options**:
1. **Label**: "Yes, commit and push", **Description**: "Use this commit message and push to origin/dev"
2. **Label**: "No, cancel", **Description**: "Abort the commit process"
3. **Label**: "Edit message", **Description**: "Let me modify the commit message first"

Based on user selection:
- **Yes**: Proceed to step 6
- **No**: Respond "❌ Commit cancelled" and exit
- **Edit**: Ask user to provide their commit message, then proceed to step 6 with their message

### 6. Commit and Push

Run sequentially:
1. Commit with the approved message using heredoc format:
   ```bash
   git commit -m "$(cat <<'EOF'
   [commit message here]

   Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
   EOF
   )"
   ```
2. `git push origin dev`
3. `git log -1 --oneline` - Show the commit that was created

Display success message: "✓ Changes committed and pushed to dev"

## Safety Features

- Never force push
- Fail fast on merge conflicts
- Require user approval before committing
- Clear branch indication before committing
- Safe to run multiple times

## Usage

Invoke with: `/commit-to-dev`

No arguments required.
