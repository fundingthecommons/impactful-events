"use client";

import { useState } from "react";
import {
  Modal,
  Stack,
  Text,
  TextInput,
  Button,
  Alert,
  Stepper,
  Group,
  Paper,
  PasswordInput,
  Loader,
  Center,
  List,
  ThemeIcon,
} from "@mantine/core";
import {
  IconShieldCheck,
  IconAlertCircle,
  IconCheck,
  IconPhone,
  IconMessageCircle,
  IconLock,
  IconInfoCircle,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";

interface TelegramSetupModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type SetupStep = "welcome" | "phone" | "code" | "password" | "success";

export default function TelegramSetupModal({
  opened,
  onClose,
  onSuccess,
}: TelegramSetupModalProps) {
  const [currentStep, setCurrentStep] = useState<SetupStep>("welcome");
  const [sessionId, setSessionId] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [password, setPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [error, setError] = useState("");

  // tRPC mutations
  const startAuth = api.telegramAuth.startAuth.useMutation();
  const sendPhoneCode = api.telegramAuth.sendPhoneCode.useMutation();
  const verifyAndStore = api.telegramAuth.verifyAndStore.useMutation();

  const reset = () => {
    setCurrentStep("welcome");
    setSessionId("");
    setPhoneNumber("");
    setVerificationCode("");
    setPassword("");
    setNeedsPassword(false);
    setError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleStartAuth = async () => {
    setError("");
    try {
      const result = await startAuth.mutateAsync();
      setSessionId(result.sessionId);
      setCurrentStep("phone");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start authentication");
    }
  };

  const handleSendCode = async () => {
    if (!phoneNumber.trim()) {
      setError("Please enter your phone number");
      return;
    }

    setError("");
    try {
      await sendPhoneCode.mutateAsync({
        sessionId,
        phoneNumber: phoneNumber.trim(),
      });
      setCurrentStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send verification code");
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      setError("Please enter the verification code");
      return;
    }

    setError("");
    try {
      await verifyAndStore.mutateAsync({
        sessionId,
        phoneNumber: phoneNumber.trim(),
        phoneCode: verificationCode.trim(),
        password: needsPassword ? password : undefined,
      });
      setCurrentStep("success");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Verification failed";
      
      if (errorMessage.includes("Two-factor authentication password required")) {
        setNeedsPassword(true);
        setCurrentStep("password");
      } else {
        setError(errorMessage);
      }
    }
  };

  const handlePasswordSubmit = async () => {
    if (!password.trim()) {
      setError("Please enter your two-factor authentication password");
      return;
    }

    setError("");
    try {
      await verifyAndStore.mutateAsync({
        sessionId,
        phoneNumber: phoneNumber.trim(),
        phoneCode: verificationCode.trim(),
        password: password.trim(),
      });
      setCurrentStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password verification failed");
    }
  };

  const handleSuccess = () => {
    reset();
    onSuccess();
    onClose();
  };

  const getStepperStep = () => {
    switch (currentStep) {
      case "welcome": return 0;
      case "phone": return 1;
      case "code": case "password": return 2;
      case "success": return 3;
      default: return 0;
    }
  };

  const isLoading = startAuth.isPending || sendPhoneCode.isPending || verifyAndStore.isPending;

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Set up Telegram Authentication"
      size="lg"
      centered
    >
      <Stack gap="md">
        <Stepper active={getStepperStep()} size="sm">
          <Stepper.Step icon={<IconInfoCircle size={16} />} label="Welcome" />
          <Stepper.Step icon={<IconPhone size={16} />} label="Phone" />
          <Stepper.Step icon={<IconMessageCircle size={16} />} label="Verify" />
          <Stepper.Step icon={<IconCheck size={16} />} label="Complete" />
        </Stepper>

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
            {error}
          </Alert>
        )}

        {currentStep === "welcome" && (
          <Stack gap="md">
            <Paper p="md" withBorder>
              <Stack gap="sm">
                <Group>
                  <ThemeIcon color="blue" variant="light">
                    <IconShieldCheck size={20} />
                  </ThemeIcon>
                  <Text fw={500}>Secure Authentication Setup</Text>
                </Group>
                <Text size="sm" c="dimmed">
                  We&apos;ll help you securely connect your Telegram account to import your contacts.
                  Your credentials will be encrypted and stored safely.
                </Text>
              </Stack>
            </Paper>

            <Text fw={500} size="sm">What happens during setup:</Text>
            <List spacing="xs" size="sm">
              <List.Item>We&apos;ll ask for your phone number</List.Item>
              <List.Item>Telegram will send you a verification code</List.Item>
              <List.Item>If you have 2FA enabled, we&apos;ll ask for your password</List.Item>
              <List.Item>Your session will be encrypted and stored securely</List.Item>
            </List>

            <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
              <Text fw={500} size="sm">Privacy & Security</Text>
              <Text size="xs" mt={4}>
                Your Telegram credentials are encrypted with your user ID and stored securely. 
                Sessions automatically expire after 30 days and can be revoked at any time.
              </Text>
            </Alert>

            <Button
              onClick={handleStartAuth}
              loading={isLoading}
              disabled={isLoading}
              leftSection={<IconShieldCheck size={16} />}
            >
              Start Setup
            </Button>
          </Stack>
        )}

        {currentStep === "phone" && (
          <Stack gap="md">
            <Text fw={500}>Enter your phone number</Text>
            <Text size="sm" c="dimmed">
              Enter the phone number associated with your Telegram account. 
              Include the country code (e.g., +1 for US, +44 for UK).
            </Text>
            
            <TextInput
              label="Phone Number"
              placeholder="+1 234 567 8900"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              leftSection={<IconPhone size={16} />}
              disabled={isLoading}
            />

            <Group justify="space-between">
              <Button variant="subtle" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                onClick={handleSendCode}
                loading={isLoading}
                disabled={isLoading || !phoneNumber.trim()}
              >
                Send Code
              </Button>
            </Group>
          </Stack>
        )}

        {currentStep === "code" && (
          <Stack gap="md">
            <Text fw={500}>Enter verification code</Text>
            <Text size="sm" c="dimmed">
              We&apos;ve sent a verification code to {phoneNumber}.
              Enter the code you received via SMS or in your Telegram app.
            </Text>
            
            <TextInput
              label="Verification Code"
              placeholder="12345"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              leftSection={<IconMessageCircle size={16} />}
              disabled={isLoading}
            />

            <Group justify="space-between">
              <Button variant="subtle" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                onClick={handleVerifyCode}
                loading={isLoading}
                disabled={isLoading || !verificationCode.trim()}
              >
                Verify Code
              </Button>
            </Group>
          </Stack>
        )}

        {currentStep === "password" && (
          <Stack gap="md">
            <Text fw={500}>Two-factor authentication</Text>
            <Text size="sm" c="dimmed">
              Your account has two-factor authentication enabled. 
              Please enter your Telegram password to complete the setup.
            </Text>
            
            <PasswordInput
              label="Telegram Password"
              placeholder="Enter your 2FA password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftSection={<IconLock size={16} />}
              disabled={isLoading}
            />

            <Group justify="space-between">
              <Button variant="subtle" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                onClick={handlePasswordSubmit}
                loading={isLoading}
                disabled={isLoading || !password.trim()}
              >
                Complete Setup
              </Button>
            </Group>
          </Stack>
        )}

        {currentStep === "success" && (
          <Stack gap="md">
            <Center>
              <ThemeIcon color="green" size="xl" variant="light">
                <IconCheck size={24} />
              </ThemeIcon>
            </Center>
            
            <Text ta="center" fw={500} size="lg">
              Setup Complete!
            </Text>
            
            <Text ta="center" size="sm" c="dimmed">
              Your Telegram authentication has been set up successfully. 
              You can now import contacts from your Telegram account.
            </Text>

            <Alert icon={<IconShieldCheck size={16} />} color="green" variant="light">
              <Text fw={500} size="sm">Your data is secure</Text>
              <Text size="xs" mt={4}>
                Your session credentials are encrypted and will automatically expire in 30 days. 
                You can revoke access at any time from your account settings.
              </Text>
            </Alert>

            <Button onClick={handleSuccess} leftSection={<IconCheck size={16} />}>
              Done
            </Button>
          </Stack>
        )}

        {isLoading && currentStep !== "success" && (
          <Center>
            <Group gap="xs">
              <Loader size="sm" />
              <Text size="sm" c="dimmed">
                {currentStep === "phone" ? "Sending verification code..." : 
                 currentStep === "code" || currentStep === "password" ? "Verifying..." : 
                 "Setting up..."}
              </Text>
            </Group>
          </Center>
        )}
      </Stack>
    </Modal>
  );
}