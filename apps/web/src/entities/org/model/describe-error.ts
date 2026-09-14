import { ApiError } from '@/shared/api/http';

import { OrgTreeError } from './build-org-tree';

export interface ErrorDescription {
  title: string;
  description?: string;
  details?: string;
}

/** Переводит техническую ошибку в текст для пользователя. */
export function describeError(error: unknown): ErrorDescription {
  if (error instanceof ApiError) {
    switch (error.kind) {
      case 'network':
        return {
          title: 'Сервер недоступен',
          description: 'Проверьте, что mock API запущен, и повторите попытку.',
        };
      case 'http':
        return {
          title: `Сервер вернул ошибку ${error.status ?? ''}`.trim(),
          description: 'Попробуйте повторить запрос через несколько секунд.',
          details: error.details,
        };
      case 'invalid-response':
        return {
          title: 'Некорректный ответ сервера',
          description: 'Данные не прошли проверку схемы API, поэтому не показаны.',
          details: error.details,
        };
      case 'aborted':
        return { title: 'Запрос был отменён' };
    }
  }
  if (error instanceof OrgTreeError) {
    return {
      title: 'Некорректная структура данных',
      description: error.message,
    };
  }
  return {
    title: 'Что-то пошло не так',
    details: error instanceof Error ? error.message : String(error),
  };
}
