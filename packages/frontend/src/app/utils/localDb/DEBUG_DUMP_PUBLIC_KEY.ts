import dedent from "ts-dedent";
import type { RSAPublicKey } from "@recipesage/util/shared";

export const DEBUG_DUMP_PUBLIC_KEY: RSAPublicKey = {
  id: 2,
  pem: dedent`
-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA4sB1fJS8ue8Tf+7rHxFU
RoOKB9o90ERKi+SmF++Q6ZbFnILNtaVtwOeJ8x3g1RB+PgT9xW2KO+rR605qP9wQ
kHx8sq4hXZOnupW7ZqsqGA30SQ1UkbmAf9qkz5umIR5/OZBOh80CFsa7HWpgavrt
xyAjWEYTYJ721q4fkZFillXOQgevVDeiaUZ6EOHCpnLKFTgcq2U6PEoZX+8rgr67
fqNlJOO29V8rbqy+MvR+Qidjf4XPn9UMLHJul+ePAOeo+mwQA54SpR5kneM9HNpp
hGftKCuqogsnSyvZu/5KpNJ9yE7remTgkSDyMsE564uqsMmk443hRwpylwNAAKRA
fNh4WkPAtJUnqq1vWS1H6aP6udVh6RyuEa5nRlPpcvQ9ZnAyFIjYcF0Rdzw+fNrT
LENmavr3SBCgVAnb+pyZRBwce+O813/yawLzHk4m9Ngd4PaJ3jp4s2oOd4z4nB5h
nqux2x0mQpP1cBgdm8xzSZFhLQPgoAbOlC3QgvZrmtv1BDQ7oIU5DY53w6JQ/00F
1YDR+Mr+IrUvaB7l8nlePaEaZyFvbXrP4mQ1EByfRfurWOIaUulqVq3dSayZl4dW
knEHozjea9QUx4t7ecawcI3TsogtPsA5NxJfbR9+BDZrg4TegkAAftO+U95tcd7n
aHuhjsnjzpzblZzp+YBqP68CAwEAAQ==
-----END PUBLIC KEY-----
`,
};
