export interface ClipResult {
  title?: string;
  description?: string;
  yield?: string;
  activeTime?: string;
  totalTime?: string;
  source?: string;
  url?: string;
  notes?: string;
  ingredients?: string;
  instructions?: string;
  imageURL?: string;
  nutritionInfo?: string;
}

export class ClipError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ClipError";
  }
}

export const clipFromHtml = async (
  apiBase: string,
  token: string,
  html: string,
): Promise<ClipResult> => {
  const response = await fetch(`${apiBase}/clip`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ html }),
  });

  if (!response.ok) {
    throw new ClipError(
      `Clip request failed with status ${response.status}`,
      response.status,
    );
  }

  return response.json();
};
