import clsx from 'clsx';
import style from './Activity.module.css';

export function Activity({
  title,
  className,
}: {
  title: string;
  className?: string;
}) {
  return (
    <div className={clsx(style.activity, className)}>Activity: {title}</div>
  );
}
