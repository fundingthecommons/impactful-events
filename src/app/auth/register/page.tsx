"use client";

import { Button, Container, Paper, PasswordInput, Stack, Text, TextInput, Title, Alert } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconX } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface RegisterResponse {
  error?: string;
  message?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role?: string;
  };
}

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm<RegisterForm>({
    initialValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    validate: {
      name: (value) => (value.trim().length < 1 ? "Name is required" : null),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Invalid email"),
      password: (value) => {
        if (value.length < 8) return "Password must be at least 8 characters long";
        if (!/[A-Z]/.test(value)) return "Password must contain at least one uppercase letter";
        if (!/[a-z]/.test(value)) return "Password must contain at least one lowercase letter";
        if (!/\d/.test(value)) return "Password must contain at least one number";
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]/.test(value)) return "Password must contain at least one special character";
        return null;
      },
      confirmPassword: (value, values) => 
        value !== values.password ? "Passwords do not match" : null,
    },
  });

  const handleSubmit = async (values: RegisterForm) => {
    console.log("Registration form submitted with:", { ...values, password: "***", confirmPassword: "***" });
    setLoading(true);
    setError(null);

    try {
      console.log("Sending registration request to /api/auth/register");
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          password: values.password,
        }),
      });

      console.log("Registration response status:", response.status);
      
      let data: RegisterResponse;
      try {
        data = await response.json() as RegisterResponse;
        console.log("Registration response data:", data);
      } catch (jsonError) {
        console.error("Failed to parse JSON response:", jsonError);
        throw new Error("Invalid response from server");
      }

      if (!response.ok) {
        console.error("Registration failed with error:", data.error);
        throw new Error(data.error ?? "Registration failed");
      }

      console.log("Registration successful, user created:", data.user);
      notifications.show({
        title: "Success!",
        message: "Account created successfully. You can now sign in.",
        color: "green",
        icon: <IconCheck size={16} />,
      });

      // Wait a bit before redirecting to ensure the notification is visible
      setTimeout(() => {
        router.push("/signin");
      }, 1500);
    } catch (error) {
      console.error("Registration error:", error);
      const errorMessage = error instanceof Error ? error.message : "Registration failed";
      setError(errorMessage);
      notifications.show({
        title: "Registration Failed",
        message: errorMessage,
        color: "red",
        icon: <IconX size={16} />,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center" mb="md">
        Create Account
      </Title>
      <Text c="dimmed" size="sm" ta="center" mb="xl">
        Already have an account?{" "}
        <Link href="/signin" style={{ color: "var(--mantine-color-blue-6)" }}>
          Sign in
        </Link>
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        {error && (
          <Alert variant="light" color="red" mb="lg">
            {error}
          </Alert>
        )}
        
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label="Name"
              placeholder="Your name"
              required
              {...form.getInputProps("name")}
            />

            <TextInput
              label="Email"
              placeholder="your@email.com"
              required
              {...form.getInputProps("email")}
            />

            <PasswordInput
              label="Password"
              placeholder="Your password"
              required
              {...form.getInputProps("password")}
            />

            <PasswordInput
              label="Confirm Password"
              placeholder="Confirm your password"
              required
              {...form.getInputProps("confirmPassword")}
            />

            <Button type="submit" fullWidth mt="xl" loading={loading}>
              Create Account
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}