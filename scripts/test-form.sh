#!/bin/bash

# Comprehensive Form Testing Script
# Run this before making any changes to DynamicApplicationForm

echo "🧪 Running Comprehensive Form Tests..."
echo "======================================"

echo ""
echo "📊 1. Core Form Logic Tests"
echo "-------------------------"
bun run test:form

echo ""
echo "🔧 2. TypeScript Validation"  
echo "------------------------"
bun run typecheck

echo ""
echo "🎯 3. Code Quality Check"
echo "----------------------"
bun run lint src/app/_components/DynamicApplicationForm.tsx


echo ""
echo "✅ Form Testing Complete!"
echo ""
echo "If all tests pass, the form is safe to modify."
echo "If any tests fail, fix issues before making changes."