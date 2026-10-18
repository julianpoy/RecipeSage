import { useId, type ComponentProps, type ReactNode } from "react";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

export const TextField = ({
  label,
  helperText,
  errorText,
  invalid = false,
  end,
  value,
  onValueChange,
  autoCapitalize = "off",
  autoCorrect = "off",
  dir = "auto",
  ...inputProps
}: Omit<ComponentProps<"input">, "value" | "onChange"> & {
  label?: ReactNode;
  helperText?: ReactNode;
  errorText?: ReactNode;
  invalid?: boolean;
  end?: ReactNode;
  value: string;
  onValueChange: (value: string) => void;
}) => {
  const inputId = useId();

  return (
    <Field data-invalid={invalid || undefined}>
      {label && <FieldLabel htmlFor={inputId}>{label}</FieldLabel>}
      <InputGroup data-disabled={inputProps.disabled || undefined}>
        <InputGroupInput
          id={inputId}
          aria-invalid={invalid || undefined}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          dir={dir}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          {...inputProps}
        />
        {end && <InputGroupAddon align="inline-end">{end}</InputGroupAddon>}
      </InputGroup>
      {invalid && errorText ? (
        <FieldError>{errorText}</FieldError>
      ) : (
        helperText && <FieldDescription>{helperText}</FieldDescription>
      )}
    </Field>
  );
};
