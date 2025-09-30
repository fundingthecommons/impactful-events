import re

# Read the file
with open('/Users/james/code/ftc-platform/src/app/admin/events/[eventId]/applications/AdminApplicationsClient.tsx', 'r') as f:
    content = f.read()

# Define the old user type pattern and replacement
old_user_pattern = r'user: \{\s*id: string;\s*name: string \| null;\s*email: string \| null;\s*profile\?:'

new_user_replacement = '''user: {
    id: string;
    name: string | null;
    email: string | null;
    adminNotes: string | null;
    adminLabels: string[];
    adminUpdatedAt: Date | null;
    profile?:'''

# Replace the pattern
updated_content = re.sub(old_user_pattern, new_user_replacement, content, flags=re.MULTILINE | re.DOTALL)

# Write back to file
with open('/Users/james/code/ftc-platform/src/app/admin/events/[eventId]/applications/AdminApplicationsClient.tsx', 'w') as f:
    f.write(updated_content)

print("Updated ApplicationWithUser type")
