"use client";
import { Label } from "@/components/ui/label";

interface Props {
  uid: string;
  displayName: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}

export function MemberCheckbox({
  uid,
  displayName,
  checked,
  disabled,
  onChange,
}: Props) {
  return (
    <div className="flex items-center space-x-2">
      <input
        type="checkbox"
        id={uid}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <Label htmlFor={uid}>{displayName}</Label>
    </div>
  );
}
