import { confirm, isCancel, text } from '@clack/prompts';

export type TextPrompt = {
  message: string;
  initialValue?: string;
  placeholder?: string;
  validate?: (value: string | undefined) => string | Error | undefined;
};

export type ConfirmPrompt = { message: string; initialValue: boolean };

export type PromptAdapter = {
  text(options: TextPrompt): Promise<string | symbol>;
  confirm(options: ConfirmPrompt): Promise<boolean | symbol>;
  isCancel(value: unknown): boolean;
};

export const clackPrompts: PromptAdapter = {
  text: (options) =>
    text({
      message: options.message,
      ...(options.initialValue === undefined ? {} : { initialValue: options.initialValue }),
      ...(options.placeholder === undefined ? {} : { placeholder: options.placeholder }),
      ...(options.validate === undefined ? {} : { validate: options.validate }),
    }),
  confirm,
  isCancel,
};
