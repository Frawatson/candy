# Merge Conflict Resolution Guide

## Overview
This guide helps resolve merge conflicts between `agentflow/adding-varcel` and `main` branches in the candy codebase.

## Pre-Resolution Checklist

- [ ] Backup current work
- [ ] Ensure git repository is clean
- [ ] Fetch latest changes from remote
- [ ] Identify the scope of conflicts

## Conflict Resolution Process

### 1. Understanding Conflict Markers

```
<<<<<<< HEAD (agentflow/adding-varcel)
// Changes from agentflow/adding-varcel branch
=======
// Changes from main branch
>>>>>>> main
```

### 2. Common Conflict Types Expected

#### Vercel Configuration Conflicts
- `vercel.json` - Deployment configuration
- `package.json` - Scripts and dependencies for Vercel
- Environment configuration files

#### Application Code Conflicts
- Component implementations
- API routes or endpoints
- Build configurations
- Styling changes

### 3. Resolution Strategy

#### For Vercel-specific files:
- **Priority**: Preserve Vercel configuration from `agentflow/adding-varcel`
- **Merge**: Combine compatible settings from both branches
- **Validate**: Ensure Vercel deployment settings are correct

#### For application code:
- **Priority**: Maintain functionality from `main` branch
- **Enhancement**: Integrate improvements from `agentflow/adding-varcel`
- **Testing**: Verify code still works after resolution

#### For configuration files:
- **Merge carefully**: Combine settings where possible
- **Preserve environment separation**: Keep dev/prod configurations intact
- **Security check**: Ensure no sensitive data is exposed

### 4. Resolution Steps

1. **Open conflicted file in editor**
2. **Analyze both versions of the conflict**
3. **Choose resolution strategy**:
   - Keep HEAD version (agentflow/adding-varcel)
   - Keep incoming version (main)
   - Combine both versions
   - Write new implementation
4. **Remove conflict markers**
5. **Test the resolved code**
6. **Stage the resolved file**: `git add filename`

### 5. Common Resolution Patterns

#### Pattern 1: Configuration Merge
```javascript
// Before (conflict)
<<<<<<< HEAD
{
  "build": {
    "env": {
      "NODE_ENV": "production"
    }
  }
}
=======
{
  "scripts": {
    "build": "next build",
    "start": "next start"
  }
}
>>>>>>> main

// After (resolved)
{
  "build": {
    "env": {
      "NODE_ENV": "production"
    }
  },
  "scripts": {
    "build": "next build",
    "start": "next start"
  }
}
```

#### Pattern 2: Code Integration
```javascript
// Before (conflict)
<<<<<<< HEAD
export default function Component() {
  // Vercel-specific implementation
  return <VercelOptimizedComponent />;
}
=======
export default function Component() {
  // Main branch implementation
  return <StandardComponent />;
}
>>>>>>> main

// After (resolved)
export default function Component() {
  // Combined implementation with conditional rendering
  const isVercelDeployment = process.env.VERCEL === '1';
  
  return isVercelDeployment 
    ? <VercelOptimizedComponent />
    : <StandardComponent />;
}
```

### 6. Verification Checklist

After resolving conflicts:

- [ ] All conflict markers removed
- [ ] Code compiles without errors
- [ ] Tests pass (if available)
- [ ] Vercel configuration is valid
- [ ] No sensitive information exposed
- [ ] Functionality preserved from both branches

### 7. Final Steps

```bash
# Stage all resolved files
git add .

# Commit with descriptive message
git commit -m "resolve: merge conflicts between agentflow/adding-varcel and main

- Integrated Vercel deployment configuration
- Preserved main branch functionality
- Combined compatible features from both branches
- Verified deployment settings and security"

# Push to remote
git push origin agentflow/adding-varcel
```

## Troubleshooting

### If merge fails completely:
```bash
# Abort merge and start over
git merge --abort

# Try with different strategy
git merge -X theirs main  # Prefer main branch changes
# or
git merge -X ours main   # Prefer current branch changes
```

### If conflicts are too complex:
1. Consider using a visual merge tool: `git mergetool`
2. Create a new integration branch for testing
3. Seek code review for critical conflicts

## Best Practices

1. **Document decisions**: Comment why specific resolution was chosen
2. **Test thoroughly**: Verify functionality after resolution
3. **Security review**: Check for exposed secrets or vulnerabilities
4. **Performance check**: Ensure merge doesn't introduce performance issues
5. **Deployment test**: Verify Vercel deployment still works correctly

## Emergency Rollback

If resolution causes issues:
```bash
# Find the commit before merge attempt
git log --oneline

# Reset to that commit
git reset --hard <commit-hash>

# Force push (be careful!)
git push --force-with-lease origin agentflow/adding-varcel
```