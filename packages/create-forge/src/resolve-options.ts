import {
  defaultDescription,
  defaultUrl,
  derivePackageName,
  humanizePackageName,
  type GeneratorOptions,
  type ProvidedOptions,
} from './options';
import type { PromptAdapter, TextPrompt } from './prompts';
import {
  InputError,
  validateDestination,
  validatePackageName,
  validatePlainText,
  validateRepository,
  validateUrl,
} from './validation';

export class CancellationError extends Error {}

type ResolutionContext = { interactive: boolean; prompts: PromptAdapter };

const textValidation = (validator: (value: string) => string) => (value: string | undefined) => {
  try {
    validator(value ?? '');
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : 'Invalid value';
  }
};

const promptText = async (prompts: PromptAdapter, options: TextPrompt) => {
  const value = await prompts.text(options);
  if (prompts.isCancel(value)) throw new CancellationError('Project creation cancelled.');
  return String(value);
};

const promptConfirm = async (prompts: PromptAdapter, message: string) => {
  const value = await prompts.confirm({ message, initialValue: true });
  if (prompts.isCancel(value)) throw new CancellationError('Project creation cancelled.');
  return Boolean(value);
};

const hasEveryExplicitValue = (options: ProvidedOptions) =>
  options.destination !== undefined &&
  options.packageName !== undefined &&
  options.siteName !== undefined &&
  options.description !== undefined &&
  options.author !== undefined &&
  options.url !== undefined &&
  options.repository !== undefined &&
  options.install !== undefined &&
  options.git !== undefined;

export const resolveOptions = async (
  provided: ProvidedOptions,
  { interactive, prompts }: ResolutionContext,
): Promise<GeneratorOptions> => {
  const useDefaults = provided.yes;
  if (!interactive && !useDefaults && !hasEveryExplicitValue(provided)) {
    throw new InputError(
      'Non-interactive use requires --yes or explicit values for every generator option. Run create-forge --help for details.',
    );
  }

  const destination = validateDestination(
    provided.destination ??
      (useDefaults
        ? '.'
        : await promptText(prompts, {
            message: 'Where should we create your project?',
            placeholder: '.',
            initialValue: '.',
            validate: textValidation(validateDestination),
          })),
  );
  const derivedPackageName = derivePackageName(destination);
  const packageName = validatePackageName(
    provided.packageName ??
      (useDefaults
        ? derivedPackageName
        : await promptText(prompts, {
            message: 'What should the npm package be named?',
            initialValue: derivedPackageName,
            validate: textValidation(validatePackageName),
          })),
  );
  const defaultSiteName = humanizePackageName(packageName);
  const siteName = validatePlainText(
    '--site-name',
    provided.siteName ??
      (useDefaults
        ? defaultSiteName
        : await promptText(prompts, {
            message: 'What should the site be called?',
            initialValue: defaultSiteName,
            validate: textValidation((value) => validatePlainText('--site-name', value, true)),
          })),
    true,
  );
  const description = validatePlainText(
    '--description',
    provided.description ??
      (useDefaults
        ? defaultDescription
        : await promptText(prompts, {
            message: 'How would you describe the site?',
            initialValue: defaultDescription,
            validate: textValidation((value) => validatePlainText('--description', value)),
          })),
  );
  const author = validatePlainText(
    '--author',
    provided.author ??
      (useDefaults
        ? ''
        : await promptText(prompts, {
            message: 'Who is the site author?',
            placeholder: 'Optional',
            validate: textValidation((value) => validatePlainText('--author', value)),
          })),
  );
  const url = validateUrl(
    provided.url ??
      (useDefaults
        ? defaultUrl
        : await promptText(prompts, {
            message: 'What is the canonical site URL?',
            initialValue: defaultUrl,
            validate: textValidation(validateUrl),
          })),
  );
  const repository = validateRepository(
    provided.repository ??
      (useDefaults
        ? ''
        : await promptText(prompts, {
            message: 'What is the GitHub repository?',
            placeholder: 'owner/repository (optional)',
            validate: textValidation(validateRepository),
          })),
  );
  const install = provided.install ?? (useDefaults ? true : await promptConfirm(prompts, 'Install dependencies?'));
  const git = provided.git ?? (useDefaults ? true : await promptConfirm(prompts, 'Initialize a Git repository?'));

  return { destination, packageName, siteName, description, author, url, repository, install, git };
};
