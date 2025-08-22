"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import {
  Paper,
  Tabs,
  TextInput,
  PasswordInput,
  Button,
  Stack,
  Group,
  Divider,
  Text,
  Alert,
  Checkbox,
  Progress,
  Anchor,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconBrandDiscord, IconBrandGoogle, IconCheck, IconAlertCircle } from "@tabler/icons-react";
import { api } from "~/trpc/react";

interface AuthFormProps {
  callbackUrl?: string;
  className?: string;
}

interface SignInFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface SignUpFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

function getPasswordStrength(password: string): number {
  let strength = 0;
  if (password.length >= 8) strength += 25;
  if (/[a-z]/.test(password)) strength += 25;
  if (/[A-Z]/.test(password)) strength += 25;
  if (/\d/.test(password)) strength += 25;
  if (/[^a-zA-Z0-9]/.test(password)) strength += 25;
  return Math.min(strength, 100);
}

function getPasswordStrengthColor(strength: number): string {
  if (strength < 50) return "red";
  if (strength < 75) return "yellow";
  return "green";
}

export default function AuthForm({ callbackUrl, className }: AuthFormProps) {
  const [activeTab, setActiveTab] = useState<string | null>("signin");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const createUserMutation = api.user.create.useMutation();

  const signInForm = useForm<SignInFormData>({
    initialValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Invalid email"),
      password: (value) => (value.length > 0 ? null : "Password is required"),
    },
  });

  const signUpForm = useForm<SignUpFormData>({
    initialValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      agreeToTerms: false,
    },
    validate: {
      name: (value) => (value.length < 2 ? "Name must have at least 2 letters" : null),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Invalid email"),
      password: (value) => {
        if (value.length < 8) return "Password must be at least 8 characters";
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
          return "Password must contain uppercase, lowercase, and number";
        }
        return null;
      },
      confirmPassword: (value, values) =>
        value !== values.password ? "Passwords do not match" : null,
      agreeToTerms: (value) => (value ? null : "You must agree to the terms"),
    },
  });

  const handleSignIn = async (values: SignInFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
        callbackUrl: callbackUrl ?? "/dashboard",
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else if (result?.url) {
        setSuccess("Sign in successful! Redirecting...");
        window.location.href = result.url;
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (values: SignUpFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      await createUserMutation.mutateAsync({
        name: values.name,
        email: values.email,
        password: values.password,
      });

      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
        callbackUrl: callbackUrl ?? "/dashboard",
      });

      if (result?.error) {
        setError("Account created but sign in failed. Please try signing in manually.");
      } else if (result?.url) {
        setSuccess("Account created successfully! Redirecting...");
        window.location.href = result.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  };

  const handleProviderSignIn = async (provider: "discord" | "google") => {
    setIsLoading(true);
    setError(null);

    try {
      await signIn(provider, {
        callbackUrl: callbackUrl ?? "/dashboard",
      });
    } catch {
      setError("Failed to sign in with provider");
      setIsLoading(false);
    }
  };

  return (
    <Paper className={className} radius="md" p="xl" withBorder>
      <Stack gap="lg">
        {/* Header */}
        <div>
          <Text size="xl" fw={600} ta="center">
            {activeTab === "signin" ? "Welcome Back" : "Create Account"}
          </Text>
          <Text size="sm" c="dimmed" ta="center" mt="xs">
            {activeTab === "signin" 
              ? "Sign in to continue your application" 
              : "Sign up to apply for the residency"
            }
          </Text>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <Alert color="red" icon={<IconAlertCircle size={16} />}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert color="green" icon={<IconCheck size={16} />}>
            {success}
          </Alert>
        )}

        {/* Social Sign In */}
        <Stack gap="sm">
          <Button
            variant="outline"
            leftSection={<IconBrandDiscord size={18} />}
            onClick={() => handleProviderSignIn("discord")}
            loading={isLoading}
            fullWidth
          >
            Continue with Discord
          </Button>
          <Button
            variant="outline"
            leftSection={<IconBrandGoogle size={18} />}
            onClick={() => handleProviderSignIn("google")}
            loading={isLoading}
            fullWidth
          >
            Continue with Google
          </Button>
        </Stack>

        <Divider label="Or continue with email" labelPosition="center" />

        {/* Auth Tabs */}
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List grow>
            <Tabs.Tab value="signin">Sign In</Tabs.Tab>
            <Tabs.Tab value="signup">Sign Up</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="signin" mt="md">
            <form onSubmit={signInForm.onSubmit(handleSignIn)}>
              <Stack gap="md">
                <TextInput
                  label="Email"
                  placeholder="your@email.com"
                  required
                  {...signInForm.getInputProps("email")}
                />
                <PasswordInput
                  label="Password"
                  placeholder="Your password"
                  required
                  {...signInForm.getInputProps("password")}
                />
                <Group justify="space-between">
                  <Checkbox
                    label="Remember me"
                    {...signInForm.getInputProps("rememberMe", { type: "checkbox" })}
                  />
                  <Anchor size="sm" href="/auth/forgot-password">
                    Forgot password?
                  </Anchor>
                </Group>
                <Button type="submit" loading={isLoading} fullWidth>
                  Sign In
                </Button>
              </Stack>
            </form>
          </Tabs.Panel>

          <Tabs.Panel value="signup" mt="md">
            <form onSubmit={signUpForm.onSubmit(handleSignUp)}>
              <Stack gap="md">
                <TextInput
                  label="Full Name"
                  placeholder="John Doe"
                  required
                  {...signUpForm.getInputProps("name")}
                />
                <TextInput
                  label="Email"
                  placeholder="your@email.com"
                  required
                  {...signUpForm.getInputProps("email")}
                />
                <div>
                  <PasswordInput
                    label="Password"
                    placeholder="Create a password"
                    required
                    {...signUpForm.getInputProps("password")}
                  />
                  {signUpForm.values.password && (
                    <div>
                      <Text size="xs" c="dimmed" mt="xs">
                        Password strength
                      </Text>
                      <Progress
                        value={getPasswordStrength(signUpForm.values.password)}
                        color={getPasswordStrengthColor(getPasswordStrength(signUpForm.values.password))}
                        size="sm"
                        mt="xs"
                      />
                    </div>
                  )}
                </div>
                <PasswordInput
                  label="Confirm Password"
                  placeholder="Confirm your password"
                  required
                  {...signUpForm.getInputProps("confirmPassword")}
                />
                <Checkbox
                  label={
                    <span>
                      I agree to the{" "}
                      <Anchor href="/terms" target="_blank">
                        Terms of Service
                      </Anchor>{" "}
                      and{" "}
                      <Anchor href="/privacy" target="_blank">
                        Privacy Policy
                      </Anchor>
                    </span>
                  }
                  required
                  {...signUpForm.getInputProps("agreeToTerms", { type: "checkbox" })}
                />
                <Button type="submit" loading={isLoading} fullWidth>
                  Create Account
                </Button>
              </Stack>
            </form>
          </Tabs.Panel>
        </Tabs>

        {/* Footer */}
        <Text size="xs" c="dimmed" ta="center">
          {activeTab === "signin" ? (
            <>
              Don&apos;t have an account?{" "}
              <Anchor onClick={() => setActiveTab("signup")}>Sign up</Anchor>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Anchor onClick={() => setActiveTab("signin")}>Sign in</Anchor>
            </>
          )}
        </Text>
      </Stack>
    </Paper>
  );
}