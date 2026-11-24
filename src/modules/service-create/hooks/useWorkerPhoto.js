import { useEffect, useState } from 'react';
import { request } from '../../core/lib/httpClient';
import { getProfilePhotoUrl } from '../../core/lib/imageService';
import { getToken } from '../../core/lib/session';

const LIST_TTL_MS = 10 * 60 * 1000;
const userIdByProfile = new Map();
const photoCache = new Map();
let listLoadedAt = 0;
let listPending = null;

export function warmWorkerIds() {
  const fresh = Date.now() - listLoadedAt < LIST_TTL_MS;
  if (fresh || listPending) {
    return;
  }
  listPending = request('/workers')
    .then((workers) => {
      (Array.isArray(workers) ? workers : []).forEach((worker) => {
        if (worker?.id && worker?.userId) {
          userIdByProfile.set(worker.id, worker.userId);
        }
      });
      listLoadedAt = Date.now();
    })
    .catch(() => {})
    .finally(() => {
      listPending = null;
    });
}

async function resolveUserId(profileId) {
  const known = userIdByProfile.get(profileId);
  if (known) {
    return known;
  }
  const profile = await request(`/workers/${profileId}`);
  if (profile?.userId) {
    userIdByProfile.set(profileId, profile.userId);
  }
  return profile?.userId ?? null;
}

function loadPhoto(profileId) {
  if (!photoCache.has(profileId)) {
    const pending = resolveUserId(profileId)
      .then((userId) => (userId ? getProfilePhotoUrl(userId, getToken()) : null))
      .then((url) => url || null)
      .catch(() => {
        photoCache.delete(profileId);
        return null;
      });
    photoCache.set(profileId, pending);
  }
  return photoCache.get(profileId);
}

export function useWorkerPhoto(worker) {
  const [fetchedUrl, setFetchedUrl] = useState(null);

  useEffect(() => {
    if (worker.photoUrl || !worker.id) {
      return undefined;
    }
    let active = true;
    loadPhoto(worker.id).then((url) => {
      if (active) {
        setFetchedUrl(url);
      }
    });
    return () => {
      active = false;
    };
  }, [worker.id, worker.photoUrl]);

  return worker.photoUrl || fetchedUrl;
}