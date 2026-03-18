#!/bin/bash
# Script to replace hardcoded font sizes with semantic Tailwind classes
# This makes font sizes easily manageable from tailwind.config.cjs

echo "Replacing hardcoded font sizes with semantic classes..."

# Replace in all .tsx files
find src -name "*.tsx" -type f -exec sed -i \
  -e 's/text-\[9px\]/text-tiny/g' \
  -e 's/text-\[10px\]/text-xs/g' \
  -e 's/text-\[11px\]/text-sm/g' \
  -e 's/text-\[12px\]/text-md/g' \
  -e 's/text-\[13px\]/text-lg/g' \
  -e 's/text-\[14px\]/text-base/g' \
  -e 's/text-\[15px\]/text-base/g' \
  -e 's/text-\[16px\]/text-base/g' \
  -e 's/text-\[17px\]/text-lg/g' \
  -e 's/text-\[18px\]/text-lg/g' \
  -e 's/text-\[19px\]/text-xl/g' \
  -e 's/text-\[20px\]/text-xl/g' \
  -e 's/text-\[21px\]/text-xl/g' \
  -e 's/text-\[22px\]/text-xl/g' \
  -e 's/text-\[23px\]/text-xl/g' \
  -e 's/text-\[24px\]/text-xl/g' \
  -e 's/text-\[25px\]/text-2xl/g' \
  -e 's/text-\[26px\]/text-2xl/g' \
  -e 's/text-\[27px\]/text-2xl/g' \
  -e 's/text-\[28px\]/text-2xl/g' \
  -e 's/text-\[29px\]/text-2xl/g' \
  -e 's/text-\[30px\]/text-2xl/g' \
  {} \;

echo "Font size replacement complete!"
echo ""
echo "Replacement mapping:"
echo "  text-[9px]  → text-tiny"
echo "  text-[10px] → text-xs"
echo "  text-[11px] → text-sm"
echo "  text-[12px] → text-md"
echo "  text-[13px] → text-lg"
echo "  text-[14-16px] → text-base"
echo "  text-[17-18px] → text-lg"
echo "  text-[19-24px] → text-xl"
echo "  text-[25-30px] → text-2xl"
echo ""
echo "You can now manage all font sizes from tailwind.config.cjs"

