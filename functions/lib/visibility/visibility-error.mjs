export class VisibilityError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "VisibilityError";
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}
