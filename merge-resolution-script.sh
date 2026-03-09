#!/bin/bash

# Merge conflict resolution script for agentflow/adding-varcel and main branches
# This script will guide through the merge conflict resolution process

set -e

echo "🔄 Starting merge conflict resolution for candy codebase"
echo "Branches: agentflow/adding-varcel <- main"

# Step 1: Ensure we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

# Step 2: Fetch latest changes from remote
echo "📡 Fetching latest changes from remote..."
git fetch origin

# Step 3: Show current branch
current_branch=$(git branch --show-current)
echo "📍 Current branch: $current_branch"

# Step 4: Switch to agentflow/adding-varcel branch
echo "🔀 Switching to agentflow/adding-varcel branch..."
if git show-ref --verify --quiet refs/heads/agentflow/adding-varcel; then
    git checkout agentflow/adding-varcel
    git pull origin agentflow/adding-varcel
else
    echo "⚠️  Local branch doesn't exist, checking out from remote..."
    git checkout -b agentflow/adding-varcel origin/agentflow/adding-varcel
fi

# Step 5: Show branch status before merge
echo "📊 Branch status before merge:"
git log --oneline -5
echo ""

# Step 6: Attempt merge with main
echo "🔀 Attempting to merge main into agentflow/adding-varcel..."
if git merge main; then
    echo "✅ Merge completed successfully without conflicts!"
    echo "🚀 Pushing resolved branch to remote..."
    git push origin agentflow/adding-varcel
    echo "✨ Merge resolution complete!"
else
    echo "⚠️  Merge conflicts detected. Running conflict analysis..."
    
    # Step 7: Analyze conflicts
    echo "📋 Files with conflicts:"
    git status --porcelain | grep "^UU\|^AA\|^DD\|^AU\|^UA\|^DU\|^UD" || echo "No standard merge conflicts found"
    
    echo ""
    echo "🔍 Detailed conflict analysis:"
    git status
    
    echo ""
    echo "📝 Conflict resolution needed for the following files:"
    git diff --name-only --diff-filter=U
    
    echo ""
    echo "🛠️  Please resolve conflicts manually and then run:"
    echo "   git add ."
    echo "   git commit -m 'resolve: merge conflicts between agentflow/adding-varcel and main'"
    echo "   git push origin agentflow/adding-varcel"
fi

echo "📋 Merge resolution script completed"