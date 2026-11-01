const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const { TikTokLiveConnection, WebcastEvent, ControlEvent } = require('tiktok-live-connector');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'merit-state.json');

const SIM_DEVOTEES = [
  { user: 'Ngọc Anh Nguyễn', uniqueId: 'ngocanh.98', wish: 'Con thành tâm cầu cho bố mẹ luôn mạnh khỏe, bình an' },
  { user: 'Trần Minh Quân', uniqueId: 'minhquan_bds', wish: 'Cầu tháng mới công việc thuận buồm xuôi gió, tài lộc hanh thông' },
  { user: 'Diệu Thảo Tâm An', uniqueId: 'tam_an_99', wish: 'Lạy Chúa, xin ban bình an, nguyện cầu thế giới hòa bình chúng sinh an lạc' },
  { user: 'Lê Hoàng Nam', uniqueId: 'hoangnam.dev', wish: 'Cầu thi cử đỗ đạt điểm cao, sự nghiệp rộng mở' },
  { user: 'Phạm Thanh Hà', uniqueId: 'thanhha.lotus', wish: 'Cầu gia đạo êm ấm, con cái ngoan ngoãn học giỏi' },
  { user: 'Vũ Đức Thịnh', uniqueId: 'ducthinh88', wish: 'Con xin gieo một quẻ cầu tài lộc đầu năm' }
];
const SIMULATED_UNIQUE_IDS = new Set(SIM_DEVOTEES.map((devotee) => devotee.uniqueId));

// ============================================================================
// 1. BỘ 18 QUẺ LINH XĂM NHÀ NGUYỆN BÌNH AN (FORTUNE STICKS DECK)
// ============================================================================
const FORTUNE_DECK = [
  {
    "number": 1,
    "rank": "Suy niệm",
    "title": "Bình an",
    "poem": "Lạy Chúa, xin hướng dẫn chúng con sống trong tình yêu thương.",
    "meaning": "Dành một phút thinh lặng để lắng nghe và đối xử dịu dàng với người bên cạnh.",
    "ttsSummary": "Thẻ suy niệm Bình an. Dành một phút thinh lặng để lắng nghe và đối xử dịu dàng với người bên cạnh."
  },
  {
    "number": 2,
    "rank": "Suy niệm",
    "title": "Yêu thương",
    "poem": "Lạy Chúa, xin hướng dẫn chúng con sống trong tình yêu thương.",
    "meaning": "Hãy chọn một hành động tử tế nhỏ cho người đang cần được quan tâm.",
    "ttsSummary": "Thẻ suy niệm Yêu thương. Hãy chọn một hành động tử tế nhỏ cho người đang cần được quan tâm."
  },
  {
    "number": 3,
    "rank": "Suy niệm",
    "title": "Hy vọng",
    "poem": "Lạy Chúa, xin hướng dẫn chúng con sống trong tình yêu thương.",
    "meaning": "Bạn không cần đi một mình. Hãy tìm sự nâng đỡ từ gia đình và cộng đoàn.",
    "ttsSummary": "Thẻ suy niệm Hy vọng. Bạn không cần đi một mình. Hãy tìm sự nâng đỡ từ gia đình và cộng đoàn."
  },
  {
    "number": 4,
    "rank": "Suy niệm",
    "title": "Tha thứ",
    "poem": "Lạy Chúa, xin hướng dẫn chúng con sống trong tình yêu thương.",
    "meaning": "Thử bắt đầu một cuộc đối thoại chân thành với lòng tôn trọng.",
    "ttsSummary": "Thẻ suy niệm Tha thứ. Thử bắt đầu một cuộc đối thoại chân thành với lòng tôn trọng."
  },
  {
    "number": 5,
    "rank": "Suy niệm",
    "title": "Biết ơn",
    "poem": "Lạy Chúa, xin hướng dẫn chúng con sống trong tình yêu thương.",
    "meaning": "Nhớ đến những người đã giúp đỡ mình và gửi họ một lời cảm ơn.",
    "ttsSummary": "Thẻ suy niệm Biết ơn. Nhớ đến những người đã giúp đỡ mình và gửi họ một lời cảm ơn."
  },
  {
    "number": 6,
    "rank": "Suy niệm",
    "title": "Chia sẻ",
    "poem": "Lạy Chúa, xin hướng dẫn chúng con sống trong tình yêu thương.",
    "meaning": "Dành thời gian hoặc nguồn lực để giúp một người đang gặp khó khăn.",
    "ttsSummary": "Thẻ suy niệm Chia sẻ. Dành thời gian hoặc nguồn lực để giúp một người đang gặp khó khăn."
  },
  {
    "number": 7,
    "rank": "Suy niệm",
    "title": "Kiên nhẫn",
    "poem": "Lạy Chúa, xin hướng dẫn chúng con sống trong tình yêu thương.",
    "meaning": "Đón nhận điều chưa hoàn hảo và tiếp tục làm điều tốt mỗi ngày.",
    "ttsSummary": "Thẻ suy niệm Kiên nhẫn. Đón nhận điều chưa hoàn hảo và tiếp tục làm điều tốt mỗi ngày."
  },
  {
    "number": 8,
    "rank": "Suy niệm",
    "title": "Lắng nghe",
    "poem": "Lạy Chúa, xin hướng dẫn chúng con sống trong tình yêu thương.",
    "meaning": "Hôm nay hãy nghe trọn câu chuyện của một người mà không vội phán xét.",
    "ttsSummary": "Thẻ suy niệm Lắng nghe. Hôm nay hãy nghe trọn câu chuyện của một người mà không vội phán xét."
  },
  {
    "number": 9,
    "rank": "Suy niệm",
    "title": "Gia đình",
    "poem": "Lạy Chúa, xin hướng dẫn chúng con sống trong tình yêu thương.",
    "meaning": "Cầu nguyện cho gia đình và dành thời gian hỏi thăm người thân.",
    "ttsSummary": "Thẻ suy niệm Gia đình. Cầu nguyện cho gia đình và dành thời gian hỏi thăm người thân."
  },
  {
    "number": 10,
    "rank": "Suy niệm",
    "title": "Phục vụ",
    "poem": "Lạy Chúa, xin hướng dẫn chúng con sống trong tình yêu thương.",
    "meaning": "Nhìn quanh và chọn một việc phục vụ cộng đoàn trong khả năng của bạn.",
    "ttsSummary": "Thẻ suy niệm Phục vụ. Nhìn quanh và chọn một việc phục vụ cộng đoàn trong khả năng của bạn."
  },
  {
    "number": 11,
    "rank": "Suy niệm",
    "title": "Can đảm",
    "poem": "Lạy Chúa, xin hướng dẫn chúng con sống trong tình yêu thương.",
    "meaning": "Xin ơn can đảm để sửa sai và bắt đầu lại với trách nhiệm.",
    "ttsSummary": "Thẻ suy niệm Can đảm. Xin ơn can đảm để sửa sai và bắt đầu lại với trách nhiệm."
  },
  {
    "number": 12,
    "rank": "Suy niệm",
    "title": "Đồng hành",
    "poem": "Lạy Chúa, xin hướng dẫn chúng con sống trong tình yêu thương.",
    "meaning": "Hãy ở bên người đang cô đơn bằng sự hiện diện chân thành.",
    "ttsSummary": "Thẻ suy niệm Đồng hành. Hãy ở bên người đang cô đơn bằng sự hiện diện chân thành."
  }
];

