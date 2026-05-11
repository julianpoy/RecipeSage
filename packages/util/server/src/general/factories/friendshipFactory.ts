export function friendshipFactory(userIdA: string, userIdB: string) {
  return [
    { userId: userIdA, friendId: userIdB },
    { userId: userIdB, friendId: userIdA },
  ];
}
