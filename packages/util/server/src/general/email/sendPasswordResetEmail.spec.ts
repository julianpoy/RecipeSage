import { describe, it, expect, vi, beforeEach } from "vitest";

const sendEmailMock = vi.fn();

vi.mock("./util/sendEmail", () => ({
  sendEmail: (...args: unknown[]) => sendEmailMock(...args),
}));

describe("sendPasswordResetEmail", () => {
  beforeEach(() => {
    sendEmailMock.mockReset();
    sendEmailMock.mockResolvedValue(undefined);
  });

  it("composes the expected en-us subject, html, and plain output", async () => {
    const { sendPasswordResetEmail } = await import("./sendPasswordResetEmail");

    const resetLink = "https://example.invalid/reset/abc";
    await sendPasswordResetEmail({
      toAddresses: ["nobody@example.invalid"],
      ccAddresses: [],
      resetLink,
      language: "en-us",
    });

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const args = sendEmailMock.mock.calls[0][0];

    expect(args.subject).toBe("RecipeSage Password Reset");

    expect(args.html).toBe(
      `Hello,<br /><br />` +
        `Someone recently requested a password reset link for the RecipeSage account associated with this email address.<br /><br />` +
        `If you did not request a password reset, please disregard this email.<br /><br />` +
        `<a href="${resetLink}">Click here to reset your password</a><br />` +
        `or paste this url into your browser: ${resetLink}<br />` +
        `<br /><br />Best,` +
        `<br />Julian Poyourow` +
        `<br />Developer of RecipeSage - <a href="https://recipesage.com">https://recipesage.com</a>` +
        `<br /><br /><b>Social:</b><br />` +
        `Discord: <a href="https://discord.gg/yCfzBft">https://discord.gg/yCfzBft</a><br />` +
        `Facebook: <a href="https://www.facebook.com/recipesageofficial/">https://www.facebook.com/recipesageofficial/</a><br />` +
        `Instagram: <a href="https://www.instagram.com/recipesageofficial/">https://www.instagram.com/recipesageofficial/</a><br />`,
    );

    expect(args.plain).toBe(
      `Hello,\n\n` +
        `Someone recently requested a password reset link for the RecipeSage account associated with this email address.\n` +
        `If you did not request a password reset, please disregard this email.\n\n` +
        `To reset your password, paste this url into your browser: ${resetLink}\n\n` +
        `Best,\nJulian Poyourow\nDeveloper of RecipeSage - https://recipesage.com\n\n` +
        `Social:\nhttps://discord.gg/yCfzBft\nhttps://www.facebook.com/recipesageofficial/\nhttps://www.instagram.com/recipesageofficial/`,
    );
  });
});
