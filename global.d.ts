declare global {
  type Optional<T> = T | undefined;
  type Nullable<T> = T | null;
  type Maybe<T> = Optional<Nullable<T>>;
}

export {};
