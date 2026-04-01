import type { Socket } from 'socket.io-client';

type UploadTarget =
  | { type: 'room'; roomId: string }
  | { type: 'dm'; receiverId: string }
  | { type: 'group'; groupId: number };

interface UploadStartResponse {
  ok?: boolean;
  error?: string;
}

interface UploadFinishResponse<TMessage> {
  ok?: boolean;
  error?: string;
  message?: TMessage;
}

interface Options<TMessage> {
  socket: Socket;
  file: File;
  caption?: string;
  target: UploadTarget;
  onProgress?: (percent: number) => void;
}

const CHUNK_SIZE = 256 * 1024;

export async function uploadSocketMedia<TMessage>({
  socket,
  file,
  caption = '',
  target,
  onProgress,
}: Options<TMessage>): Promise<TMessage | undefined> {
  const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const totalChunks = Math.max(1, Math.ceil(bytes.length / CHUNK_SIZE));

  onProgress?.(0);

  await new Promise<void>((resolve, reject) => {
    socket.emit(
      'chat:media-upload:start',
      {
        uploadId,
        target,
        fileName: file.name,
        mimeType: file.type,
        caption,
        totalChunks,
        totalSize: bytes.length,
      },
      (response?: UploadStartResponse) => {
        if (response?.ok) {
          resolve();
          return;
        }
        reject(new Error(response?.error || 'Не удалось начать загрузку медиа'));
      },
    );
  });

  for (let index = 0; index < totalChunks; index += 1) {
    const start = index * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, bytes.length);
    const chunk = bytes.slice(start, end);

    await new Promise<void>((resolve, reject) => {
      socket.emit(
        'chat:media-upload:chunk',
        { uploadId, index, chunk },
        (response?: UploadStartResponse) => {
          if (response?.ok) {
            resolve();
            return;
          }
          reject(new Error(response?.error || 'Ошибка при передаче части файла'));
        },
      );
    });

    const percent = Math.min(99, Math.round(((index + 1) / totalChunks) * 100));
    onProgress?.(percent);
  }

  const finish = await new Promise<UploadFinishResponse<TMessage>>((resolve, reject) => {
    socket.emit('chat:media-upload:finish', { uploadId }, (response?: UploadFinishResponse<TMessage>) => {
      if (response?.ok) {
        resolve(response);
        return;
      }
      reject(new Error(response?.error || 'Не удалось завершить загрузку медиа'));
    });
  });

  onProgress?.(100);
  return finish.message;
}
