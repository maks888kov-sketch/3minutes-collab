/* b44-full-sync 2026-06-01 */
const EDITOR_URL = 'https://app.base44.com/apps/6a1356896fdf56fa48755d68/editor';
const HOSTED_URL = 'https://awesome-three-minute-spark.base44.app';

export default function AppPublishRequired({ compact = false }) {
  const steps = [
    <>Откройте <a href={EDITOR_URL} className="text-primary hover:underline" target="_blank" rel="noreferrer">редактор проекта на Base44</a> и войдите в аккаунт</>,
    'Справа вверху нажмите Publish → Publish app',
    'Дождитесь сообщения об успешной публикации',
    'Слева: Dashboard → Overview → App visibility → Public (Login required)',
    'Вернитесь сюда, обновите страницу (Ctrl+F5) и нажмите Сохранить снова',
  ];

  if (compact) {
    return (
      <div className="mt-3 text-xs text-muted-foreground space-y-1 leading-relaxed">
        <p className="font-medium text-foreground/90">Что сделать:</p>
        {steps.map((step, i) => (
          <p key={i}>{i + 1}. {step}</p>
        ))}
        <p className="pt-1">
          <a href={EDITOR_URL} className="text-primary hover:underline" target="_blank" rel="noreferrer">
            Открыть Base44 →
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-5 border border-amber-500/30 bg-amber-500/10">
      <h3 className="font-semibold text-amber-200 mb-2">Нужно опубликовать приложение на Base44</h3>
      <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
        Вход работает, но сохранение профиля и фото блокирует сервер Base44, пока проект не опубликован.
      </p>
      <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
        {steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-3 mt-4">
        <a
          href={EDITOR_URL}
          className="text-sm text-primary hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          Открыть редактор Base44
        </a>
        <a
          href={HOSTED_URL}
          className="text-sm text-primary hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          Опубликованная версия
        </a>
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        Это ограничение платформы Base44, не баг формы. Пока проект не опубликован, сервер не принимает сохранение профиля и фото.
      </p>
    </div>
  );
}
