#!/bin/bash
# Script to add dark mode classes to all page components
# Run this from the project root

echo "Updating dark mode classes in page components..."

# Update main container backgrounds
find src/pages/creator -name "*.tsx" -type f -exec sed -i \
  -e 's/bg-evz-light text-slate-900/bg-evz-light dark:bg-slate-900 text-slate-900 dark:text-slate-100/g' \
  -e 's/bg-white rounded-2xl/bg-white dark:bg-slate-800 rounded-2xl/g' \
  -e 's/bg-white rounded-xl/bg-white dark:bg-slate-800 rounded-xl/g' \
  -e 's/bg-white rounded-lg/bg-white dark:bg-slate-800 rounded-lg/g' \
  -e 's/border-slate-200/border-slate-200 dark:border-slate-700/g' \
  -e 's/border-slate-100/border-slate-100 dark:border-slate-700/g' \
  -e 's/border-slate-300/border-slate-300 dark:border-slate-600/g' \
  -e 's/text-slate-900/text-slate-900 dark:text-slate-100/g' \
  -e 's/text-slate-700/text-slate-700 dark:text-slate-200/g' \
  -e 's/text-slate-600/text-slate-600 dark:text-slate-300/g' \
  -e 's/text-slate-500/text-slate-500 dark:text-slate-400/g' \
  -e 's/text-slate-400/text-slate-400 dark:text-slate-500/g' \
  -e 's/bg-slate-50 hover:bg-slate-50/bg-slate-50 dark:bg-slate-700\/50 hover:bg-slate-50 dark:hover:bg-slate-700/g' \
  -e 's/bg-slate-100 hover:bg-slate-100/bg-slate-100 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600/g' \
  -e 's/hover:bg-white/hover:bg-white dark:hover:bg-slate-700/g' \
  {} \;

echo "Dark mode classes updated. Please review and test the changes."

