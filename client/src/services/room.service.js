import { request } from './api.js';

export function listRooms() {
  return request({ url: '/rooms', method: 'GET' });
}

export function createRoom({ name }) {
  return request({ url: '/rooms', method: 'POST', data: { name } });
}

export function joinRoom({ code }) {
  return request({ url: '/rooms/join', method: 'POST', data: { code } });
}

export function getRoom(roomId) {
  return request({ url: `/rooms/${roomId}`, method: 'GET' });
}

export function renameRoom(roomId, { name }) {
  return request({ url: `/rooms/${roomId}`, method: 'PATCH', data: { name } });
}

export function regenerateCode(roomId) {
  return request({ url: `/rooms/${roomId}/code`, method: 'POST' });
}

export function removeMember(roomId, memberId) {
  return request({ url: `/rooms/${roomId}/members/${memberId}`, method: 'DELETE' });
}

export function updateMember(roomId, memberId, updates) {
  return request({ url: `/rooms/${roomId}/members/${memberId}`, method: 'PATCH', data: updates });
}

export function leaveRoom(roomId) {
  return request({ url: `/rooms/${roomId}/leave`, method: 'POST' });
}

export function archiveRoom(roomId) {
  return request({ url: `/rooms/${roomId}/archive`, method: 'PATCH' });
}
