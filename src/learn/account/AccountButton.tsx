import { t } from '../../lib/i18n';
import { UserRound } from 'lucide-react';
import { useAccount } from './AccountProvider';

/** In the book's navigation: «Войти» for a guest, the way to the cabinet for an account. Hidden when the server has no accounts. */
export function AccountButton() {
  const account = useAccount();
  if (account.status === 'off') return null;
  const label =
    account.status === 'user' && account.user
      ? t('Кабинет: {name}', { name: account.user.displayName })
      : t('Войти в аккаунт');
  return (
    <button
      type="button"
      className="acct-nav-dot"
      data-state={account.status}
      aria-label={label}
      title={label}
      disabled={account.status === 'loading'}
      onClick={() => {
        if (account.user)
          location.href = account.user.role === 'teacher' ? '/learn/teacher' : '/learn/cabinet';
        else account.openAuth();
      }}
    >
      <UserRound size={18} />
    </button>
  );
}
