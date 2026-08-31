import Link from "next/link";
import { IconImage } from "./icons";
import MediaImage from "./MediaImage";

type ItemCardProps = {
  href: string;
  title: string;
  subtitle?: string;
  meta?: string;
  imageSrc?: string | null;
};

export default function ItemCard({ href, title, subtitle, meta, imageSrc }: ItemCardProps) {
  return (
    <Link href={href} className="portal-item">
      <span className="portal-thumb">
        {imageSrc ? (
          <MediaImage src={imageSrc} alt="" fallback={<IconImage size={22} />} />
        ) : (
          <IconImage size={22} />
        )}
      </span>
      <span>
        <b>{title}</b>
        {subtitle ? <small>{subtitle}</small> : null}
        {meta ? <small>{meta}</small> : null}
      </span>
    </Link>
  );
}
