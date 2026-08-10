// A small red dot marking a mandatory field's label — paired with an
// sr-only "(required)" so the meaning survives for screen readers, since
// the dot alone conveys nothing to them.
export function RequiredDot() {
  return (
    <>
      <span aria-hidden className="ml-1 inline-block size-1.5 rounded-full bg-destructive align-middle" />
      <span className="sr-only"> (required)</span>
    </>
  );
}