// ============================================================================
// 3. TRẠNG THÁI NHÀ NGUYỆN ONLINE & BẢNG VÀNG CÔNG ĐỨC
// ============================================================================
const DEFAULT_STATE = {
  totalIncense: 108,
  totalMerit: 1080,
  woodenFishHits: 360,
  bellRings: 36,
  lanternCount: 18,
  fortuneCount: 12,
  activeIncenseSticks: 9,
  haloIntensity: 0.45,
  offerings: {
    lotus: 3,
    fruit: 2,
    lamp: 2,
    dragon: 1
  },
  devotees: {},
  recentEvents: [],
  settings: {
    ttsEnabled: true,
    ttsVoice: 'maichi',
    bgMusicEnabled: true,
    sfxEnabled: true,
    smokeDensity: 1.0,
    autoSim: false,
    autoSimIntervalMs: 9500
  },
  tiktok: {
    connected: false,
    connecting: false,
    username: 'locdo.vibes',
    roomId: null,
    viewerCount: 0,
    lastError: null
  }
};

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const saved = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      return {
        ...DEFAULT_STATE,
        ...saved,
        devotees: Object.fromEntries(
          Object.entries(saved.devotees || {}).map(([key, devotee]) => [
            key,
            {
              ...devotee,
              source: devotee.source || (SIMULATED_UNIQUE_IDS.has(devotee.uniqueId) ? 'simulated' : 'historical')
            }
          ])
        ),
        recentEvents: (saved.recentEvents || []).map((event) => ({
          ...event,
          source: event.source || (SIMULATED_UNIQUE_IDS.has(event.uniqueId) ? 'simulated' : 'historical')
        })),
        offerings: { ...DEFAULT_STATE.offerings, ...(saved.offerings || {}) },
        settings: { ...DEFAULT_STATE.settings, ...(saved.settings || {}) },
        tiktok: { ...DEFAULT_STATE.tiktok }
      };
    }
  } catch (e) {
    console.warn('[State] Không đọc được merit-state.json, dùng mặc định:', e.message);
  }
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

let state = loadState();

let saveTimer = null;
function saveState() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const toSave = {
      totalIncense: state.totalIncense,
      totalMerit: state.totalMerit,
      woodenFishHits: state.woodenFishHits,
      bellRings: state.bellRings,
      lanternCount: state.lanternCount,
      fortuneCount: state.fortuneCount,
      activeIncenseSticks: state.activeIncenseSticks,
      offerings: state.offerings,
      devotees: state.devotees,
      settings: state.settings
    };
    fs.promises.writeFile(STATE_FILE, JSON.stringify(toSave, null, 2), 'utf8').catch((e) => {
      console.error('[State] Lỗi lưu file:', e.message);
    });
  }, 1200);
}

function getLeaderboard(limit = 6) {
  return Object.values(state.devotees)
    .sort((a, b) => b.merit - a.merit)
    .slice(0, limit)
    .map((d, index) => ({
      rank: index + 1,
      name: d.name,
      uniqueId: d.uniqueId,
      avatar: d.avatar || '',
      source: d.source || 'historical',
      merit: d.merit,
      incense: d.incense || 0,
      lastWish: d.lastWish || ''
    }));
}
// Bộ lọc chặn ký tự lạ (Cuneiform 𒐫, Zalgo, Braille, ký tự spam) & từ ngữ phản cảm
const WEIRD_SPAM_RE = /[\u{12000}-\u{1254F}\uFDFD\u2800-\u28FF\u2580-\u259F]|[\u0300-\u036F]{3,}/u;
const BRACKET_EMOTE_RE = /\[[^\]]{1,24}\]/g;
const ALLOWED_VI_TEXT_RE = /[^0-9a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúýĂăĐđĨĩŨũƠơƯưẠ-ỹ\s.,!?]/g;
const ALLOWED_VI_NAME_RE = /[^0-9a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúýĂăĐđĨĩŨũƠơƯưẠ-ỹ\s._-]/g;
const VI_LETTER_RE = /[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúýĂăĐđĨĩŨũƠơƯưẠ-ỹ]/g;
const BAD_WORDS_RE = /(đá dái|địt|lồn|cặc|đm|vcl|vl|yamate|i cư|lừa đảo|lừa à|te-le gram|telegram|bố là trùm)/i;

