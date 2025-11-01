import { cn } from '@/shared/lib/utils';

type LoaderProps = {
  className?: string;
};

export const Loader = ({ className }: LoaderProps) => {
  return (
    <div className={cn('animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600', className)} />
  );
};
