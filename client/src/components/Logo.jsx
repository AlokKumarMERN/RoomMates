import { Link } from 'react-router-dom';

const SIZES = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-4xl sm:text-5xl',
};

export default function Logo({ size = 'md', as = 'link', to = '/' }) {
  const content = (
    <span className={`font-semibold tracking-tight text-slate-900 ${SIZES[size]}`}>
      Room<span className="text-brand-500">Mates</span>
    </span>
  );

  if (as === 'link') {
    return (
      <Link to={to} className="rounded-sm">
        {content}
      </Link>
    );
  }

  return content;
}
