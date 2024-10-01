export function DocTitle({ title }: { title: string }) {
  // https://react.dev/reference/react-dom/components/title#use-variables-in-the-title
  return <title>{title.length > 0 ? `${title} | Ikuyo!` : 'Ikuyo!'}</title>;
}
