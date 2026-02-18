import prisma from '../lib/prisma';
import { LeaderboardQuery } from '../types';

export const getLeaderboard = async (query: LeaderboardQuery) => {
  const { type, period } = query;

  let dateFilter = {};
  if (period === 'daily') {
    dateFilter = { timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } };
  } else if (period === 'weekly') {
    dateFilter = { timestamp: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } };
  }

  // We want top 50 unique public users based on their best score/wpm/time
  // Prisma doesn't support complex group by with joins easily in one call for this
  // We'll use a raw query or fetch and process if it's small, but raw is better for performance.

  const orderByField = type === 'wpm' ? 'wpm' : type === 'score' ? 'score' : 'duration';

  // Find top results first
  const topResults = await prisma.lessonResult.findMany({
    where: {
      ...dateFilter,
      user: { isPublic: true }
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          avatarUrl: true
        }
      }
    },
    orderBy: {
      [orderByField]: 'desc'
    },
    take: 500, // Fetch more to deduplicate users
  });

  // Deduplicate by user to get top 50 users
  const seenUsers = new Set();
  const leaderboard: any[] = [];

  for (const res of topResults) {
    if (!seenUsers.has(res.userId)) {
      seenUsers.add(res.userId);
      leaderboard.push({
        userId: res.userId,
        username: res.user.username,
        avatarUrl: res.user.avatarUrl,
        value: res[orderByField as keyof typeof res],
        timestamp: res.timestamp
      });
    }
    if (leaderboard.length >= 50) break;
  }

  return leaderboard;
};
