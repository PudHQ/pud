type Subject = (...args: never[]) => unknown;

/** The property receives the subject's parameters in order, followed by its return value. */
export function proof<F extends Subject>(
  subject: F,
  name: string,
  property: (...args: [...Parameters<F>, result: ReturnType<F>]) => boolean,
) {
  return { subject, name, property };
}
