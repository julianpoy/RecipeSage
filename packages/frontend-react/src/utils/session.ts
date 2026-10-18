const getToken = (): string | null => localStorage.getItem("token");

export const session = {
  getToken,

  isLoggedIn(): boolean {
    return !!getToken();
  },

  getTokenQuery(): string {
    const token = getToken();
    if (token) return `?token=${token}`;
    return `?false=false`;
  },
};
