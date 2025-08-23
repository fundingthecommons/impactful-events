"use client";

import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Metadata } from "next";
import {
  Container,
  Stack,
  Text,
  Group,
  ThemeIcon,
  Card,
  SimpleGrid,
  Paper,
} from "@mantine/core";
import {
  IconHeart,
  IconUsersGroup,
  IconBuildingBank,
  IconBrain,
  IconCalendarEvent,
} from "@tabler/icons-react";
import AuthForm from "~/app/_components/AuthForm";

function FeatureHighlight({ 
  icon: Icon, 
  title, 
  description, 
  color 
}: {
  icon: React.FC<{ size?: number }>;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <Card withBorder padding="lg" radius="md" style={{ height: "100%" }}>
      <Group gap="md" align="flex-start">
        <ThemeIcon size={40} radius="xl" color={color} variant="light">
          <Icon size={20} />
        </ThemeIcon>
        <Stack gap="xs" style={{ flex: 1 }}>
          <Text fw={600} size="sm">{title}</Text>
          <Text size="xs" c="dimmed" style={{ lineHeight: 1.4 }}>
            {description}
          </Text>
        </Stack>
      </Group>
    </Card>
  );
}

export default function SignInPage() {
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const router = useRouter();

  const callbackUrl = searchParams?.get("callbackUrl") ?? "/";

  // Redirect if already authenticated
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      router.push(callbackUrl);
    }
  }, [status, session, callbackUrl, router]);

  // Show loading while checking session
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Don't render if already authenticated (will redirect)
  if (status === "authenticated") {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <Container size="xl" py="xl" style={{ position: 'relative', zIndex: 1 }}>
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-screen">
          {/* Left Side - Branding & Features */}
          <div className="order-2 lg:order-1">
            <Stack gap="xl">
              {/* Hero Section */}
              <Stack gap="lg">
                <div>
                  <Text 
                    size="3rem" 
                    fw={800} 
                    style={{ 
                      background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      lineHeight: 1.2
                    }}
                  >
                    Funding the Commons
                  </Text>
                  <Text size="xl" c="dimmed" mt="xs">
                    Connect with the ecosystem building public goods
                  </Text>
                </div>
                
                <Text size="lg" c="dimmed" style={{ lineHeight: 1.6 }}>
                  Join builders, funders, mentors, and organizers working together to advance 
                  decentralized impact and sustainable funding mechanisms.
                </Text>
              </Stack>

              {/* Feature Highlights */}
              <Stack gap="md">
                <Text size="lg" fw={600} c="dark">
                  What You&apos;ll Get Access To
                </Text>
                
                <SimpleGrid cols={1} spacing="sm">
                  <FeatureHighlight
                    icon={IconCalendarEvent}
                    title="Exclusive Events"
                    description="Apply to residencies, hackathons, and conferences that advance the ecosystem"
                    color="blue"
                  />
                  <FeatureHighlight
                    icon={IconUsersGroup}
                    title="Community Network"
                    description="Connect with builders, funders, and impact creators worldwide"
                    color="purple"
                  />
                  <FeatureHighlight
                    icon={IconBrain}
                    title="Expert Mentorship"
                    description="Learn from industry leaders and get guidance on your projects"
                    color="teal"
                  />
                  <FeatureHighlight
                    icon={IconBuildingBank}
                    title="Funding Opportunities"
                    description="Access grants, sponsorships, and investment for public goods projects"
                    color="indigo"
                  />
                </SimpleGrid>
              </Stack>

              {/* Trust Indicators */}
              <Paper 
                p="lg" 
                radius="lg" 
                style={{ 
                  background: 'linear-gradient(135deg, var(--mantine-color-blue-0) 0%, var(--mantine-color-purple-0) 100%)',
                  border: '1px solid var(--mantine-color-blue-2)'
                }}
              >
                <Group justify="center" gap="xs" mb="md">
                  <ThemeIcon size="lg" radius="xl" color="blue" variant="light">
                    <IconHeart size={20} />
                  </ThemeIcon>
                  <Text fw={600} c="blue.7">
                    Trusted by the Community
                  </Text>
                </Group>
                <Text size="sm" ta="center" c="dimmed">
                  Over 1,000+ builders and organizations have joined our platform to advance 
                  public goods funding and decentralized impact.
                </Text>
              </Paper>
            </Stack>
          </div>

          {/* Right Side - Auth Form */}
          <div className="order-1 lg:order-2 flex justify-center">
            <div className="w-full max-w-md">
              <AuthForm 
                callbackUrl={callbackUrl}
                className="shadow-xl border-2 border-white/50 backdrop-blur-sm"
              />
            </div>
          </div>
        </div>
      </Container>

      {/* Add blob animation styles */}
      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </main>
  );
}