# Form Quality Check

Comprehensive form component review using specialized agents to identify performance issues, React anti-patterns, and data flow problems.

## Usage

```
/form-quality-check
```

## Description

This command uses Claude Code's specialized agents to perform an in-depth review of form components, specifically designed to catch the types of issues that caused infinite loops, data loss, and performance problems in the DynamicApplicationForm.

## What It Does

1. **Performance Analysis**: Uses build-tester agent to identify React anti-patterns
2. **Architecture Review**: Analyzes component structure and data flow
3. **State Management**: Reviews useEffect dependencies and state synchronization
4. **Testing Recommendations**: Suggests additional tests based on component complexity

## When to Use

- **After adding new form features**: Ensure no anti-patterns introduced
- **Before complex form refactoring**: Identify potential issues early
- **When performance issues reported**: Systematic analysis approach
- **Regular maintenance**: Periodic form health checks

## Implementation

The command executes:

1. **Build-tester agent review**:
   ```
   Task build-tester "Comprehensive review of DynamicApplicationForm for React anti-patterns, performance issues, and infinite loop risks. Focus on useEffect dependencies, state management, and re-render optimization."
   ```

2. **Architecture analysis**:
   ```  
   Task general-purpose "Analyze DynamicApplicationForm component architecture. Identify: multiple data sources, complex state management, potential race conditions, and suggest simplifications."
   ```

3. **Testing gap analysis**:
   ```
   Task general-purpose "Review DynamicApplicationForm and identify testing gaps. Suggest additional test cases based on component complexity and potential failure modes."
   ```

## Agent Focus Areas

### Build-tester Agent
- **useEffect dependency analysis**: Detect unstable dependencies
- **Re-render optimization**: Identify unnecessary re-renders
- **Performance anti-patterns**: Multiple queries, complex state updates
- **React best practices**: Component structure validation

### General-purpose Agent  
- **Data flow analysis**: Multiple sources of truth issues
- **State synchronization**: Frontend-backend consistency
- **Error handling**: Graceful failure mode validation
- **Architecture patterns**: Hybrid data flow validation

## Expected Output

The agents will provide:
- **Performance risk assessment**: High/Medium/Low risk areas
- **Specific recommendations**: Actionable fixes for identified issues
- **Testing suggestions**: Additional test cases to add
- **Architecture feedback**: Structural improvement opportunities

## Background

Created after extensive debugging of:
- Infinite re-render loops from unstable useEffect dependencies
- Data disappearing due to aggressive refetching
- Over-engineered auto-save causing race conditions
- State synchronization mismatches

This command provides proactive analysis to prevent similar issues.

## Related Documentation

- `form-performance-lessons-learned.md` - Detailed analysis of past issues
- `CLAUDE.md` - Project-specific form development standards
- Test files in `src/app/_components/__tests__/`