function isBlockedSpamOrToxic(raw) {
  if (!raw) return true;
  const s = String(raw);
  if (WEIRD_SPAM_RE.test(s)) return true;
  if (BAD_WORDS_RE.test(s)) return true;
  return false;
}

function sanitizeUserName(rawName) {
  const normalized = String(rawName || '')
    .normalize('NFKC')
    .normalize('NFC')
    .replace(BRACKET_EMOTE_RE, ' ')
    .replace(ALLOWED_VI_NAME_RE, ' ')
    .replace(/(.)\1{3,}/gi, '$1$1')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 26);

  if (!normalized || BAD_WORDS_RE.test(normalized)) {
    return 'Anh Chị Em Hữu Duyên';
  }
  const letters = normalized.match(VI_LETTER_RE) || [];
  if (letters.length < 2) {
    return 'Anh Chị Em Hữu Duyên';
  }
  return normalized;
}

function sanitizeWishText(rawWish) {
  if (!rawWish) return '';
  const cleaned = String(rawWish)
    .normalize('NFKC')
    .normalize('NFC')
    .replace(BRACKET_EMOTE_RE, ' ')
    .replace(ALLOWED_VI_TEXT_RE, ' ')
    .replace(/([.,!?])\1+/g, '$1')
    .replace(/(.)\1{2,}/gi, '$1$1')
    .replace(/\s+/g, ' ')
    .replace(/^[.,!?\s-]+|[.,!?\s-]+$/g, '')
    .slice(0, 120);

  if (!cleaned || BAD_WORDS_RE.test(cleaned)) return '';
  const letters = cleaned.match(VI_LETTER_RE) || [];
  if (letters.length < 2) return '';
  return cleaned;
}

function recordDevotee(user, uniqueId, avatar, meritDelta, incenseDelta = 0, giftDelta = 0, wish = '', source = 'historical') {
  const displayName = sanitizeUserName(user || uniqueId);
  const cleanWish = sanitizeWishText(wish);
  const identity = (uniqueId || displayName).slice(0, 40);
  const key = `${source}:${identity}`;
  if (!state.devotees[key]) {
    state.devotees[key] = {
      name: displayName,
      uniqueId: uniqueId || displayName.toLowerCase().replace(/\s+/g, ''),
      avatar: avatar || '',
      source,
      merit: 0,
      incense: 0,
      gifts: 0,
      lastWish: ''
    };
  }
  const dev = state.devotees[key];
  dev.name = displayName;
  dev.source = source;
  if (avatar) dev.avatar = avatar;
  dev.merit += meritDelta;
  dev.incense += incenseDelta;
  dev.gifts += giftDelta;
  if (cleanWish) dev.lastWish = cleanWish;

  state.totalMerit += meritDelta;
  state.haloIntensity = Math.min(1.0, 0.35 + (state.totalMerit % 1000) / 1400);
  return dev;
}

function pushEventLog(evt) {
  const entry = {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    ...evt
  };
  state.recentEvents.unshift(entry);
  if (state.recentEvents.length > 35) {
    state.recentEvents.length = 35;
  }
  return entry;
}

function getPublicState() {
  return {
    totalIncense: state.totalIncense,
    totalMerit: state.totalMerit,
    woodenFishHits: state.woodenFishHits,
    bellRings: state.bellRings,
    lanternCount: state.lanternCount,
    fortuneCount: state.fortuneCount,
    activeIncenseSticks: state.activeIncenseSticks,
    haloIntensity: state.haloIntensity,
    offerings: state.offerings,
    leaderboard: getLeaderboard(24),
    recentEvents: state.recentEvents.slice(0, 15),
    settings: state.settings,
    tiktok: state.tiktok,
    tts: {
      ready: null,
      status: 'client-side',
      engine: 'Web Speech API (browser)',
      voice: 'vi-VN',
      voices: []
    }
  };
}

