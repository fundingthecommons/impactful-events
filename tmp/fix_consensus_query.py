import re

# Read the file
with open('/Users/james/code/ftc-platform/src/server/api/routers/application.ts', 'r') as f:
    content = f.read()

# Define the pattern for the consensus applications user select
old_consensus_pattern = r'user: \{\s*select: \{\s*id: true,\s*name: true,\s*email: true,\s*\},\s*\},'

new_consensus_replacement = '''user: {
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
updated_content = re.sub(old_consensus_pattern, new_consensus_replacement, content, flags=re.MULTILINE | re.DOTALL)

# Write back to file
with open('/Users/james/code/ftc-platform/src/server/api/routers/application.ts', 'w') as f:
    f.write(updated_content)

print("Updated getConsensusApplications user select")
