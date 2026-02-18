import prisma from '../lib/prisma';
import { UserSync } from '../types';

export const syncUser = async (userId: string, data: UserSync) => {
  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { id: userId },
      update: {
        email: data.email,
        username: data.username,
        avatarUrl: data.avatarUrl,
      },
      create: {
        id: userId,
        email: data.email,
        username: data.username,
        avatarUrl: data.avatarUrl,
      },
    });

    // Create default settings if they don't exist
    await tx.settings.upsert({
      where: { userId: userId },
      update: {},
      create: {
        userId: userId,
        keyboardPos: { x: 0, y: 0 },
        typingAreaPos: { x: 0, y: 0 },
        topSectionPos: { x: 0, y: 0 },
      },
    });

    return user;
  });
};

export const getUserProfile = async (targetUserId: string, requesterId?: string) => {
  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    include: {
      settings: true,
      keyStats: true,
    },
  });

  if (!user) return null;

  // Privacy check: If not owner and not public, return 403 (handled by caller)
  if (!user.isPublic && user.id !== requesterId) {
    return 'FORBIDDEN';
  }

  // Fetch lesson history summary or full depending on requirement
  const lessonHistory = await prisma.lessonResult.findMany({
    where: { userId: targetUserId },
    orderBy: { timestamp: 'desc' },
    take: 100, // Limit history for profile
  });

  return { ...user, lessonHistory };
};
