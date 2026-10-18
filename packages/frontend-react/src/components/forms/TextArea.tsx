import {
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const TextArea = ({
  label,
  helperText,
  errorText,
  invalid = false,
  rows = 4,
  autoGrow = false,
  value,
  onValueChange,
  autoCapitalize = "off",
  autoCorrect = "off",
  dir = "auto",
  className,
  style,
  children,
  ref,
  ...textareaProps
}: Omit<ComponentProps<"textarea">, "value" | "onChange" | "rows"> & {
  label?: ReactNode;
  helperText?: ReactNode;
  errorText?: ReactNode;
  invalid?: boolean;
  rows?: number;
  autoGrow?: boolean;
  value: string;
  onValueChange: (value: string) => void;
  children?: ReactNode;
}) => {
  const inputId = useId();
  const innerRef = useRef<HTMLTextAreaElement | null>(null);

  const setRefs = useCallback(
    (element: HTMLTextAreaElement | null) => {
      innerRef.current = element;
      if (typeof ref === "function") {
        ref(element);
      } else if (ref) {
        ref.current = element;
      }
    },
    [ref],
  );

  useLayoutEffect(() => {
    const element = innerRef.current;
    if (!autoGrow || !element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, [autoGrow, value]);

  return (
    <Field data-invalid={invalid || undefined}>
      {label && <FieldLabel htmlFor={inputId}>{label}</FieldLabel>}
      {children}
      <Textarea
        ref={setRefs}
        id={inputId}
        aria-invalid={invalid || undefined}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        dir={dir}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        className={cn(
          "[field-sizing:fixed] text-base leading-normal md:text-base",
          autoGrow ? "resize-none overflow-hidden" : "resize-y",
          className,
        )}
        style={{
          minHeight: `calc(1.5em * ${rows} + 20px)`,
          ...style,
        }}
        {...textareaProps}
      />
      {invalid && errorText ? (
        <FieldError>{errorText}</FieldError>
      ) : (
        helperText && <FieldDescription>{helperText}</FieldDescription>
      )}
    </Field>
  );
};
