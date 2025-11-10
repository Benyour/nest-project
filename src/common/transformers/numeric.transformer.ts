export const numericTransformer = {
  to: (value: number | null) => value,
  from: (value: string | null): number | null =>
    value === null || value === undefined ? null : Number(value),
};
