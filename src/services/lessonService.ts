import prisma from '../lib/prisma';
import { LessonSubmission } from '../types';

export const submitLesson = async (userId: string, data: LessonSubmission) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Create LessonResult and Replay
    const lessonResult = await tx.lessonResult.create({
      data: {
        userId,
        wpm: data.wpm,
        accuracy: data.accuracy,
        score: data.score,
        duration: data.duration,
        lessonText: data.lessonText,
        errorKeys: data.errorKeys,
        correctKeys: data.correctKeys,
        replay: {
          create: {
            keystrokes: data.replay.keystrokes as any,
          },
        },
      },
    });

    // 2. Retrieve wpmTarget from User Settings
    const settings = await tx.settings.findUnique({
      where: { userId },
    });
    const wpmTarget = settings?.wpmTarget || 40;

    // 3. Calculate per-key stats from replay
    const keySpeeds: Record<string, number[]> = {};
    const keystrokes = data.replay.keystrokes;

    for (let i = 1; i < keystrokes.length; i++) {
      const current = keystrokes[i];
      const prev = keystrokes[i-1];
      if (current.correct && current.timestamp > prev.timestamp) {
        const diffMs = current.timestamp - prev.timestamp;
        const wpm = 12000 / diffMs;
        if (wpm > 0 && wpm < 500) {
          if (!keySpeeds[current.key]) keySpeeds[current.key] = [];
          keySpeeds[current.key].push(wpm);
        }
      }
    }

    // 4. Update KeyStats
    // We use deduplicated keys to avoid multiple DB calls per key,
    // but the user said "total number of keystrokes" for hits/errors.

    // Count hits/errors per key in this lesson
    const currentHits: Record<string, number> = {};
    const currentErrors: Record<string, number> = {};

    // Using the correctKeys and errorKeys arrays provided in body
    data.correctKeys.forEach(k => {
      currentHits[k] = (currentHits[k] || 0) + 1;
    });
    data.errorKeys.forEach(k => {
      currentErrors[k] = (currentErrors[k] || 0) + 1;
    });

    const allKeys = Array.from(new Set([...Object.keys(currentHits), ...Object.keys(currentErrors)]));

    for (const key of allKeys) {
      const hits = currentHits[key] || 0;
      const errors = currentErrors[key] || 0;
      const avgSpeedInLesson = keySpeeds[key] && keySpeeds[key].length > 0
        ? keySpeeds[key].reduce((a, b) => a + b, 0) / keySpeeds[key].length
        : 0;

      const existing = await tx.keyStats.findUnique({
        where: { userId_key: { userId, key } },
      });

      const newHits = (existing?.hits || 0) + hits;
      const newErrors = (existing?.errors || 0) + errors;
      const newTopSpeed = Math.max(existing?.topSpeed || 0, avgSpeedInLesson);

      let newSpeedHistory = [...(existing?.speedHistory || [])];
      if (avgSpeedInLesson > 0) {
        newSpeedHistory.push(avgSpeedInLesson);
        newSpeedHistory = newSpeedHistory.slice(-20);
      }

      // Recalculate Confidence
      const totalAttempts = newHits + newErrors;
      const accuracy = totalAttempts > 0 ? newHits / totalAttempts : 0;
      const speedFactor = Math.min(1, avgSpeedInLesson / wpmTarget);
      const stabilityFactor = Math.min(1, totalAttempts / 20);
      const confidence = Math.min(1, accuracy * speedFactor * stabilityFactor);

      await tx.keyStats.upsert({
        where: { userId_key: { userId, key } },
        update: {
          hits: newHits,
          errors: newErrors,
          lastSpeed: avgSpeedInLesson > 0 ? avgSpeedInLesson : undefined,
          topSpeed: newTopSpeed,
          speedHistory: newSpeedHistory,
          confidence,
        },
        create: {
          userId,
          key,
          hits: newHits,
          errors: newErrors,
          lastSpeed: avgSpeedInLesson,
          topSpeed: newTopSpeed,
          speedHistory: avgSpeedInLesson > 0 ? [avgSpeedInLesson] : [],
          confidence,
        },
      });
    }

    return lessonResult;
  });
};
