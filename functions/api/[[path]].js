import {
  DEFAULT_FAMILY_MEMBERS,
  DEFAULT_BOOK_SETTINGS,
  SAMPLE_PHOTOS,
} from '../../server/seedData.js';

function getSeasonFromMonth(month) {
  if ([3, 4, 5].includes(month)) return 'spring';
  if ([6, 7, 8].includes(month)) return 'summer';
  if ([9, 10, 11].includes(month)) return 'autumn';
  return 'winter';
}

// Edge memory state + optional Cloudflare KV binding (ARCHIVE_KV)
let edgeDb = null;

function createInitialDb() {
  return {
    members: JSON.parse(JSON.stringify(DEFAULT_FAMILY_MEMBERS)),
    bookSettings: JSON.parse(JSON.stringify(DEFAULT_BOOK_SETTINGS)),
    photos: JSON.parse(JSON.stringify(SAMPLE_PHOTOS)),
    updatedAt: new Date().toISOString(),
  };
}

async function getDb(env) {
  if (env?.ARCHIVE_KV) {
    try {
      const saved = await env.ARCHIVE_KV.get('main_archive', 'json');
      if (saved && Array.isArray(saved.photos)) return saved;
    } catch {
      // fallback to edgeDb
    }
  }
  if (!edgeDb) {
    edgeDb = createInitialDb();
  }
  return edgeDb;
}

