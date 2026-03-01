# commit-to-dev

A Claude Code skill that safely commits local changes to the `dev` branch with AI-generated commit messages.

## What It Does

1. ✅ Verifies you're in a git repository
2. 🔄 Fetches latest changes from origin
3. 🌿 Ensures `dev` branch exists (creates from `main` if needed)
4. 📥 Pulls latest `dev` from origin
5. ➕ Stages all changes (`git add .`)
6. 🤖 Generates a high-quality commit message using AI
7. ✋ Prompts for your approval (Yes/No/Edit)
8. 💾 Commits and pushes to `origin/dev`

## Usage

```bash
/commit-to-dev
```

That's it! No arguments needed.

## Example Workflow

```
You: /commit-to-dev

Claude:
✓ On branch: dev
✓ Staged 5 files

Generated commit message:

    feat: add pipeline date validation logic

    - Implement consistent date parsing strategy
    - Remove implicit timezone conversions
    - Add validation for invalid input formats

[Interactive prompt: Commit with this message?]
- Yes, commit and push ✓
- No, cancel
- Edit message

You: [Select "Yes, commit and push"]

Claude:
✓ Changes committed and pushed to dev
  abc1234 feat: add pipeline date validation logic
```

## Safety Features

- 🛡️ Never force pushes
- ⚠️ Fails on merge conflicts
- 🔍 Shows branch before committing
- ✋ Requires approval before commit
- ♻️ Safe to run multiple times

## Requirements

- Git repository
- Remote named `origin`
- Claude Code CLI

## Commit Message Quality

The AI analyzes your actual code changes to generate commit messages that:

- Follow conventional commit format (`feat:`, `fix:`, etc.)
- Stay under 72 characters for the title
- Include bullet points for complex changes
- Reflect actual intent, not just file names
- Are professional and clear

## Branch Strategy

The skill enforces a `dev` branch workflow:

- If `dev` exists locally → uses it
- If `dev` exists on remote only → creates local tracking branch
- If `dev` doesn't exist → creates it from `main`

This supports a typical Git Flow or GitHub Flow workflow where `dev` is your integration branch.

## Troubleshooting

**"Not in a git repository"**
- Run this command from inside your git project

**"Merge conflicts detected"**
- Resolve conflicts manually first
- Run `git status` to see conflicted files

**"No changes to commit"**
- This is normal - the skill detected nothing was staged
- Make changes first, then run `/commit-to-dev`

## Installation

This skill is automatically available in your project. It's located at:
```
.claude/skills/commit-to-dev/skill.md
```

Claude Code automatically discovers skills in `.claude/skills/*/skill.md`.
