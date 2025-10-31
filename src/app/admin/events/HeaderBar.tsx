import { Group, Paper } from "@mantine/core";
import Image from "next/image";
import { auth } from "~/server/auth";
import { UserDropdownMenu } from "~/app/_components/UserDropdownMenu";
import AdminNavigation from "./AdminNavigation";
import UserNavigation from "~/app/_components/UserNavigation";

export default async function HeaderBar() {
    const session = await auth();
  return (
    <div>
      <Paper withBorder radius={0} p="md" style={{ paddingLeft: 32, paddingRight: 32, boxShadow: '0 1px 4px 0 rgba(0,0,0,0.03)' }}>
        <Group justify="space-between" align="center">
          <Group align="center" gap={8}>
            <Image src="/images/ftc-logo.avif" alt="FtC" width={100} height={100} />
          </Group>
          
          <Group gap={16}>
            {session?.user && <UserDropdownMenu session={session} />}
          </Group>
        </Group>
      </Paper>
      
      {/* Navigation - Show appropriate menu based on user role */}
      {session?.user && (
        <Paper withBorder radius={0} px="lg" style={{ borderTop: 0, boxShadow: '0 1px 4px 0 rgba(0,0,0,0.03)' }}>
          {(session.user.role === "admin" || session.user.role === "staff") ? (
            <AdminNavigation />
          ) : (
            <UserNavigation />
          )}
        </Paper>
      )}
    </div>
  );
} 