// ============================================================================
// 4. NGHI THỨC TƯƠNG TÁC (RITUAL HANDLERS)
// ============================================================================
const Rituals = {
  burnIncense(params = {}) {
    const user = sanitizeUserName(params.user);
    const uniqueId = params.uniqueId || '';
    const avatar = params.avatar || '';
    const count = Math.max(1, Math.min(9, Number(params.count) || 3));
    const wish = sanitizeWishText(params.wish) || 'Thành tâm thắp nến cầu nguyện, cầu bình an bình an';
    const merit = count * 5;

    state.totalIncense += count;
    state.activeIncenseSticks = Math.min(36, state.activeIncenseSticks + count);
    const source = params.source || 'manual';
    const devotee = recordDevotee(user, uniqueId, avatar, merit, count, 0, wish, source);

    const ttsText = params.readTts === false
      ? ''
      : `Lạy Chúa, xin ban bình an. Cảm tạ anh chị em ${devotee.name} đã thành tâm thắp ${count} ngọn nến. ${wish}.`;

    const event = pushEventLog({
      type: 'burnIncense',
      user: devotee.name,
      uniqueId: devotee.uniqueId,
      avatar: devotee.avatar,
      source,
      count,
      merit,
      wish,
      ttsText,
      ttsVoice: state.settings.ttsVoice || 'maichi'
    });

    saveState();
    broadcastNotification('temple.event', { event, state: getPublicState() });
    return { event, state: getPublicState() };
  },

  strikeWoodenFish(params = {}) {
    const user = sanitizeUserName(params.user);
    const uniqueId = params.uniqueId || '';
    const avatar = params.avatar || '';
    const count = Math.max(1, Math.min(50, Number(params.count) || 1));
    const merit = count;

    state.woodenFishHits += count;
    const source = params.source || 'manual';
    const devotee = recordDevotee(user, uniqueId, avatar, merit, 0, 0, '', source);

    const event = pushEventLog({
      type: 'strikeWoodenFish',
      user: devotee.name,
      uniqueId: devotee.uniqueId,
      avatar: devotee.avatar,
      source,
      count,
      merit,
      ttsText: params.ttsText || ''
    });

    saveState();
    broadcastNotification('temple.event', { event, state: getPublicState() });
    return { event, state: getPublicState() };
  },

  ringBell(params = {}) {
    const user = sanitizeUserName(params.user);
    const uniqueId = params.uniqueId || '';
    const avatar = params.avatar || '';
    const count = Math.max(1, Math.min(9, Number(params.count) || 1));
    const wish = sanitizeWishText(params.wish) || 'Xin cho cộng đoàn biết yêu thương và giúp đỡ nhau';
    const merit = count * 10;

    state.bellRings += count;
    const source = params.source || 'manual';
    const devotee = recordDevotee(user, uniqueId, avatar, merit, 0, 0, wish, source);

    const ttsText = params.readTts
      ? `Anh chị em ${devotee.name} thỉnh Chuông Nhà Thờ cầu nguyện: ${wish}.`
      : '';

    const event = pushEventLog({
      type: 'ringBell',
      user: devotee.name,
      uniqueId: devotee.uniqueId,
      avatar: devotee.avatar,
      source,
      count,
      merit,
      wish,
      ttsText,
      ttsVoice: state.settings.ttsVoice || 'maichi'
    });

    saveState();
    broadcastNotification('temple.event', { event, state: getPublicState() });
    return { event, state: getPublicState() };
  },

  sendPrayer(params = {}) {
    const user = sanitizeUserName(params.user);
    const uniqueId = params.uniqueId || '';
    const avatar = params.avatar || '';
    const wish = sanitizeWishText(params.wish) || 'Cầu cho quốc thái dân an, gia đình mạnh khỏe hạnh phúc';
    const merit = 10;

    state.lanternCount += 1;
    const source = params.source || 'manual';
    const devotee = recordDevotee(user, uniqueId, avatar, merit, 1, 0, wish, source);

    const ttsText = params.readTts === false
      ? ''
      : `Lời cầu nguyện của anh chị em ${devotee.name}: ${wish}. Lạy Chúa, xin ban bình an.`;

    const event = pushEventLog({
      type: 'sendPrayer',
      user: devotee.name,
      uniqueId: devotee.uniqueId,
      avatar: devotee.avatar,
      source,
      wish,
      merit,
      ttsText,
      ttsVoice: state.settings.ttsVoice || 'maichi'
    });

    saveState();
    broadcastNotification('temple.event', { event, state: getPublicState() });
    return { event, state: getPublicState() };
  },

  offerGift(params = {}) {
    const user = sanitizeUserName(params.user);
    const uniqueId = params.uniqueId || '';
    const avatar = params.avatar || '';
    const coins = Math.max(1, Number(params.coins) || 10);
    const giftType = ['lotus', 'fruit', 'lamp', 'dragon'].includes(params.giftType)
      ? params.giftType
      : (coins >= 100 ? 'dragon' : coins >= 20 ? 'fruit' : coins >= 5 ? 'lamp' : 'lotus');

    const giftLabels = {
      lotus: 'Bó Hoa Huệ Trắng',
      fruit: 'Bó Hoa Dâng Bàn Thờ',
      lamp: 'Nến Cầu Nguyện',
      dragon: 'Lời Cảm Ơn Cộng Đoàn'
    };
    const giftName = params.giftName || giftLabels[giftType];
    const multiplier = coins >= 100 ? 50 : coins >= 10 ? 30 : 20;
    const merit = Math.max(20, coins * multiplier);

    state.offerings[giftType] = (state.offerings[giftType] || 0) + 1;
    state.totalIncense += 3;
    state.activeIncenseSticks = Math.min(36, state.activeIncenseSticks + 3);

    const wish = params.wish || `Dâng cúng ${giftName} lên Thiên Chúa`;
    const source = params.source || 'manual';
    const devotee = recordDevotee(user, uniqueId, avatar, merit, 3, 1, wish, source);

    const ttsText = params.readTts === false
      ? ''
      : `Cảm ơn đồng hành! Cảm tạ anh chị em ${devotee.name} đã phát tâm dâng cúng ${giftName}, đồng hành cùng buổi phát trực tiếp. Xin Chúa ban bình an cho mọi người.`;

    const event = pushEventLog({
      type: giftType === 'dragon' ? 'grandCeremony' : 'offerGift',
      user: devotee.name,
      uniqueId: devotee.uniqueId,
      avatar: devotee.avatar,
      source,
      giftType,
      giftName,
      coins,
      merit,
      wish,
      ttsText,
      ttsVoice: state.settings.ttsVoice || 'maichi'
    });

    saveState();
    broadcastNotification('temple.event', { event, state: getPublicState() });
    return { event, state: getPublicState() };
  },

  drawFortune(params = {}) {
    const user = sanitizeUserName(params.user);
    const uniqueId = params.uniqueId || '';
    const avatar = params.avatar || '';
    const topic = sanitizeWishText(params.topic) || 'Sống yêu thương và phục vụ';
    const fortune = FORTUNE_DECK[Math.floor(Math.random() * FORTUNE_DECK.length)];
    const merit = 10;

    state.fortuneCount += 1;
    const source = params.source || 'manual';
    const devotee = recordDevotee(user, uniqueId, avatar, merit, 0, 0, `Suy niệm: Thẻ số ${fortune.number} (${fortune.rank})`, source);

    const ttsText = params.readTts === false
      ? ''
      : `Anh chị em ${devotee.name} vừa nhận được ${fortune.ttsSummary}`;

    const event = pushEventLog({
      type: 'drawFortune',
      user: devotee.name,
      uniqueId: devotee.uniqueId,
      avatar: devotee.avatar,
      source,
      topic,
      fortune,
      merit,
      ttsText,
      ttsVoice: state.settings.ttsVoice || 'maichi'
    });

    saveState();
    broadcastNotification('temple.event', { event, state: getPublicState() });
    return { event, state: getPublicState() };
  },

  grandCeremony(params = {}) {
    return this.offerGift({
      ...params,
      giftType: 'dragon',
      coins: Math.max(100, Number(params.coins) || 199),
      giftName: params.giftName || 'Đại Lễ Hào Quang Vạn Trượng'
    });
  },

  updateSettings(params = {}) {
    state.settings = {
      ...state.settings,
      ...params
    };
    if (typeof params.autoSim === 'boolean') {
      configureAutoSim(params.autoSim);
    }
    saveState();
    broadcastNotification('temple.state', getPublicState());
    return getPublicState();
  },

  resetMerit() {
    state.totalIncense = 9;
    state.totalMerit = 0;
    state.woodenFishHits = 0;
    state.bellRings = 0;
    state.lanternCount = 0;
    state.fortuneCount = 0;
    state.activeIncenseSticks = 3;
    state.offerings = { lotus: 1, fruit: 1, lamp: 1, dragon: 0 };
    state.devotees = {};
    state.recentEvents = [];
    saveState();
    broadcastNotification('temple.state', getPublicState());
    return getPublicState();
  }
};

