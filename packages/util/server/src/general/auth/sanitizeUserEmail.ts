export const sanitizeUserEmail = (email: string) => {
  const sanitizedEmail = (email || "").trim().toLowerCase();

  if (!email.length) {
    throw new Error("Email must have length");
  }

  if (!email.indexOf("@")) {
    throw new Error("Email must contain @");
  }

  return sanitizedEmail;
};
