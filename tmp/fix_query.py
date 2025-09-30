import re

# Read the file
with open('/Users/james/code/ftc-platform/src/server/api/routers/application.ts', 'r') as f:
    content = f.read()

# Define the replacement pattern for the user include section
old_pattern = r'user: \{\s*include: \{\s*profile: true,\s*\},\s*\},'

new_replacement = '''user: {
            select: {
              id: true,
              name: true,
              email: true,
              adminNotes: true,
              adminLabels: true,
              adminUpdatedAt: true,
              profile: true,
            },
          },'''

# Replace the pattern
updated_content = re.sub(old_pattern, new_replacement, content, flags=re.MULTILINE | re.DOTALL)

# Write back to file
with open('/Users/james/code/ftc-platform/src/server/api/routers/application.ts', 'w') as f:
    f.write(updated_content)

print("Updated user include section")