// ============================================================================
// 5. TIKTOK LIVE CONNECTOR & COMMENT PARSER
// ============================================================================
let tiktokConn = null;

const commentCooldownMap = new Map();

function parseViewerComment(commentText, user, uniqueId, avatar, source = 'manual') {
  const raw = String(commentText || '').trim();
  if (!raw || isBlockedSpamOrToxic(raw)) {
    return null;
  }

  const cleanWish = sanitizeWishText(raw);
  if (!cleanWish || cleanWish.length < 3) {
    return null;
  }

  // Chống 1 người spam bình luận liên tục làm nghẽn hàng đợi TTS (cooldown 3.5 giây/người)
  const userKey = uniqueId || user || '';
  const now = Date.now();
  if (userKey) {
    const lastTs = commentCooldownMap.get(userKey) || 0;
    if (now - lastTs < 3500) {
      return null;
    }
    commentCooldownMap.set(userKey, now);
    if (commentCooldownMap.size > 600) {
      const oldestKey = commentCooldownMap.keys().next().value;
      commentCooldownMap.delete(oldestKey);
    }
  }

  const cleanUser = sanitizeUserName(user);
  const lower = cleanWish.toLowerCase();

  // 1. Thẻ suy niệm
  if (
    lower.includes('suy niệm') || lower.includes('suy niem') ||
    lower.includes('suy niem') ||
    lower.includes('suy niệm') || lower.includes('suy niem') ||
    lower.includes('suy niem') ||
    lower.includes('suy niệm') ||
    lower.includes('suy niem') ||
    lower.includes('quẻ') ||
    lower.includes('que')
  ) {
    return Rituals.drawFortune({ user: cleanUser, uniqueId, avatar, topic: cleanWish, source });
  }

  // 2. Thỉnh chuông
  if (lower.includes('chuông') || lower.includes('chuong') || lower.includes('rung chuông')) {
    return Rituals.ringBell({ user: cleanUser, uniqueId, avatar, count: 1, wish: cleanWish, readTts: true, source });
  }

  // 3. Đọc kinh
  if (lower.includes('đọc kinh') || lower.includes('doc kinh') || lower.includes('go mo') || lower.includes('tụng kinh')) {
    return Rituals.strikeWoodenFish({ user: cleanUser, uniqueId, avatar, count: 3, source });
  }

  // 4. Thắp nến / Cầu nguyện
  if (
    lower.includes('thắp nến') || lower.includes('thap nen') ||
    lower.includes('thap huong') ||
    lower.includes('thắp nến') || lower.includes('thap nen') ||
    lower.includes('dang huong') ||
    lower.includes('cầu nguyện') ||
    lower.includes('cau nguyen') ||
    lower.includes('lạy chúa') ||
    lower.includes('cau nguyen')
  ) {
    return Rituals.burnIncense({ user: cleanUser, uniqueId, avatar, count: 3, wish: cleanWish, source });
  }

  // 5. Cầu nguyện / Gửi ý nguyện
  if (
    lower.includes('cầu') ||
    lower.includes('cau ') ||
    lower.includes('nguyện') ||
    lower.includes('nguyen') ||
    lower.includes('amen') || lower.includes('lạy chúa') || lower.includes('lay chua') ||
    lower.includes('nam mo') ||
    lower.includes('mô chúa') ||
    lower.includes('amen') ||
    lower.includes('lạy chúa') ||
    lower.includes('lay chua') ||
    lower.includes('bình an') ||
    lower.includes('tài lộc') ||
    lower.includes('chúc')
  ) {
    return Rituals.sendPrayer({ user: cleanUser, uniqueId, avatar, wish: cleanWish, source });
  }

  return Rituals.burnIncense({ user: cleanUser, uniqueId, avatar, count: 1, wish: cleanWish, source });
}