async function saveDb(env, db) {
  db.photos.sort((a, b) => new Date(a.takenAt) - new Date(b.takenAt));
  db.updatedAt = new Date().toISOString();
  edgeDb = db;
  if (env?.ARCHIVE_KV) {
    try {
      await env.ARCHIVE_KV.put('main_archive', JSON.stringify(db));
    } catch {
      // ignore KV write error
    }
  }
  return db;
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const pathParts = (params.path || []).map(String);
  const route = pathParts.join('/');
  const method = request.method.toUpperCase();

  const jsonHeaders = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: jsonHeaders });
  }

  try {
    const db = await getDb(env);

    // GET /api/archive
    if (method === 'GET' && route === 'archive') {
      db.photos.sort((a, b) => new Date(a.takenAt) - new Date(b.takenAt));
      return new Response(
        JSON.stringify({
          ...db,
          cloudStatus: {
            connected: true,
            mode: 'cloudflare-edge',
            updatedAt: db.updatedAt,
          },
        }),
        { status: 200, headers: jsonHeaders }
      );
    }

    // POST /api/photos
    if (method === 'POST' && route === 'photos') {
      const contentType = request.headers.get('content-type') || '';
      const createdPhotos = [];

      if (contentType.includes('application/json')) {
        const body = await request.json();
        const items = body.items || [];
        for (const meta of items) {
          const takenAtIso = meta.takenAt
            ? new Date(meta.takenAt).toISOString()
            : new Date().toISOString();
          const d = new Date(takenAtIso);
          const month = d.getMonth() + 1;
          const dateStr = takenAtIso.slice(0, 10);
          const width = Number(meta.width) || 1200;
          const height = Number(meta.height) || 900;
          const aspectRatio = Number((width / height).toFixed(2));
          let orientation = 'landscape';
          if (aspectRatio < 0.92) orientation = 'portrait';
          else if (aspectRatio <= 1.08) orientation = 'square';

          const newPhoto = {
            id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            url: meta.dataUrl || meta.url,
            takenAt: takenAtIso,
            dateStr,
            month,
            season: getSeasonFromMonth(month),
            memberId: meta.memberId || db.members[0]?.id || 'member-first',
            location: meta.location || '',
            caption: meta.caption || '',
            aspectRatio,
            orientation,
            width,
            height,
            exif: meta.exif || { camera: 'Smart Device', source: 'Auto Date Extraction' },
            isFavorite: Boolean(meta.isFavorite),
            comments: [],
          };
          db.photos.push(newPhoto);
          createdPhotos.push(newPhoto);
        }
      } else {
        const formData = await request.formData();
        const files = formData.getAll('files');
        const metadataRaw = formData.get('metadata');
        const metadataList = metadataRaw ? JSON.parse(metadataRaw) : [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const meta = metadataList[i] || {};
          const buf = await file.arrayBuffer();
          const bytes = new Uint8Array(buf);
          let binary = '';
          const chunkSize = 0x8000;
          for (let j = 0; j < bytes.length; j += chunkSize) {
            binary += String.fromCharCode(...bytes.subarray(j, j + chunkSize));
          }
          const base64 = btoa(binary);
          const mime = file.type || 'image/jpeg';
          const photoUrl = `data:${mime};base64,${base64}`;

          const takenAtIso = meta.takenAt
            ? new Date(meta.takenAt).toISOString()
            : new Date().toISOString();
          const d = new Date(takenAtIso);
          const month = d.getMonth() + 1;
          const dateStr = takenAtIso.slice(0, 10);
          const width = Number(meta.width) || 1200;
          const height = Number(meta.height) || 900;
          const aspectRatio = Number((width / height).toFixed(2));
          let orientation = 'landscape';
          if (aspectRatio < 0.92) orientation = 'portrait';
          else if (aspectRatio <= 1.08) orientation = 'square';

          const newPhoto = {
            id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            url: photoUrl,
            takenAt: takenAtIso,
            dateStr,
            month,
            season: getSeasonFromMonth(month),
            memberId: meta.memberId || db.members[0]?.id || 'member-first',
            location: meta.location || '',
            caption: meta.caption || '',
            aspectRatio,
            orientation,
            width,
            height,
            exif: meta.exif || { camera: 'Smart Device', source: 'Auto Date Extraction' },
            isFavorite: Boolean(meta.isFavorite),
            comments: [],
          };
          db.photos.push(newPhoto);
          createdPhotos.push(newPhoto);
        }
      }

      await saveDb(env, db);
      return new Response(
        JSON.stringify({ photos: createdPhotos, allPhotos: db.photos }),
        { status: 201, headers: jsonHeaders }
      );
    }

    // PATCH /api/photos/:id
    if (method === 'PATCH' && pathParts[0] === 'photos' && pathParts.length === 2) {
      const photoId = pathParts[1];
      const target = db.photos.find((p) => p.id === photoId);
      if (!target) {
        return new Response(JSON.stringify({ error: 'Photo not found' }), {
          status: 404,
          headers: jsonHeaders,
        });
      }
      const updates = await request.json();
      if (updates.takenAt || updates.dateStr) {
        const rawDate = updates.takenAt || `${updates.dateStr}T12:00:00.000Z`;
        const parsed = new Date(rawDate);
        if (!isNaN(parsed.getTime())) {
          target.takenAt = parsed.toISOString();
          target.dateStr = target.takenAt.slice(0, 10);
          target.month = parsed.getMonth() + 1;
          target.season = getSeasonFromMonth(target.month);
        }
      }
      if (typeof updates.caption === 'string') target.caption = updates.caption;
      if (typeof updates.location === 'string') target.location = updates.location;
      if (typeof updates.memberId === 'string') target.memberId = updates.memberId;
      if (typeof updates.isFavorite === 'boolean') target.isFavorite = updates.isFavorite;

      await saveDb(env, db);
      return new Response(JSON.stringify({ photo: target, allPhotos: db.photos }), {
        status: 200,
        headers: jsonHeaders,
      });
    }

    // DELETE /api/photos/:id
    if (method === 'DELETE' && pathParts[0] === 'photos' && pathParts.length === 2) {
      const photoId = pathParts[1];
      db.photos = db.photos.filter((p) => p.id !== photoId);
      await saveDb(env, db);
      return new Response(JSON.stringify({ allPhotos: db.photos }), {
        status: 200,
        headers: jsonHeaders,
      });
    }

    // POST /api/photos/:id/comments
    if (
      method === 'POST' &&
      pathParts[0] === 'photos' &&
      pathParts[2] === 'comments' &&
      pathParts.length === 3
    ) {
      const photo = db.photos.find((p) => p.id === pathParts[1]);
      if (!photo) {
        return new Response(JSON.stringify({ error: 'Photo not found' }), {
          status: 404,
          headers: jsonHeaders,
        });
      }
      const { memberId, text } = await request.json();
      const comment = {
        id: `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        memberId: memberId || db.members[0]?.id,
        text: (text || '').trim(),
        createdAt: new Date().toISOString(),
      };
      if (!Array.isArray(photo.comments)) photo.comments = [];
      photo.comments.push(comment);
      await saveDb(env, db);
      return new Response(JSON.stringify({ photo, allPhotos: db.photos }), {
        status: 201,
        headers: jsonHeaders,
      });
    }

    // DELETE /api/photos/:id/comments/:commentId
    if (
      method === 'DELETE' &&
      pathParts[0] === 'photos' &&
      pathParts[2] === 'comments' &&
      pathParts.length === 4
    ) {
      const photo = db.photos.find((p) => p.id === pathParts[1]);
      if (photo) {
        photo.comments = (photo.comments || []).filter((c) => c.id !== pathParts[3]);
        await saveDb(env, db);
      }
      return new Response(JSON.stringify({ photo, allPhotos: db.photos }), {
        status: 200,
        headers: jsonHeaders,
      });
    }

    // POST /api/members
    if (method === 'POST' && route === 'members') {
      const { id, name, role, city, color, badgeBg, avatar } = await request.json();
      if (id) {
        const existing = db.members.find((m) => m.id === id);
        if (existing) {
          if (typeof name === 'string' && name.trim()) {
            existing.name = name.trim();
            existing.avatar = avatar || name.trim().slice(0, 1);
          }
          if (typeof city === 'string') existing.city = city.trim();
          if (typeof role === 'string') {
            existing.role = role.trim();
          } else if (typeof city === 'string') {
            existing.role = city.trim();
          }
          if (color) existing.color = color;
          if (badgeBg) existing.badgeBg = badgeBg;
          await saveDb(env, db);
          return new Response(
            JSON.stringify({ member: existing, members: db.members }),
            { status: 200, headers: jsonHeaders }
          );
        }
      }

      const palette = [
        { color: '#8C5A3C', badgeBg: '#F5EBE6' },
        { color: '#3B5249', badgeBg: '#E6EFEA' },
        { color: '#2C3E50', badgeBg: '#E8EEF5' },
        { color: '#6C5B7B', badgeBg: '#EFEBF5' },
        { color: '#B85D19', badgeBg: '#F9EFE6' },
      ];
      const pick = palette[db.members.length % palette.length];
      const newMember = {
        id: `member-${Date.now()}`,
        name: (name || '가족').trim(),
        role: (role || city || '가족 구성원').trim(),
        city: (city || '서울').trim(),
        color: pick.color,
        badgeBg: pick.badgeBg,
        avatar: (name || '가').trim().slice(0, 1),
      };
      db.members.push(newMember);
      await saveDb(env, db);
      return new Response(JSON.stringify({ member: newMember, members: db.members }), {
        status: 201,
        headers: jsonHeaders,
      });
    }

    // PATCH /api/members/:id
    if (method === 'PATCH' && pathParts[0] === 'members' && pathParts.length === 2) {
      const existing = db.members.find((m) => m.id === pathParts[1]);
      if (!existing) {
        return new Response(JSON.stringify({ error: 'Member not found' }), {
          status: 404,
          headers: jsonHeaders,
        });
      }
      const { name, city, role } = await request.json();
      if (typeof name === 'string' && name.trim()) {
        existing.name = name.trim();
        existing.avatar = name.trim().slice(0, 1);
      }
      if (typeof city === 'string') existing.city = city.trim();
      if (typeof role === 'string') {
        existing.role = role.trim();
      } else if (typeof city === 'string' && city.trim()) {
        existing.role = city.trim();
      }
      await saveDb(env, db);
      return new Response(JSON.stringify({ member: existing, members: db.members }), {
        status: 200,
        headers: jsonHeaders,
      });
    }

    // DELETE /api/members/:id
    if (method === 'DELETE' && pathParts[0] === 'members' && pathParts.length === 2) {
      if (db.members.length > 1) {
        db.members = db.members.filter((m) => m.id !== pathParts[1]);
        await saveDb(env, db);
      }
      return new Response(JSON.stringify({ members: db.members }), {
        status: 200,
        headers: jsonHeaders,
      });
    }

    // PATCH /api/book-settings
    if (method === 'PATCH' && route === 'book-settings') {
      const patch = await request.json();
      db.bookSettings = { ...db.bookSettings, ...patch };
      await saveDb(env, db);
      return new Response(JSON.stringify({ bookSettings: db.bookSettings }), {
        status: 200,
        headers: jsonHeaders,
      });
    }

    // POST /api/reset
    if (method === 'POST' && route === 'reset') {
      const { mode } = await request.json();
      if (mode === 'empty') {
        db.photos = [];
      } else {
        const fresh = createInitialDb();
        db.members = fresh.members;
        db.bookSettings = fresh.bookSettings;
        db.photos = fresh.photos;
      }
      await saveDb(env, db);
      return new Response(JSON.stringify(db), { status: 200, headers: jsonHeaders });
    }

    // POST /api/cloud-config
    if (method === 'POST' && route === 'cloud-config') {
      const { supabaseUrl } = await request.json();
      return new Response(
        JSON.stringify({
          cloudStatus: {
            connected: true,
            mode: supabaseUrl ? 'supabase' : 'cloudflare-edge',
            supabaseUrl: supabaseUrl || null,
          },
        }),
        { status: 200, headers: jsonHeaders }
      );
    }

    return new Response(JSON.stringify({ error: 'Not found', route }), {
      status: 404,
      headers: jsonHeaders,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
}
