"use client";

import { Button, type ButtonProps } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import Link from "next/link";

interface AddProjectButtonProps extends Omit<ButtonProps, 'component' | 'onClick'> {
  /** The text to display on the button */
  children: React.ReactNode;
  /** When provided, button links to profile edit page with event context */
  eventId?: string;
  /** When provided, button triggers this callback (for modal opening, etc.) */
  onClick?: () => void;
  /** Icon size */
  iconSize?: number;
}

export function AddProjectButton({ 
  children, 
  eventId, 
  onClick, 
  iconSize = 16,
  variant = "light",
  leftSection,
  ...props 
}: AddProjectButtonProps) {
  const buttonContent = {
    leftSection: leftSection ?? <IconPlus size={iconSize} />,
    variant,
    ...props,
    children,
  };

  // If eventId is provided, render as Link to profile edit
  if (eventId && !onClick) {
    return (
      <Button
        component={Link}
        href={`/profile/edit?from-event=${eventId}`}
        {...buttonContent}
      />
    );
  }

  // Otherwise, render as regular button with onClick
  return (
    <Button
      onClick={onClick}
      {...buttonContent}
    />
  );
}