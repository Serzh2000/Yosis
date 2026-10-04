/** Validation failures use the same type in the browser and HTTP service. */
export class RequestError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
