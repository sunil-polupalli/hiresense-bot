const STATES = {
  IDLE: "IDLE",
  AWAITING_JD: "AWAITING_JD",
  AWAITING_RESUME: "AWAITING_RESUME",
  READY: "READY",
};

const sessions = new Map();

function getSession(chatId) {
  if (!sessions.has(chatId)) {
    sessions.set(chatId, {
      state: STATES.IDLE,
      jdText: null,
      resumeText: null,
      updatedAt: Date.now(),
    });
  }
  return sessions.get(chatId);
}

function resetSession(chatId) {
  sessions.set(chatId, {
    state: STATES.IDLE,
    jdText: null,
    resumeText: null,
    updatedAt: Date.now(),
  });
}

function setState(chatId, state) {
  const session = getSession(chatId);
  session.state = state;
  session.updatedAt = Date.now();
}

function setJD(chatId, text) {
  const session = getSession(chatId);
  session.jdText = text;
  session.updatedAt = Date.now();
}

function setResume(chatId, text) {
  const session = getSession(chatId);
  session.resumeText = text;
  session.updatedAt = Date.now();
}

module.exports = {
  STATES,
  getSession,
  resetSession,
  setState,
  setJD,
  setResume,
};