const giftComboTracker = new Map();

async function resolveTikTokTarget(rawInput) {
  let input = String(rawInput || '').trim();
  if (!input) {
    throw new Error('Vui lòng nhập @username hoặc link TikTok Live cần kết nối');
  }
  if (/^\d{8,}$/.test(input)) {
    return { username: null, roomId: input };
  }
  if (input.startsWith('http://') || input.startsWith('https://') || input.includes('tiktok.com/')) {
    const urlToFetch = input.startsWith('http') ? input : `https://${input}`;
    const extractRoomId = (url) => {
      try {
        const roomId = new URL(url).searchParams.get('room_id');
        return roomId && /^\d{8,}$/.test(roomId) ? roomId : null;
      } catch {
        return null;
      }
    };
    const directRoomId = extractRoomId(urlToFetch);
    if (directRoomId) return { username: null, roomId: directRoomId };

    const directMatch = urlToFetch.match(/tiktok\.com\/@([^/?#]+)/i);
    if (directMatch && directMatch[1]) {
      return { username: directMatch[1], roomId: null };
    }
    try {
      const resp = await fetch(urlToFetch, { redirect: 'follow' });
      const finalUrl = resp.url || '';
      const resolvedRoomId = extractRoomId(finalUrl);
      if (resolvedRoomId) return { username: null, roomId: resolvedRoomId };
      const resolvedMatch = finalUrl.match(/tiktok\.com\/@([^/?#]+)/i);
      if (resolvedMatch && resolvedMatch[1]) {
        return { username: resolvedMatch[1], roomId: null };
      }
    } catch (e) {
      console.warn('[TikTok URL Resolve Warning]', e.message);
    }
  }
  const username = input.replace(/^@/, '').split(/[/?#]/)[0].trim();
  if (!username) {
    throw new Error('Không tìm thấy @username hợp lệ từ dữ liệu nhập vào');
  }
  return { username, roomId: null };
}

function extractUserFromEvent(data) {
  const u = data?.user || data || {};
  const uniqueId = u.uniqueId || u.displayId || data?.uniqueId || '';
  const user = u.nickname || uniqueId || data?.nickname || 'Anh Chị Em';
  const avatar =
    u.profilePictureUrl ||
    u.avatarLarge?.urlList?.[0] ||
    u.avatarThumb?.urlList?.[0] ||
    u.avatarMedium?.urlList?.[0] ||
    data?.profilePictureUrl ||
    '';
  return { user, uniqueId, avatar };
}

async function connectTikTokLive(usernameOrUrl) {
  const { username: cleanUser, roomId } = await resolveTikTokTarget(usernameOrUrl);
  const connectionName = cleanUser || `room_id:${roomId}`;

  if (tiktokConn) {
    try {
      await tiktokConn.disconnect();
    } catch (_) {}
    tiktokConn = null;
  }

  state.tiktok = {
    connected: false,
    connecting: true,
    username: connectionName,
    roomId: null,
    viewerCount: 0,
    lastError: null
  };
  broadcastNotification('temple.state', getPublicState());

  const connection = new TikTokLiveConnection(cleanUser || connectionName, {
    processInitialData: true,
    fetchRoomInfoOnConnect: false,
    enableExtendedGiftInfo: false
  });
  tiktokConn = connection;

  connection.on(ControlEvent.CONNECTED, (roomState) => {
    state.tiktok.connected = true;
    state.tiktok.connecting = false;
    state.tiktok.roomId = roomState?.roomId || connection.roomId || null;
    state.tiktok.lastError = null;
    console.log(`[TikTok Live] Đã kết nối phòng ${connectionName} (roomId: ${state.tiktok.roomId})`);
    broadcastNotification('temple.state', getPublicState());
  });

  connection.on(ControlEvent.DISCONNECTED, () => {
    state.tiktok.connected = false;
    state.tiktok.connecting = false;
    console.log(`[TikTok Live] Đã ngắt kết nối ${connectionName}`);
    broadcastNotification('temple.state', getPublicState());
  });

  connection.on(ControlEvent.ERROR, (err) => {
    state.tiktok.lastError = err?.message || String(err);
    console.warn('[TikTok Live Warning]', state.tiktok.lastError);
    broadcastNotification('temple.state', getPublicState());
  });

  connection.on(WebcastEvent.ROOM_USER, (data) => {
    const rawViewerCount = data?.total ?? data?.viewerCount;
    const viewerCount = Number(rawViewerCount);
    if (Number.isFinite(viewerCount) && viewerCount >= 0) {
      state.tiktok.viewerCount = viewerCount;
      broadcastNotification('temple.viewerCount', { viewerCount });
    }
  });

  connection.on(WebcastEvent.MEMBER, (data) => {
    const { user, uniqueId, avatar } = extractUserFromEvent(data);
    recordDevotee(user, uniqueId, avatar, 1, 0, 0, 'Đã vào Cung Thánh cầu nguyện', 'live');
    broadcastNotification('temple.state', getPublicState());
  });

  connection.on(WebcastEvent.CHAT, (data) => {
    const { user, uniqueId, avatar } = extractUserFromEvent(data);
    const commentText = data?.content || data?.comment || '';
    console.log(`[TikTok Chat] ${user}: ${commentText}`);
    parseViewerComment(commentText, user, uniqueId, avatar, 'live');
  });

  connection.on(WebcastEvent.LIKE, (data) => {
    const { user, uniqueId, avatar } = extractUserFromEvent(data);
    const likeCount = Math.min(15, Math.max(1, Number(data?.count ?? data?.likeCount ?? 1)));
    Rituals.strikeWoodenFish({ user, uniqueId, avatar, count: likeCount, source: 'live' });
  });

  const handleSocialEvent = (data) => {
    const { user, uniqueId, avatar } = extractUserFromEvent(data);
    Rituals.ringBell({
      user,
      uniqueId,
      avatar,
      count: 1,
      wish: 'Hữu duyên tương ngộ nơi nhà nguyện, cầu bình an may mắn',
      readTts: false,
      source: 'live'
    });
  };
  connection.on(WebcastEvent.FOLLOW, handleSocialEvent);
  connection.on(WebcastEvent.SHARE, handleSocialEvent);
  connection.on(WebcastEvent.SOCIAL, (data) => {
    const action = String(data?.action || '');
    const disp = String(data?.common?.displayText?.displayType || data?.displayType || '').toLowerCase();
    if (action === '1' || action === '3' || disp.includes('follow') || disp.includes('share')) {
      handleSocialEvent(data);
    }
  });

  connection.on(WebcastEvent.GIFT, (data) => {
    const { user, uniqueId, avatar } = extractUserFromEvent(data);
    const giftObj = data?.gift || data?.giftDetails || {};
    const giftId = String(data?.giftId || giftObj?.id || 'rose');
    const groupId = String(data?.groupId || `${uniqueId}_${giftId}`);
    const repeatCount = Math.max(1, Number(data?.repeatCount || data?.comboCount || 1));

    const prevCount = giftComboTracker.get(groupId) || 0;
    if (repeatCount <= prevCount && data?.repeatEnd) {
      giftComboTracker.delete(groupId);
      return;
    }
    const deltaCount = Math.max(1, repeatCount - prevCount);
    giftComboTracker.set(groupId, repeatCount);
    if (giftComboTracker.size > 500) {
      const firstKey = giftComboTracker.keys().next().value;
      giftComboTracker.delete(firstKey);
    }

    const diamondCount = Math.max(1, Number(giftObj?.diamondCount || data?.diamondCount || 1));
    const totalCoins = diamondCount * deltaCount;
    const rawGiftName = giftObj?.name || data?.giftName || giftObj?.describe || 'Hoa Hồng Tâm Thành';
    const displayGiftName = deltaCount > 1 ? `${deltaCount}x ${rawGiftName}` : rawGiftName;

    console.log(`[TikTok Gift] ${user} gửi ${displayGiftName} (${totalCoins} xu)`);

    Rituals.offerGift({
      user,
      uniqueId,
      avatar,
      coins: totalCoins,
      giftName: displayGiftName,
      wish: `Thành tâm dâng ${displayGiftName} kính cầu nguyện Giêsu`,
      source: 'live'
    });
  });

  try {
    const roomState = await connection.connect(roomId || undefined);
    state.tiktok.connected = true;
    state.tiktok.connecting = false;
    state.tiktok.roomId = roomState?.roomId || connection.roomId || null;
    broadcastNotification('temple.state', getPublicState());
    return state.tiktok;
  } catch (err) {
    state.tiktok.connected = false;
    state.tiktok.connecting = false;
    const errorMessage = err?.message || 'Lỗi không xác định';
    state.tiktok.lastError = errorMessage.includes('Failed to retrieve Room ID')
      ? cleanUser
        ? `Không lấy được Room ID cho @${cleanUser}. Hãy kiểm tra username chính xác và tài khoản đang phát LIVE công khai; nếu vẫn lỗi, nhập Room ID trực tiếp. Chi tiết: ${errorMessage}`
        : `Không thể kết nối Room ID ${roomId}. Hãy kiểm tra ID và xác nhận phòng vẫn đang LIVE. Chi tiết: ${errorMessage}`
      : errorMessage;
    if (tiktokConn === connection) {
      try {
        connection.disconnect();
      } catch (_) {}
      tiktokConn = null;
    }
    broadcastNotification('temple.state', getPublicState());
    throw new Error(state.tiktok.lastError);
  }
}

function disconnectTikTokLive() {
  if (tiktokConn) {
    try {
      tiktokConn.disconnect();
    } catch (_) {}
    tiktokConn = null;
  }
  state.tiktok.connected = false;
  state.tiktok.connecting = false;
  state.tiktok.viewerCount = 0;
  broadcastNotification('temple.state', getPublicState());
  return state.tiktok;
}

// ============================================================================
// 6. AUTO-SIMULATION ENGINE (CHẾ ĐỘ TỰ ĐỘNG GIẢ LẬP ĐÔNG NGƯỜI XEM)
// ============================================================================
let autoSimTimer = null;

function runSingleSimulationStep() {
  const pick = SIM_DEVOTEES[Math.floor(Math.random() * SIM_DEVOTEES.length)];
  const roll = Math.random();
  if (roll < 0.30) {
    Rituals.burnIncense({ user: pick.user, uniqueId: pick.uniqueId, count: 3, wish: pick.wish, source: 'simulated' });
  } else if (roll < 0.55) {
    Rituals.sendPrayer({ user: pick.user, uniqueId: pick.uniqueId, wish: pick.wish, source: 'simulated' });
  } else if (roll < 0.75) {
    Rituals.drawFortune({ user: pick.user, uniqueId: pick.uniqueId, topic: pick.wish, source: 'simulated' });
  } else if (roll < 0.90) {
    Rituals.offerGift({ user: pick.user, uniqueId: pick.uniqueId, giftType: 'lotus', coins: 15, giftName: 'Hoa Huệ Trắng Tinh Khiết', source: 'simulated' });
  } else {
    Rituals.ringBell({ user: pick.user, uniqueId: pick.uniqueId, count: 1, wish: pick.wish, readTts: true, source: 'simulated' });
  }
}

function configureAutoSim(enabled) {
  state.settings.autoSim = Boolean(enabled);
  if (autoSimTimer) {
    clearInterval(autoSimTimer);
    autoSimTimer = null;
  }
  if (state.settings.autoSim) {
    runSingleSimulationStep();
    autoSimTimer = setInterval(runSingleSimulationStep, state.settings.autoSimIntervalMs || 9500);
  }
}

// ============================================================================
// 7. JSON-RPC 2.0 DISPATCHER
// ============================================================================
async function handleRpcCall(method, params = {}) {
  switch (method) {
    case 'temple.getState':
      return getPublicState();
    case 'temple.burnIncense':
      return Rituals.burnIncense({ ...params, source: 'manual' });
    case 'temple.strikeWoodenFish':
      return Rituals.strikeWoodenFish({ ...params, source: 'manual' });
    case 'temple.ringBell':
      return Rituals.ringBell({ ...params, source: 'manual' });
    case 'temple.sendPrayer':
      return Rituals.sendPrayer({ ...params, source: 'manual' });
    case 'temple.offerGift':
      return Rituals.offerGift({ ...params, source: 'manual' });
    case 'temple.drawFortune':
      return Rituals.drawFortune({ ...params, source: 'manual' });
    case 'temple.grandCeremony':
      return Rituals.grandCeremony({ ...params, source: 'manual' });
    case 'temple.updateSettings':
      return Rituals.updateSettings(params);
    case 'temple.resetMerit':
      return Rituals.resetMerit();
    case 'temple.comment':
      return parseViewerComment(params.comment, params.user, params.uniqueId, params.avatar);
    case 'temple.speak': {
      const text = String(params.text || '').trim();
      if (!text) throw new Error('Thiếu nội dung text cần đọc');
      if (params.broadcast !== false) {
        broadcastNotification('tts.play', {
          text,
          voice: 'vi-VN'
        });
      }
      return { ok: true, engine: 'Web Speech API (browser)', voice: 'vi-VN' };
    }
    case 'temple.ttsStatus':
      return {
        ready: null,
        status: 'client-side',
        engine: 'Web Speech API (browser)',
        voice: 'vi-VN',
        voices: []
      };
    case 'live.connect':
      return await connectTikTokLive(params.username);
    case 'live.disconnect':
      return disconnectTikTokLive();
    case 'live.setAutoSim':
      configureAutoSim(Boolean(params.enabled));
      saveState();
      broadcastNotification('temple.state', getPublicState());
      return getPublicState();
    default:
      throw new Error(`Không tìm thấy phương thức JSON-RPC: ${method}`);
  }
}

// ============================================================================
// 8. EXPRESS + WEBSOCKET SERVER
// ============================================================================
const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/admin', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// HTTP JSON-RPC 2.0 Endpoint
app.post('/rpc', async (req, res) => {
  const { jsonrpc, id, method, params } = req.body || {};
  if (!method) {
    return res.status(400).json({
      jsonrpc: '2.0',
      id: id ?? null,
      error: { code: -32600, message: 'Invalid JSON-RPC Request: thiếu method' }
    });
  }
  try {
    const result = await handleRpcCall(method, params || {});
    res.json({
      jsonrpc: jsonrpc || '2.0',
      id: id ?? null,
      result
    });
  } catch (err) {
    res.status(200).json({
      jsonrpc: jsonrpc || '2.0',
      id: id ?? null,
      error: { code: -32000, message: err.message || 'Server error' }
    });
  }
});

app.get('/api/state', (_req, res) => {
  res.json(getPublicState());
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

function broadcastNotification(method, params) {
  const payload = JSON.stringify({
    jsonrpc: '2.0',
    method,
    params
  });
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(payload);
    }
  }
}

wss.on('connection', (ws) => {
  ws.send(
    JSON.stringify({
      jsonrpc: '2.0',
      method: 'temple.state',
      params: getPublicState()
    })
  );

  ws.on('message', async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString('utf8'));
    } catch (_) {
      return;
    }
    if (!msg || !msg.method) return;
    try {
      const result = await handleRpcCall(msg.method, msg.params || {});
      if (msg.id !== undefined) {
        ws.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: msg.id,
            result
          })
        );
      }
    } catch (err) {
      if (msg.id !== undefined) {
        ws.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: msg.id,
            error: { code: -32000, message: err.message || 'RPC Error' }
          })
        );
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`============================================================`);
  console.log(`💐 NHÀ NGUYỆN ONLINE TIKTOK LIVE RPC ĐÃ KHỞI ĐỘNG`);
  console.log(`📺 Màn hình Live (9:16 OBS): http://localhost:${PORT}`);
  console.log(`🎛️ Bảng điều khiển RPC Admin: http://localhost:${PORT}/admin`);
  console.log(`🔌 JSON-RPC 2.0 Endpoint   : http://localhost:${PORT}/rpc (ws://localhost:${PORT}/ws)`);
  console.log(`============================================================`);

  // Chỉ tự động kết nối khi người vận hành đặt TIKTOK_USER.
  const defaultChannel = process.env.TIKTOK_USER || '';
  if (defaultChannel) {
    connectTikTokLive(defaultChannel).catch((err) => {
      console.warn(`[Auto-Connect @${defaultChannel}] Chưa kết nối được ngay:`, err.message);
    });
  }
});
